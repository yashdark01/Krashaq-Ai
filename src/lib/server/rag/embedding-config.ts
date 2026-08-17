import { getConfig } from '@/lib/server/config';

export type EmbeddingProvider = 'groq' | 'huggingface' | 'ollama' | 'gemini' | 'openai';

const EXPLICIT_PROVIDERS: EmbeddingProvider[] = [
  'groq',
  'huggingface',
  'ollama',
  'gemini',
  'openai',
];

export function resolveEmbeddingProvider(): EmbeddingProvider {
  const explicit = (process.env.EMBEDDING_PROVIDER ?? 'auto').toLowerCase();
  if (EXPLICIT_PROVIDERS.includes(explicit as EmbeddingProvider)) {
    return explicit as EmbeddingProvider;
  }

  // auto — prefer reliable free tiers (Groq embeddings not enabled on all accounts)
  if (process.env.HF_TOKEN || process.env.HUGGINGFACE_API_KEY) return 'huggingface';
  if (process.env.GOOGLE_API_KEY) return 'gemini';
  if (process.env.EMBEDDING_API_KEY || process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.GROQ_API_KEY) return 'groq';
  return 'ollama';
}

export function defaultEmbeddingModel(provider: EmbeddingProvider): string {
  if (process.env.EMBEDDING_MODEL) return process.env.EMBEDDING_MODEL;

  switch (provider) {
    case 'groq':
      return 'nomic-embed-text-v1_5';
    case 'huggingface':
      return 'sentence-transformers/all-MiniLM-L6-v2';
    case 'ollama':
      return 'nomic-embed-text';
    case 'gemini':
      return 'gemini-embedding-001';
    case 'openai':
      return 'text-embedding-3-small';
  }
}

export function isEmbeddingConfigured(): boolean {
  const provider = resolveEmbeddingProvider();
  const cfg = getConfig();

  switch (provider) {
    case 'groq':
      return Boolean(cfg.groqApiKey);
    case 'huggingface':
      return Boolean(cfg.hfToken);
    case 'gemini':
      return Boolean(cfg.googleApiKey);
    case 'openai':
      return Boolean(process.env.EMBEDDING_API_KEY ?? cfg.openaiApiKey);
    case 'ollama':
      return true;
  }
}

export function embeddingSetupHint(): string {
  const provider = resolveEmbeddingProvider();
  switch (provider) {
    case 'groq':
      return 'Set GROQ_API_KEY (same key as chat LLM) — free nomic-embed-text-v1_5 embeddings';
    case 'huggingface':
      return 'Set HF_TOKEN from huggingface.co/settings/tokens — free inference tier';
    case 'ollama':
      return 'Install Ollama, run: ollama pull nomic-embed-text, set EMBEDDING_PROVIDER=ollama';
    case 'gemini':
      return 'Set GOOGLE_API_KEY and EMBEDDING_PROVIDER=gemini (free tier available)';
    case 'openai':
      return 'Set OPENAI_API_KEY or EMBEDDING_API_KEY';
  }
}
