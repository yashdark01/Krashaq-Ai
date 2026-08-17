import {
  defaultEmbeddingModel,
  isEmbeddingConfigured,
  resolveEmbeddingProvider,
} from '@/lib/server/rag/embedding-config';

describe('embedding providers', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.EMBEDDING_PROVIDER;
    delete process.env.EMBEDDING_MODEL;
    delete process.env.EMBEDDING_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.GROQ_API_KEY;
    delete process.env.HF_TOKEN;
    delete process.env.HUGGINGFACE_API_KEY;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('defaults auto to ollama when no cloud keys', () => {
    expect(resolveEmbeddingProvider()).toBe('ollama');
    expect(defaultEmbeddingModel('ollama')).toBe('nomic-embed-text');
    expect(isEmbeddingConfigured()).toBe(true);
  });

  it('prefers groq in auto only when no other cloud keys', () => {
    process.env.GROQ_API_KEY = 'test-key';
    expect(resolveEmbeddingProvider()).toBe('groq');
    expect(defaultEmbeddingModel('groq')).toBe('nomic-embed-text-v1_5');
    expect(isEmbeddingConfigured()).toBe(true);
  });

  it('prefers huggingface over groq in auto', () => {
    process.env.GROQ_API_KEY = 'test-key';
    process.env.HF_TOKEN = 'test-token';
    expect(resolveEmbeddingProvider()).toBe('huggingface');
  });

  it('prefers gemini in auto when GOOGLE_API_KEY is set (without groq)', () => {
    process.env.GOOGLE_API_KEY = 'test-key';
    expect(resolveEmbeddingProvider()).toBe('gemini');
    expect(defaultEmbeddingModel('gemini')).toBe('gemini-embedding-001');
  });

  it('prefers huggingface in auto when HF_TOKEN is set (without groq/gemini)', () => {
    process.env.HF_TOKEN = 'test-token';
    expect(resolveEmbeddingProvider()).toBe('huggingface');
    expect(defaultEmbeddingModel('huggingface')).toBe('sentence-transformers/all-MiniLM-L6-v2');
  });

  it('uses explicit ollama provider', () => {
    process.env.EMBEDDING_PROVIDER = 'ollama';
    expect(resolveEmbeddingProvider()).toBe('ollama');
  });

  it('respects custom EMBEDDING_MODEL', () => {
    process.env.EMBEDDING_MODEL = 'mxbai-embed-large';
    expect(defaultEmbeddingModel('ollama')).toBe('mxbai-embed-large');
  });
});
