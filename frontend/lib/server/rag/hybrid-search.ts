import { getCollection } from '@/lib/server/db/mongodb';
import { cosineSimilarity, keywordScore, reciprocalRankFusion } from '@/lib/server/rag/scoring';
import { embedQuery, isEmbeddingConfigured } from '@/lib/server/rag/embeddings';

export interface KbChunkRecord {
  id: string;
  doc_id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  chunk_index: number;
}

export interface KbCitation {
  id: string;
  doc_id: string;
  title: string;
  snippet: string;
  score: number;
  source: 'kb';
}

const MIN_RELEVANCE_SCORE = 0.15;

export async function keywordSearchChunks(query: string, limit = 10) {
  const kb = await getCollection('kb_chunks');
  const docs = await kb.find({}).toArray();

  return docs
    .map((d) => {
      const score = keywordScore(
        query,
        d.title as string,
        d.content as string,
        (d.tags as string[]) ?? []
      );
      return {
        id: String(d._id),
        doc_id: String(d.doc_id),
        title: d.title as string,
        content: d.content as string,
        category: (d.category as string) ?? 'general',
        tags: (d.tags as string[]) ?? [],
        chunk_index: (d.chunk_index as number) ?? 0,
        score,
      };
    })
    .filter((d) => d.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export async function vectorSearchChunks(query: string, limit = 10) {
  const queryVec = await embedQuery(query);
  if (!queryVec) return [];

  const kb = await getCollection('kb_chunks');
  const docs = await kb.find({ embedding: { $exists: true, $ne: [] } }).toArray();

  return docs
    .map((d) => {
      const embedding = d.embedding as number[];
      const score = cosineSimilarity(queryVec, embedding);
      return {
        id: String(d._id),
        doc_id: String(d.doc_id),
        title: d.title as string,
        content: d.content as string,
        category: (d.category as string) ?? 'general',
        tags: (d.tags as string[]) ?? [],
        chunk_index: (d.chunk_index as number) ?? 0,
        score,
      };
    })
    .filter((d) => d.score > 0.2)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export async function hybridSearchKb(
  query: string,
  limit = 5
): Promise<{ chunks: KbChunkRecord[]; citations: KbCitation[]; hasRelevant: boolean }> {
  const q = query.trim();
  if (!q) return { chunks: [], citations: [], hasRelevant: false };

  const keywordHits = await keywordSearchChunks(q, 15);
  const vectorHits = isEmbeddingConfigured() ? await vectorSearchChunks(q, 15) : [];

  const fused =
    vectorHits.length > 0
      ? reciprocalRankFusion([keywordHits, vectorHits], 60, limit)
      : keywordHits.slice(0, limit);

  const hasRelevant = fused.length > 0 && fused[0].score >= MIN_RELEVANCE_SCORE;

  const citations: KbCitation[] = fused.map((hit, i) => ({
    id: hit.id,
    doc_id: hit.doc_id,
    title: hit.title,
    snippet: hit.content.slice(0, 220).trim() + (hit.content.length > 220 ? '…' : ''),
    score: hit.score,
    source: 'kb' as const,
  }));

  const chunks: KbChunkRecord[] = fused.map((hit) => ({
    id: hit.id,
    doc_id: hit.doc_id,
    title: hit.title,
    content: hit.content,
    category: hit.category,
    tags: hit.tags,
    chunk_index: hit.chunk_index,
  }));

  return { chunks, citations, hasRelevant };
}

export function formatKbContextForPrompt(
  chunks: KbChunkRecord[],
  citations: KbCitation[]
): string {
  if (!chunks.length) {
    return 'No verified knowledge base documents matched this query.';
  }

  return chunks
    .map((c, i) => {
      const cite = citations[i];
      return `[KB${i + 1}] ${c.title} (id: ${cite?.doc_id ?? c.doc_id})\n${c.content}`;
    })
    .join('\n\n');
}
