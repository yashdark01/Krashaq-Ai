import {
  evaluateRagCase,
  formatEvalReport,
  summarizeEvalResults,
} from '@/lib/server/rag/eval';
import type { SemanticSearchResult } from '@/lib/server/rag/types';

describe('rag eval scoring', () => {
  const relevantResult: SemanticSearchResult = {
    chunks: [
      {
        id: 'kb-pm-kisan-scheme-ch0',
        doc_id: 'kb-pm-kisan-scheme',
        title: 'PM-KISAN Scheme Overview',
        content: 'PM-KISAN provides income support. Eligible landholding farmer families benefit.',
        category: 'scheme',
        tags: ['pm-kisan'],
        chunk_index: 0,
      },
    ],
    citations: [],
    hasRelevant: true,
    topScore: 0.82,
  };

  it('passes a matching positive case', () => {
    const result = evaluateRagCase(
      {
        id: 'pm-kisan-eligibility',
        query: 'What is PM-KISAN eligibility?',
        expected_doc_ids: ['kb-pm-kisan-scheme'],
        must_be_relevant: true,
        min_score: 0.7,
        must_contain: ['eligible'],
      },
      relevantResult
    );
    expect(result.passed).toBe(true);
  });

  it('fails when expected doc_id is missing', () => {
    const result = evaluateRagCase(
      {
        id: 'wrong-doc',
        query: 'wheat sowing',
        expected_doc_ids: ['kb-wheat-mp-rabi'],
        must_be_relevant: true,
      },
      relevantResult
    );
    expect(result.passed).toBe(false);
    expect(result.failures.some((f) => f.includes('expected doc_id'))).toBe(true);
  });

  it('fails negative cases that retrieve above threshold', () => {
    const result = evaluateRagCase(
      {
        id: 'negative-weather',
        query: 'weather in Mumbai',
        must_be_relevant: false,
      },
      relevantResult
    );
    expect(result.passed).toBe(false);
  });

  it('summarizes pass rate', () => {
    const summary = summarizeEvalResults([
      { id: 'a', query: 'q', passed: true, topScore: 0.8, hasRelevant: true, matched_doc_ids: [], failures: [] },
      { id: 'negative-x', query: 'q', passed: false, topScore: 0.8, hasRelevant: true, matched_doc_ids: [], failures: ['x'] },
    ]);
    expect(summary.total).toBe(2);
    expect(summary.passed).toBe(1);
    expect(summary.pass_rate).toBe(0.5);
    expect(formatEvalReport(summary)).toContain('RAG eval:');
  });
});
