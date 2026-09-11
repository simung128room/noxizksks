import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { streamModelSoup, streamSingleModel } from './server/modelSoup';

dotenv.config();

const app = express();
const PORT = 3000;

// Security and stability middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ limit: '30mb', extended: true }));

// Global error handler for uncaught exceptions in middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Error:', err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({ error: 'Internal server error', details: err?.message });
});

// Lazy GoogleGenAI client initialization
let genAiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the environment.');
  }
  if (!genAiClient) {
    genAiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAiClient;
}

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    model: 'gemini-3.8-flash',
  });
});

// Helper to format messages with real image attachment support
function formatGeminiContents(
  messages: Array<{
    role: string;
    content: string;
    attachment?: { mimeType: string; base64: string };
  }>
) {
  return messages.map((m) => {
    const parts: any[] = [];
    if (m.attachment && m.attachment.base64 && m.attachment.mimeType) {
      let cleanBase64 = String(m.attachment.base64 || '');
      if (cleanBase64.includes(';base64,')) {
        cleanBase64 = cleanBase64.split(';base64,')[1] || cleanBase64;
      } else if (cleanBase64.includes(',')) {
        cleanBase64 = cleanBase64.split(',')[1] || cleanBase64;
      }
      const trimmedBase64 = cleanBase64.trim();
      if (trimmedBase64) {
        parts.push({
          inlineData: {
            mimeType: m.attachment.mimeType,
            data: trimmedBase64,
          },
        });
      }
    }
    const safeContent = typeof m.content === 'string' ? m.content.trim() : '';
    if (safeContent) {
      parts.push({ text: safeContent });
    } else if (parts.length === 1 && parts[0].inlineData) {
      // Default prompt if user only sent an image
      parts.push({ text: 'ช่วยวิเคราะห์และอธิบายรูปภาพนี้โดยละเอียด' });
    } else if (parts.length === 0) {
      parts.push({ text: '' });
    }
    return {
      role: m.role === 'assistant' ? 'model' : 'user',
      parts,
    };
  });
}

// Chat endpoint with Server-Sent Events (SSE) streaming
app.post('/api/chat/stream', async (req, res) => {
  const { messages, systemInstruction, mode, selectedModel } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'Messages array is required' });
    return;
  }

  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  const runGeminiFallback = async () => {
    let ai: GoogleGenAI;
    try {
      ai = getGenAI();
    } catch (err: any) {
      res.write(
        `data: ${JSON.stringify({
          text: 'ขออภัย ไม่สามารถเชื่อมต่อกับบริการ AI ได้ในขณะนี้ กรุณาตรวจสอบการตั้งค่า API Key',
        })}\n\n`
      );
      return;
    }

    const formattedContents = formatGeminiContents(messages);
    const defaultSystemInstruction =
      systemInstruction ||
      `You are NOXIZ, an ultra-intelligent AI assistant with deep analytical, code auditing, and reasoning capabilities.
Guiding principles:
1. Simplicity & Clarity: Deliver direct, well-structured, and accurate answers without conversational fluff.
2. Formatting: Use clean Markdown formatting, inline code, or code blocks where appropriate.
3. Language: Respond fluently and naturally in Thai (or English).`;

    try {
      let streamResponse: any;
      try {
        streamResponse = await ai.models.generateContentStream({
          model: 'gemini-3.8-flash',
          contents: formattedContents,
          config: { systemInstruction: defaultSystemInstruction },
        });
      } catch (primaryErr: any) {
        console.warn('Gemini 3.8 failed, fallback to 3.1:', primaryErr?.message);
        streamResponse = await ai.models.generateContentStream({
          model: 'gemini-3.1-flash-lite',
          contents: formattedContents,
          config: { systemInstruction: defaultSystemInstruction },
        });
      }

      for await (const chunk of streamResponse) {
        const text = chunk.text;
        if (text) {
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      }
    } catch (gErr: any) {
      console.error('Gemini fallback stream error:', gErr);
      res.write(
        `data: ${JSON.stringify({
          error: gErr?.message || 'Error occurred during generation',
        })}\n\n`
      );
    }
  };

  try {
    const hasAttachments = messages.some(
      (m: any) => m.attachment && m.attachment.base64
    );

    // If multimodal (has image attachment), use Gemini directly
    if (hasAttachments || selectedModel === 'kirin-flash') {
      await runGeminiFallback();
    } else if (selectedModel === 'kirin-think') {
      await streamSingleModel({
        modelId: 'deepseek-v4-pro', // use deepseek-v4-pro for 'think'
        messages,
        systemInstruction,
        onChunk: (chunk) => {
          if (chunk.text) {
            res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
          }
        },
        geminiFallback: runGeminiFallback,
      });
    } else {
      // Default / kirin-ultra -> Run Model Soup across all 8 models (xkiro + unorouter pool)
      await streamModelSoup({
        messages,
        systemInstruction,
        onChunk: (chunk) => {
          if (chunk.text) {
            res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
          }
        },
        geminiFallback: runGeminiFallback,
      });
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    console.error('Stream Server Error:', error);
    const errorMessage = error?.message || 'Error occurred while generating response.';
    res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
    res.end();
  }
});

// Non-streaming fallback endpoint
app.post('/api/chat', async (req, res) => {
  const { messages, systemInstruction } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'Messages array is required' });
    return;
  }

  try {
    const ai = getGenAI();
    const formattedContents = formatGeminiContents(messages);

    const instruction =
      systemInstruction ||
      'You are NOXIZ, a minimalist, direct, and intelligent AI assistant. Provide clear, concise, and structured answers in Thai or the language of the prompt.';

    let response: any;
    try {
      response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: formattedContents,
        config: { systemInstruction: instruction },
      });
    } catch (primaryErr: any) {
      console.warn(
        'Primary model unavailable in /api/chat, falling back to gemini-3.1-flash-lite:',
        primaryErr?.message
      );
      response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: formattedContents,
        config: { systemInstruction: instruction },
      });
    }

    res.json({ text: response.text || '' });
  } catch (error: any) {
    console.error('Gemini Error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`xAi server running on http://0.0.0.0:${PORT}`);
  });
}

process.on('uncaughtException', (err) => {
  console.error('CRITICAL: Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

startServer();
