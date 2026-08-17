import type { SemanticSearchResult } from '@/lib/server/rag/types';

export interface RagEvalCase {
  id: string;
  query: string;
  expected_doc_ids?: string[];
  must_be_relevant?: boolean;
  min_score?: number;
  must_contain?: string[];
}

export interface RagEvalCaseResult {
  id: string;
  query: string;
  passed: boolean;
  topScore: number;
  hasRelevant: boolean;
  matched_doc_ids: string[];
  failures: string[];
}

export interface RagEvalSummary {
  total: number;
  passed: number;
  failed: number;
  pass_rate: number;
  avg_top_score: number;
  positive_recall: number;
  negative_precision: number;
  failures: RagEvalCaseResult[];
}

function normalizeForMatch(text: string): string {
  return text.toLowerCase().replace(/,/g, '');
}

export function evaluateRagCase(
  testCase: RagEvalCase,
  result: SemanticSearchResult
): RagEvalCaseResult {
  const failures: string[] = [];
  const mustBeRelevant = testCase.must_be_relevant ?? true;
  const matched_doc_ids = [...new Set(result.chunks.map((c) => c.doc_id))];

  if (mustBeRelevant && !result.hasRelevant) {
    failures.push('expected relevant retrieval but got hasRelevant=false');
  }

  if (!mustBeRelevant && result.hasRelevant) {
    failures.push('expected no relevant match but retrieval passed threshold');
  }

  if (testCase.min_score !== undefined && result.topScore < testCase.min_score) {
    failures.push(`topScore ${result.topScore.toFixed(3)} < min ${testCase.min_score}`);
  }

  if (testCase.expected_doc_ids?.length) {
    const expected = new Set(testCase.expected_doc_ids);
    const hit = matched_doc_ids.some((id) => expected.has(id));
    if (!hit) {
      failures.push(
        `expected doc_id in [${testCase.expected_doc_ids.join(', ')}] but got [${matched_doc_ids.join(', ') || 'none'}]`
      );
    }
  }

  if (testCase.must_contain?.length && result.chunks.length) {
    const corpus = normalizeForMatch(result.chunks.map((c) => c.content).join(' '));
    for (const term of testCase.must_contain) {
      if (!corpus.includes(normalizeForMatch(term))) {
        failures.push(`chunk content missing required term "${term}"`);
      }
    }
  }

  return {
    id: testCase.id,
    query: testCase.query,
    passed: failures.length === 0,
    topScore: result.topScore,
    hasRelevant: result.hasRelevant,
    matched_doc_ids,
    failures,
  };
}

export function summarizeEvalResults(results: RagEvalCaseResult[]): RagEvalSummary {
  const passed = results.filter((r) => r.passed).length;
  const failed = results.length - passed;
  const avg_top_score =
    results.length > 0 ? results.reduce((sum, r) => sum + r.topScore, 0) / results.length : 0;

  const positive = results.filter((r) => r.id.startsWith('negative-') === false);
  const negative = results.filter((r) => r.id.startsWith('negative-'));

  const positivePassed = positive.filter((r) => r.passed).length;
  const negativePassed = negative.filter((r) => r.passed).length;

  return {
    total: results.length,
    passed,
    failed,
    pass_rate: results.length ? passed / results.length : 0,
    avg_top_score,
    positive_recall: positive.length ? positivePassed / positive.length : 1,
    negative_precision: negative.length ? negativePassed / negative.length : 1,
    failures: results.filter((r) => !r.passed),
  };
}

export function formatEvalReport(summary: RagEvalSummary): string {
  const lines = [
    `RAG eval: ${summary.passed}/${summary.total} passed (${(summary.pass_rate * 100).toFixed(1)}%)`,
    `  Positive recall: ${(summary.positive_recall * 100).toFixed(1)}%`,
    `  Negative precision: ${(summary.negative_precision * 100).toFixed(1)}%`,
    `  Avg top score: ${summary.avg_top_score.toFixed(3)}`,
  ];

  if (summary.failures.length) {
    lines.push('Failures:');
    for (const f of summary.failures) {
      lines.push(`  - [${f.id}] ${f.failures.join('; ')} (score=${f.topScore.toFixed(3)})`);
    }
  }

  return lines.join('\n');
}
