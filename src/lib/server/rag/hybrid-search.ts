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

const MIN_RELEVANCE_SCORE = 0.12;

const CATEGORY_KEYWORDS: Record<string, RegExp> = {
  scheme: /scheme|yojana|pm-kisan|pm kisan|subsidy|eligibility|government|loan|msp|mandi|policy/i,
  crop: /crop|fasal|wheat|soybean|rice|cotton|maize|gehu|gahu/i,
  pest: /pest|disease|insect|keet|rog|symptom|blight|rust/i,
  irrigation: /irrigation|drip|sinchai|paani|water|sprinkler/i,
  fertilizer: /fertilizer|khad|urea|dap|npk|nutrient/i,
};

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase().replace(/\s+/g, ' ');
}

function detectCategoryBoost(query: string): string | null {
  for (const [category, pattern] of Object.entries(CATEGORY_KEYWORDS)) {
    if (pattern.test(query)) return category;
  }
  return null;
}

/** Maximal Marginal Relevance — prefer diverse doc_ids */
function applyMmrDiversity<
  T extends { id: string; doc_id: string; score: number; content: string },
>(hits: T[], limit: number, lambda = 0.7): T[] {
  if (hits.length <= limit) return hits;

  const selected: T[] = [];
  const remaining = [...hits];

  while (selected.length < limit && remaining.length) {
    let bestIdx = 0;
    let bestScore = -Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      const relevance = candidate.score;
      let maxSim = 0;

      for (const picked of selected) {
        if (picked.doc_id === candidate.doc_id) {
          maxSim = 1;
          break;
        }
        const a = tokenize(picked.content.slice(0, 200));
        const b = tokenize(candidate.content.slice(0, 200));
        const overlap = a.filter((t) => b.includes(t)).length;
        maxSim = Math.max(maxSim, overlap / Math.max(a.length, b.length, 1));
      }

      const mmr = lambda * relevance - (1 - lambda) * maxSim;
      if (mmr > bestScore) {
        bestScore = mmr;
        bestIdx = i;
      }
    }

    selected.push(remaining[bestIdx]);
    remaining.splice(bestIdx, 1);
  }

  return selected;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s\u0900-\u097F-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

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
  const q = normalizeQuery(query);
  if (!q) return { chunks: [], citations: [], hasRelevant: false };

  const categoryBoost = detectCategoryBoost(q);

  const keywordHits = await keywordSearchChunks(q, 20);
  const vectorHits = isEmbeddingConfigured() ? await vectorSearchChunks(q, 20) : [];

  let fused =
    vectorHits.length > 0
      ? reciprocalRankFusion([keywordHits, vectorHits], 60, limit * 2)
      : keywordHits.slice(0, limit * 2);

  if (categoryBoost) {
    fused = fused.map((hit) => ({
      ...hit,
      score: hit.category === categoryBoost ? hit.score * 1.25 : hit.score,
    }));
    fused.sort((a, b) => b.score - a.score);
  }

  fused = applyMmrDiversity(fused, limit);

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

export function formatKbContextForPrompt(chunks: KbChunkRecord[], citations: KbCitation[]): string {
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
