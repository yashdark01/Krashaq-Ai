/** @jest-environment node */
/**
 * Integration eval — requires OPENAI_API_KEY + built FAISS index.
 * Run: npm run eval:rag
 */
import fs from 'fs';
import path from 'path';

const EVAL_PATH = path.join(process.cwd(), 'evals', 'rag-faithfulness.json');
const INDEX_PATH = path.join(process.cwd(), 'data', 'faiss', 'kb.index');
const MIN_PASS_RATE = Number(process.env.RAG_EVAL_MIN_PASS_RATE ?? 0.85);
const MIN_POSITIVE_RECALL = Number(process.env.RAG_EVAL_MIN_POSITIVE_RECALL ?? 0.9);

const canRunIntegration =
  fs.existsSync(INDEX_PATH) &&
  fs.existsSync(EVAL_PATH) &&
  (() => {
    const explicit = (process.env.EMBEDDING_PROVIDER ?? 'auto').toLowerCase();
    if (explicit === 'ollama') return true;
    if (explicit === 'groq') return Boolean(process.env.GROQ_API_KEY);
    if (explicit === 'huggingface') {
      return Boolean(process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY);
    }
    if (explicit === 'gemini') return Boolean(process.env.GOOGLE_API_KEY);
    if (explicit === 'openai') {
      return Boolean(process.env.OPENAI_API_KEY || process.env.EMBEDDING_API_KEY);
    }
    return (
      Boolean(process.env.GROQ_API_KEY) ||
      Boolean(process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY) ||
      Boolean(process.env.GOOGLE_API_KEY) ||
      Boolean(process.env.OPENAI_API_KEY || process.env.EMBEDDING_API_KEY) ||
      true
    );
  })();

const describeIntegration = canRunIntegration ? describe : describe.skip;

describeIntegration('rag faithfulness integration eval', () => {
  it(`meets quality thresholds (pass≥${MIN_PASS_RATE * 100}%, positive recall≥${MIN_POSITIVE_RECALL * 100}%)`, async () => {
    const cases = JSON.parse(fs.readFileSync(EVAL_PATH, 'utf8'));
    const { runRagEval, formatEvalReport } = await import('@/lib/server/rag/retriever');
    const { summary } = await runRagEval(cases);

    // eslint-disable-next-line no-console
    console.log('\n' + formatEvalReport(summary) + '\n');

    expect(summary.pass_rate).toBeGreaterThanOrEqual(MIN_PASS_RATE);
    expect(summary.positive_recall).toBeGreaterThanOrEqual(MIN_POSITIVE_RECALL);
    expect(summary.negative_precision).toBeGreaterThanOrEqual(0.8);
  }, 120_000);
});
