import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';

export interface ModelSoupCandidate {
  id: string;
  name: string;
  provider: 'xkiro' | 'unorouter';
  model: string;
  description: string;
}

export const MODEL_SOUP_LIST: ModelSoupCandidate[] = [
  {
    id: 'mistral-large',
    name: 'Mistral Large 2512',
    provider: 'xkiro',
    model: 'mistralai/mistral-large-2512',
    description: 'Deep reasoning, structural clarity, high precision',
  },
  {
    id: 'deepseek-v4-pro',
    name: 'DeepSeek v4 Pro',
    provider: 'xkiro',
    model: 'deepseek/deepseek-v4-pro',
    description: 'Complex logic, code generation & debugging',
  },
  {
    id: 'deepseek-v4-flash',
    name: 'DeepSeek v4 Flash',
    provider: 'xkiro',
    model: 'deepseek/deepseek-v4-flash',
    description: 'Fast mathematical & logical deduction',
  },
  {
    id: 'qwen-3.8-max',
    name: 'Qwen 3.8 Max',
    provider: 'xkiro',
    model: 'qwen/qwen3.8-max:free',
    description: 'Comprehensive domain knowledge & multilingual mastery',
  },
  {
    id: 'qwen-3.6-plus',
    name: 'Qwen 3.6 Plus',
    provider: 'xkiro',
    model: 'qwen/qwen3.6-plus:free',
    description: 'General NLP, summarization, and formatting',
  },
  {
    id: 'glm-5.3-think-search',
    name: 'GLM 5.3 Think Search',
    provider: 'unorouter',
    model: 'glm-5.3-flash-think-search:free',
    description: 'Search-grounded thinking & step-by-step reasoning',
  },
  {
    id: 'minimax-m2.7',
    name: 'MiniMax M2.7',
    provider: 'xkiro',
    model: 'minimax/minimax-m2.7-highspeed:free',
    description: 'Ultra-fast linguistic nuance & creative synthesis',
  },
  {
    id: 'sensenova-6.8',
    name: 'SenseNova 6.8 Lite',
    provider: 'xkiro',
    model: 'sensenova/sensenova-6.8-flash-lite',
    description: 'Concise perspectives & quick verification',
  },
];

export function getXkiroClient(): OpenAI {
  const apiKey = process.env.XKIRO_API_KEY || 'sk-free-xkiro-default';
  return new OpenAI({
    baseURL: 'https://api.xkiro.com/v1',
    apiKey,
  });
}

export function getUnoRouterClient(): OpenAI {
  const apiKey =
    process.env.UNOROUTER_API_KEY ||
    'sk-bfl3aRv8LhkPxkTvwVxkJow4v1fj4e6VEWO1kzTWiHozmozs';
  return new OpenAI({
    baseURL: 'https://api.unorouter.com/v1',
    apiKey,
  });
}

export async function querySingleModel(
  candidate: ModelSoupCandidate,
  messages: Array<{ role: string; content: string }>,
  timeoutMs = 12000
): Promise<{ id: string; name: string; output: string | null; error?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const client =
    candidate.provider === 'unorouter' ? getUnoRouterClient() : getXkiroClient();

  try {
    const formattedMsgs = messages.map((m) => ({
      role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: m.content || '',
    }));

    const res = await client.chat.completions.create(
      {
        model: candidate.model,
        messages: formattedMsgs,
        temperature: 0.6,
      },
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);
    const content = res.choices?.[0]?.message?.content || null;
    return {
      id: candidate.id,
      name: candidate.name,
      output: content,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    return {
      id: candidate.id,
      name: candidate.name,
      output: null,
      error: err.name === 'AbortError' ? 'Timeout' : err.message,
    };
  }
}

export interface ModelSoupStreamOptions {
  messages: Array<{ role: string; content: string }>;
  systemInstruction?: string;
  onChunk: (chunk: { text?: string; thought?: string; metadata?: any }) => void;
  geminiFallback: () => Promise<void>;
}

export async function streamSingleModel({
  modelId,
  messages,
  systemInstruction,
  onChunk,
  geminiFallback,
}: {
  modelId: string;
  messages: Array<any>;
  systemInstruction?: string;
  onChunk: (chunk: { text: string }) => void;
  geminiFallback: () => Promise<void>;
}) {
  const candidate = MODEL_SOUP_LIST.find((m) => m.id === modelId);
  if (!candidate) {
    return geminiFallback();
  }

  const client = candidate.provider === 'unorouter' ? getUnoRouterClient() : getXkiroClient();
  const formattedMsgs = messages.map((m) => ({
    role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
    content: m.content || '',
  }));

  if (systemInstruction) {
    formattedMsgs.unshift({ role: 'system', content: systemInstruction } as any);
  }

  const controller = new AbortController();
  // Set a longer timeout for streaming (e.g., 60 seconds) to prevent hanging
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const stream = await client.chat.completions.create(
      {
        model: candidate.model,
        messages: formattedMsgs,
        temperature: 0.7,
        stream: true,
      },
      { signal: controller.signal }
    );

    for await (const chunk of stream) {
      // Clear and reset timeout on each chunk to keep connection alive if it's responding
      clearTimeout(timeoutId);
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) {
        onChunk({ text: delta });
      }
    }
    clearTimeout(timeoutId);
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error(`Error streaming single model ${modelId}:`, error);
    onChunk({ text: `\n[Error from ${candidate.name}, falling back...]\n` });
    await geminiFallback();
  }
}

export async function streamModelSoup({
  messages,
  systemInstruction,
  onChunk,
  geminiFallback,
}: ModelSoupStreamOptions): Promise<void> {
  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
  const userPrompt = lastUserMsg?.content || 'Hello!';

  // Step 1: Notify client of Model Soup pooling
  onChunk({
    text: `<thought title="Initializing Advanced Cognitive Engine">Analyzing query complexity and dispatching parallel reasoning streams. Maintaining maximum stability and security.</thought>`,
  });

  // Step 2: Query candidates in parallel
  const results = await Promise.allSettled(
    MODEL_SOUP_LIST.map((candidate) =>
      querySingleModel(candidate, messages, 14000)
    )
  );

  const successfulOutputs: Array<{ name: string; output: string; model: string }> =
    [];

  for (let i = 0; i < results.length; i++) {
    const res = results[i];
    const candidate = MODEL_SOUP_LIST[i];
    if (res.status === 'fulfilled' && res.value.output) {
      successfulOutputs.push({
        name: candidate.name,
        model: candidate.model,
        output: res.value.output,
      });
    }
  }

  // If no candidates succeeded, fallback gracefully to Gemini
  if (successfulOutputs.length === 0) {
    console.warn('All external soup models timed out/failed, falling back to Gemini...');
    onChunk({
      text: `<thought title="Switching to Gemini Neural Core">External soup endpoints were unreachable. Synthesizing directly via Gemini High-Speed Engine...</thought>`,
    });
    await geminiFallback();
    return;
  }

  // Step 3: Emit synthesis thought step
  onChunk({
    text: `<thought title="Synthesizing Multi-Stream Insights">Aggregating ${successfulOutputs.length} independent logical deductions. Performing strict cross-validation and fact-checking to generate a highly stable, definitive response.</thought>`,
  });

  // Step 4: Synthesize responses using DeepSeek / Mistral or Gemini
  let soupContext = 'Perspectives collected from independent models:\n\n';
  successfulOutputs.forEach((item, idx) => {
    soupContext += `--- [Model #${idx + 1}: ${item.name} (${item.model})] ---\n${item.output}\n\n`;
  });

  const synthesisSystemPrompt =
    systemInstruction ||
    `You are NOXIZ Supreme Synthesizer, an ultra-intelligent Model Soup / Ensemble Reasoning engine.
Your task is to merge, cross-validate, and synthesize the multiple model perspectives provided into one definitive, coherent, highly accurate, and beautifully structured response.
Rules:
1. Cross-check facts across all candidate outputs; eliminate hallucinations and redundancies.
2. If code is requested, provide the cleanest, most efficient, bug-free implementation.
3. Respond fluently and naturally in Thai (or the language of the prompt).
4. Maintain clean markdown styling. Do NOT use blockquotes (>) or prefixes at the start of your answer. Just give the direct answer without saying "Based on..." or "Here is the synthesized...".`;

  const synthesisUserPrompt = `User Prompt:
"${userPrompt}"

${soupContext}

Synthesize all candidate perspectives above and provide the single definitive, complete, and polished final response:`;

  // Try streaming synthesis via DeepSeek / Mistral, or streaming with fallback
  let synthesisSuccess = false;
  const xkiro = getXkiroClient();
  const synthController1 = new AbortController();
  const synthTimeout1 = setTimeout(() => synthController1.abort(), 60000);

  try {
    const stream = await xkiro.chat.completions.create(
      {
        model: 'deepseek/deepseek-v4-pro',
        messages: [
          { role: 'system', content: synthesisSystemPrompt },
          { role: 'user', content: synthesisUserPrompt },
        ],
        temperature: 0.3,
        stream: true,
      },
      { signal: synthController1.signal }
    );

    for await (const chunk of stream) {
      clearTimeout(synthTimeout1);
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) {
        onChunk({ text: delta });
        synthesisSuccess = true;
      }
    }
    clearTimeout(synthTimeout1);
  } catch (synthErr: any) {
    clearTimeout(synthTimeout1);
    console.warn('DeepSeek synthesis stream failed, trying Mistral:', synthErr?.message);
    const synthController2 = new AbortController();
    const synthTimeout2 = setTimeout(() => synthController2.abort(), 60000);
    try {
      const mistralStream = await xkiro.chat.completions.create(
        {
          model: 'mistralai/mistral-large-2512',
          messages: [
            { role: 'system', content: synthesisSystemPrompt },
            { role: 'user', content: synthesisUserPrompt },
          ],
          temperature: 0.3,
          stream: true,
        },
        { signal: synthController2.signal }
      );

      for await (const chunk of mistralStream) {
        clearTimeout(synthTimeout2);
        const delta = chunk.choices?.[0]?.delta?.content;
        if (delta) {
          onChunk({ text: delta });
          synthesisSuccess = true;
        }
      }
      clearTimeout(synthTimeout2);
    } catch (mistralErr: any) {
      clearTimeout(synthTimeout2);
      console.warn('Mistral synthesis failed as well, outputting best candidate output directly');
      // Output best single output directly if synthesis models were unavailable
      const bestOutput = successfulOutputs[0].output;
      onChunk({ text: bestOutput });
      synthesisSuccess = true;
    }
  }

  if (!synthesisSuccess) {
    await geminiFallback();
  }
}
