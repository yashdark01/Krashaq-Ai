import { OpenAIEmbeddings } from '@langchain/openai';
import { getConfig } from '@/lib/server/config';

let embedder: OpenAIEmbeddings | null = null;

export function isEmbeddingConfigured() {
  return Boolean(getConfig().openaiApiKey || process.env.EMBEDDING_API_KEY);
}

function getEmbedder() {
  const cfg = getConfig();
  const apiKey = process.env.EMBEDDING_API_KEY ?? cfg.openaiApiKey;
  if (!apiKey) return null;

  if (!embedder) {
    embedder = new OpenAIEmbeddings({
      apiKey,
      model: process.env.EMBEDDING_MODEL ?? 'text-embedding-3-small',
    });
  }
  return embedder;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const client = getEmbedder();
  if (!client || !texts.length) return [];
  return client.embedDocuments(texts);
}

export async function embedQuery(query: string): Promise<number[] | null> {
  const client = getEmbedder();
  if (!client || !query.trim()) return null;
  return client.embedQuery(query);
}
