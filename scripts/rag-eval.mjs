#!/usr/bin/env node
/**
 * Run RAG faithfulness eval against evals/rag-faithfulness.json.
 * Requires a built FAISS index and one of: GROQ_API_KEY, HF_TOKEN, GOOGLE_API_KEY, OPENAI_API_KEY, or Ollama.
 *
 * Usage: npm run eval:rag
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const evalPath = path.join(root, 'evals', 'rag-faithfulness.json');
const indexPath = path.join(root, 'data', 'faiss', 'kb.index');

function loadEnvFile(filename) {
  const envPath = path.join(root, filename);
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile('.env');
loadEnvFile('.env.local');

function resolveProvider() {
  const explicit = (process.env.EMBEDDING_PROVIDER ?? 'auto').toLowerCase();
  const providers = ['groq', 'huggingface', 'ollama', 'gemini', 'openai'];
  if (providers.includes(explicit)) return explicit;
  if (process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY) return 'huggingface';
  if (process.env.GOOGLE_API_KEY) return 'gemini';
  if (process.env.EMBEDDING_API_KEY || process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.GROQ_API_KEY) return 'groq';
  return 'ollama';
}

const provider = resolveProvider();

if (provider === 'groq' && !process.env.GROQ_API_KEY) {
  console.error('RAG eval with groq requires GROQ_API_KEY.');
  process.exit(1);
}

if (provider === 'huggingface' && !(process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY)) {
  console.error('RAG eval with huggingface requires HF_TOKEN.');
  process.exit(1);
}

if (provider === 'gemini' && !process.env.GOOGLE_API_KEY) {
  console.error('RAG eval with gemini requires GOOGLE_API_KEY.');
  process.exit(1);
}

if (provider === 'openai' && !(process.env.EMBEDDING_API_KEY || process.env.OPENAI_API_KEY)) {
  console.error('RAG eval with openai requires OPENAI_API_KEY or EMBEDDING_API_KEY.');
  process.exit(1);
}

if (!fs.existsSync(indexPath)) {
  console.error('FAISS index not found. Run: npm run kb:ingest:force');
  process.exit(1);
}

if (!fs.existsSync(evalPath)) {
  console.error('Missing evals/rag-faithfulness.json');
  process.exit(1);
}

console.log(`RAG eval using embedding provider: ${provider}`);

const result = spawnSync(
  'npx',
  ['jest', '__tests__/evals/rag-faithfulness.test.ts', '--runInBand', '--forceExit'],
  { cwd: root, stdio: 'inherit', env: process.env }
);

process.exit(result.status ?? 1);
