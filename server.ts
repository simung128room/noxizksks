import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { streamModelSoup, streamSingleModel, getUnoRouterClient } from './server/modelSoup';

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

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(process.env.UNOROUTER_API_KEY || process.env.XKIRO_API_KEY),
    model: 'gpt-4o-mini',
  });
});

// Helper to format messages with real image attachment support for OpenAI format
function formatVisionContents(
  messages: Array<{
    role: string;
    content: string;
    attachment?: { mimeType: string; base64: string };
  }>
) {
  return messages.map((m) => {
    const role = m.role === 'assistant' ? 'assistant' : 'user';
    const content: any[] = [];

    const safeContent = typeof m.content === 'string' ? m.content.trim() : '';
    if (safeContent) {
      content.push({ type: 'text', text: safeContent });
    }

    if (m.attachment && m.attachment.base64 && m.attachment.mimeType) {
      let cleanBase64 = String(m.attachment.base64 || '');
      if (cleanBase64.includes(';base64,')) {
        cleanBase64 = cleanBase64.split(';base64,')[1] || cleanBase64;
      } else if (cleanBase64.includes(',')) {
        cleanBase64 = cleanBase64.split(',')[1] || cleanBase64;
      }
      const trimmedBase64 = cleanBase64.trim();
      if (trimmedBase64) {
        content.push({
          type: 'image_url',
          image_url: {
            url: `data:${m.attachment.mimeType};base64,${trimmedBase64}`,
          },
        });
      }
    }

    if (content.length === 1 && content[0].type === 'image_url') {
      content.push({ type: 'text', text: 'ช่วยวิเคราะห์และอธิบายรูปภาพนี้โดยละเอียด' });
    } else if (content.length === 0) {
      content.push({ type: 'text', text: '' });
    }

    return { role, content };
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

  const runVisionFallback = async () => {
    try {
      const client = getUnoRouterClient();
      const formattedContents = formatVisionContents(messages);
      const defaultSystemInstruction =
        systemInstruction ||
        `You are NOXIZ, an ultra-intelligent AI assistant with deep analytical, code auditing, and reasoning capabilities.
Guiding principles:
1. Simplicity & Clarity: Deliver direct, well-structured, and accurate answers without conversational fluff.
2. Formatting: Use clean Markdown formatting, inline code, or code blocks where appropriate.
3. Language: Respond fluently and naturally in Thai (or English).`;
      
      // Inject system message
      formattedContents.unshift({ role: 'system', content: [{ type: 'text', text: defaultSystemInstruction }] });

      let streamResponse: any;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);
      try {
        streamResponse = await client.chat.completions.create(
          {
            model: 'openai/gpt-4o-mini',
            messages: formattedContents as any,
            stream: true,
          },
          { signal: controller.signal }
        );
      } catch (primaryErr: any) {
        clearTimeout(timeoutId);
        console.warn('GPT-4o-mini failed, fallback to Claude 3.5 Sonnet:', primaryErr?.message);
        streamResponse = await client.chat.completions.create({
          model: 'anthropic/claude-3.5-sonnet',
          messages: formattedContents as any,
          stream: true,
        });
      }

      for await (const chunk of streamResponse) {
        clearTimeout(timeoutId);
        const text = chunk.choices?.[0]?.delta?.content;
        if (text) {
          res.write(`data: ${JSON.stringify({ text })}\n\n`);
        }
      }
      clearTimeout(timeoutId);
    } catch (err: any) {
      console.error('Vision fallback stream error:', err);
      res.write(
        `data: ${JSON.stringify({
          error: err?.message || 'Error occurred during generation',
        })}\n\n`
      );
    }
  };

  try {
    const hasAttachments = messages.some(
      (m: any) => m.attachment && m.attachment.base64
    );

    // If multimodal (has image attachment) or standard fast model, use GPT-4o-mini directly
    if (hasAttachments || selectedModel === 'kirin-flash') {
      await runVisionFallback();
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
        geminiFallback: runVisionFallback,
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
        geminiFallback: runVisionFallback,
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
    const client = getUnoRouterClient();
    const formattedContents = formatVisionContents(messages);

    const instruction =
      systemInstruction ||
      'You are NOXIZ, a minimalist, direct, and intelligent AI assistant. Provide clear, concise, and structured answers in Thai or the language of the prompt.';

    formattedContents.unshift({ role: 'system', content: [{ type: 'text', text: instruction }] });

    let response: any;
    try {
      response = await client.chat.completions.create({
        model: 'openai/gpt-4o-mini',
        messages: formattedContents as any,
      });
    } catch (primaryErr: any) {
      console.warn(
        'Primary model unavailable in /api/chat, falling back to claude 3.5 sonnet:',
        primaryErr?.message
      );
      response = await client.chat.completions.create({
        model: 'anthropic/claude-3.5-sonnet',
        messages: formattedContents as any,
      });
    }

    res.json({ text: response.choices?.[0]?.message?.content || '' });
  } catch (error: any) {
    console.error('Vision Error:', error);
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
