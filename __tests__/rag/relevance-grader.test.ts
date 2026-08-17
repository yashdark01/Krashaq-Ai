import { l2Normalize, cosineSimilarity } from '@/lib/server/rag/scoring';
import {
  applySemanticMmr,
  gradeSemanticResults,
  passesRelevanceThreshold,
} from '@/lib/server/rag/relevance-grader';

describe('rag scoring vectors', () => {
  it('l2-normalizes vectors to unit length', () => {
    const normalized = l2Normalize([3, 4]);
    const norm = Math.sqrt(normalized[0] ** 2 + normalized[1] ** 2);
    expect(norm).toBeCloseTo(1, 5);
  });

  it('cosine similarity of identical normalized vectors is 1', () => {
    const a = l2Normalize([1, 2, 3]);
    const b = l2Normalize([1, 2, 3]);
    expect(cosineSimilarity(a, b)).toBeCloseTo(1, 5);
  });
});

describe('relevance grader', () => {
  it('passes when score meets threshold', () => {
    expect(passesRelevanceThreshold(0.8, 0.72)).toBe(true);
    expect(passesRelevanceThreshold(0.5, 0.72)).toBe(false);
  });

  it('grades results as relevant when score and chunks are sufficient', () => {
    expect(gradeSemanticResults(0.85, 3)).toBe(true);
    expect(gradeSemanticResults(0.5, 3)).toBe(false);
    expect(gradeSemanticResults(0.9, 0)).toBe(false);
  });

  it('applies MMR to prefer diverse doc_ids', () => {
    const hits = [
      { id: 'a', doc_id: 'doc-1', title: 'A', content: 'x', category: 'c', tags: [], chunk_index: 0, score: 0.9 },
      { id: 'b', doc_id: 'doc-1', title: 'B', content: 'y', category: 'c', tags: [], chunk_index: 1, score: 0.85 },
      { id: 'c', doc_id: 'doc-2', title: 'C', content: 'z', category: 'c', tags: [], chunk_index: 0, score: 0.8 },
    ];

    const selected = applySemanticMmr(hits, 2);
    expect(selected).toHaveLength(2);
    expect(new Set(selected.map((h) => h.doc_id)).size).toBe(2);
  });
});
