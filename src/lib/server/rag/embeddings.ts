import {
  getEmbedder,
  isEmbeddingConfigured,
  embeddingSetupHint,
  resolveEmbeddingProvider,
  defaultEmbeddingModel,
} from '@/lib/server/rag/embedding-providers';

export { isEmbeddingConfigured, embeddingSetupHint, resolveEmbeddingProvider, defaultEmbeddingModel };

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
