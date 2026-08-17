export function getConfig() {
  const fallbackRaw = process.env.LLM_FALLBACK_CHAIN ?? 'gemini,openai,anthropic';
  return {
    mongodbUrl: process.env.MONGODB_URL ?? 'mongodb://localhost:27017',
    mongodbDb: process.env.MONGODB_DB ?? 'krashaq',
    redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379/0',
    weatherApiKey: process.env.WEATHER_API_KEY ?? '',

    // LLM — Groq is the default provider
    defaultLlmProvider: (process.env.LLM_PROVIDER ?? 'groq') as
      | 'groq'
      | 'openai'
      | 'anthropic'
      | 'gemini'
      | 'xai'
      | 'deepseek'
      | 'mistral'
      | 'ollama',
    llmFallbackChain: fallbackRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),

    groqApiKey: process.env.GROQ_API_KEY ?? '',
    groqModel: process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile',

    openaiApiKey: process.env.OPENAI_API_KEY ?? '',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
    googleApiKey: process.env.GOOGLE_API_KEY ?? '',
    geminiModel: process.env.GEMINI_MODEL ?? 'gemini-3.6-flash',
    xaiApiKey: process.env.XAI_API_KEY ?? '',
    deepseekApiKey: process.env.DEEPSEEK_API_KEY ?? '',
    mistralApiKey: process.env.MISTRAL_API_KEY ?? '',
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434',
    hfToken: process.env.HF_TOKEN ?? process.env.HUGGINGFACE_API_KEY ?? '',

    jwtSecret: process.env.JWT_SECRET_KEY ?? 'dev-change-me-in-production',
    jwtAlgorithm: 'HS256' as const,
    accessTokenExpireMinutes: Number(process.env.ACCESS_TOKEN_EXPIRE_MINUTES ?? 30),
    refreshTokenExpireDays: Number(process.env.REFRESH_TOKEN_EXPIRE_DAYS ?? 7),

    appUrl: process.env.APP_URL ?? 'http://localhost:3000',
    smtpHost: process.env.SMTP_HOST ?? '',
    smtpPort: Number(process.env.SMTP_PORT ?? 587),
    smtpUser: process.env.SMTP_USER ?? '',
    smtpPass: process.env.SMTP_PASS ?? '',
    smtpFrom: process.env.SMTP_FROM ?? 'Krashaq <noreply@krashaq.app>',

    langsmithTracing:
      process.env.LANGCHAIN_TRACING_V2 === 'true' || process.env.LANGSMITH_TRACING === 'true',
    langsmithApiKey: process.env.LANGCHAIN_API_KEY ?? process.env.LANGSMITH_API_KEY ?? '',
    langsmithProject: process.env.LANGCHAIN_PROJECT ?? process.env.LANGSMITH_PROJECT ?? 'krashaq',
    langsmithEndpoint: process.env.LANGSMITH_ENDPOINT ?? process.env.LANGCHAIN_ENDPOINT ?? '',

    tavilyApiKey: process.env.TAVILY_API_KEY ?? '',
    tavilyMaxResults: Number(process.env.TAVILY_MAX_RESULTS ?? 5),

    faissIndexPath: process.env.FAISS_INDEX_PATH ?? './data/faiss/kb.index',
    faissIdMapPath: process.env.FAISS_ID_MAP_PATH ?? './data/faiss/id-map.json',
    embeddingProvider: (process.env.EMBEDDING_PROVIDER ?? 'auto') as
      | 'auto'
      | 'groq'
      | 'huggingface'
      | 'ollama'
      | 'gemini'
      | 'openai',
    embeddingModel: process.env.EMBEDDING_MODEL ?? '',
    ragMinScore: Number(process.env.RAG_MIN_SCORE ?? 0.65),
    ragMinScoreHi: Number(process.env.RAG_MIN_SCORE_HI ?? process.env.RAG_MIN_SCORE ?? 0.55),
    ragTopK: Number(process.env.RAG_TOP_K ?? 5),
    ragFetchK: Number(process.env.RAG_FETCH_K ?? 10),
    ragCacheEnabled: process.env.RAG_CACHE_ENABLED !== 'false',
    ragCacheTtl: Number(process.env.RAG_CACHE_TTL ?? 300),
  };
}
