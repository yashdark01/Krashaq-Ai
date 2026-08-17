import { getConfig } from '@/lib/server/config';
import {
  defaultEmbeddingModel,
  embeddingSetupHint,
  isEmbeddingConfigured,
  resolveEmbeddingProvider,
  type EmbeddingProvider,
} from '@/lib/server/rag/embedding-config';

export {
  defaultEmbeddingModel,
  embeddingSetupHint,
  isEmbeddingConfigured,
  resolveEmbeddingProvider,
  type EmbeddingProvider,
};

export interface EmbedderClient {
  embedDocuments(texts: string[]): Promise<number[][]>;
  embedQuery(text: string): Promise<number[]>;
}

let cached: { key: string; client: EmbedderClient } | null = null;

async function embedGroq(texts: string[], model: string, apiKey: string): Promise<number[][]> {
  const res = await fetch('https://api.groq.com/openai/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, input: texts, encoding_format: 'float' }),
  });

  if (!res.ok) {
    throw new Error(`Groq embed failed (${res.status}): ${await res.text()}`);
  }

  const data = (await res.json()) as { data: Array<{ embedding: number[]; index: number }> };
  return data.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

function meanPool(tokenVectors: number[][]): number[] {
  const dim = tokenVectors[0]?.length ?? 0;
  const out = new Array<number>(dim).fill(0);
  for (const vec of tokenVectors) {
    for (let i = 0; i < dim; i++) out[i] += vec[i] ?? 0;
  }
  for (let i = 0; i < dim; i++) out[i] /= tokenVectors.length;
  return out;
}

function normalizeHfVector(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  if (raw.length === 0) return [];
  if (typeof raw[0] === 'number') return raw as number[];
  if (Array.isArray(raw[0])) {
    const nested = raw as number[][];
    if (nested.length === 1) return nested[0] ?? [];
    return meanPool(nested);
  }
  return [];
}

async function embedHuggingFace(
  texts: string[],
  model: string,
  apiKey: string
): Promise<number[][]> {
  const res = await fetch(`https://api-inference.huggingface.co/pipeline/feature-extraction/${model}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ inputs: texts, options: { wait_for_model: true } }),
  });

  if (!res.ok) {
    throw new Error(`Hugging Face embed failed (${res.status}): ${await res.text()}`);
  }

  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) return [];

  if (texts.length === 1) {
    return [normalizeHfVector(data)];
  }

  return (data as unknown[]).map((item) => normalizeHfVector(item));
}

async function embedOllama(texts: string[], model: string, baseUrl: string): Promise<number[][]> {
  const res = await fetch(`${baseUrl}/api/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, input: texts }),
  });

  if (!res.ok) {
    throw new Error(`Ollama embed failed (${res.status}): ${await res.text()}`);
  }

  const data = (await res.json()) as { embeddings?: number[][] };
  return data.embeddings ?? [];
}

async function embedGemini(texts: string[], model: string, apiKey: string): Promise<number[][]> {
  const embeddings: number[][] = [];
  for (const text of texts) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: `models/${model}`,
          content: { parts: [{ text }] },
        }),
      }
    );

    if (!res.ok) {
      throw new Error(`Gemini embed failed (${res.status}): ${await res.text()}`);
    }

    const data = (await res.json()) as { embedding?: { values?: number[] } };
    embeddings.push(data.embedding?.values ?? []);
  }
  return embeddings;
}

async function embedOpenAI(texts: string[], model: string, apiKey: string): Promise<number[][]> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, input: texts }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI embed failed (${res.status}): ${await res.text()}`);
  }

  const data = (await res.json()) as { data: Array<{ embedding: number[] }> };
  return data.data.map((d) => d.embedding);
}

function createFetchEmbedder(provider: EmbeddingProvider, model: string): EmbedderClient {
  const cfg = getConfig();

  return {
    async embedDocuments(texts: string[]) {
      if (!texts.length) return [];
      switch (provider) {
        case 'groq':
          return embedGroq(texts, model, cfg.groqApiKey);
        case 'huggingface':
          return embedHuggingFace(texts, model, cfg.hfToken);
        case 'ollama':
          return embedOllama(texts, model, cfg.ollamaBaseUrl);
        case 'gemini':
          return embedGemini(texts, model, cfg.googleApiKey);
        case 'openai':
          return embedOpenAI(texts, model, process.env.EMBEDDING_API_KEY ?? cfg.openaiApiKey);
      }
    },
    async embedQuery(text: string) {
      const [vec] = await this.embedDocuments([text]);
      return vec ?? [];
    },
  };
}

export function getEmbedder(): EmbedderClient | null {
  if (!isEmbeddingConfigured()) return null;

  const provider = resolveEmbeddingProvider();
  const model = defaultEmbeddingModel(provider);
  const cacheKey = `${provider}:${model}`;

  if (cached?.key === cacheKey) return cached.client;

  const client = createFetchEmbedder(provider, model);
  cached = { key: cacheKey, client };
  return client;
}
