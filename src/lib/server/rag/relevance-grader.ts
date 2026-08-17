import { getConfig } from '@/lib/server/config';
import type { SemanticSearchResult, KbChunkRecord } from '@/lib/server/rag/types';

export function passesRelevanceThreshold(topScore: number, minScore?: number): boolean {
  const cfg = getConfig();
  const threshold = minScore ?? cfg.ragMinScore;
  return topScore >= threshold;
}

export function gradeSemanticResults(topScore: number, chunkCount: number): boolean {
  if (chunkCount === 0) return false;
  return passesRelevanceThreshold(topScore);
}

interface ScoredChunk extends KbChunkRecord {
  score: number;
}

/** Maximal Marginal Relevance — prefer diverse doc_ids among semantic hits */
export function applySemanticMmr(hits: ScoredChunk[], limit: number, lambda = 0.7): ScoredChunk[] {
  if (hits.length <= limit) return hits;

  const selected: ScoredChunk[] = [];
  const remaining = [...hits];

  while (selected.length < limit && remaining.length) {
    let bestIdx = 0;
    let bestScore = -Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      let penalty = 0;

      for (const picked of selected) {
        if (picked.doc_id === candidate.doc_id) {
          penalty = 1;
          break;
        }
      }

      const mmr = lambda * candidate.score - (1 - lambda) * penalty;
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

export function buildSemanticSearchResult(
  hits: ScoredChunk[],
  hasRelevant: boolean
): SemanticSearchResult {
  const topScore = hits[0]?.score ?? 0;

  const citations = hits.map((hit) => ({
    id: hit.id,
    doc_id: hit.doc_id,
    title: hit.title,
    snippet: hit.content.slice(0, 220).trim() + (hit.content.length > 220 ? '…' : ''),
    score: hit.score,
    source: 'kb' as const,
  }));

  const chunks: KbChunkRecord[] = hits.map(({ score: _score, ...chunk }) => chunk);

  return { chunks, citations, hasRelevant, topScore };
}
