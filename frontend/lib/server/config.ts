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
    geminiModel: process.env.GEMINI_MODEL ?? 'gemini-1.5-flash',
    xaiApiKey: process.env.XAI_API_KEY ?? '',
    deepseekApiKey: process.env.DEEPSEEK_API_KEY ?? '',
    mistralApiKey: process.env.MISTRAL_API_KEY ?? '',
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? 'http://127.0.0.1:11434',

    jwtSecret: process.env.JWT_SECRET_KEY ?? 'dev-change-me-in-production',
    jwtAlgorithm: 'HS256' as const,
    accessTokenExpireMinutes: Number(process.env.ACCESS_TOKEN_EXPIRE_MINUTES ?? 30),
    refreshTokenExpireDays: Number(process.env.REFRESH_TOKEN_EXPIRE_DAYS ?? 7),
    legacyPythonUrl: process.env.LEGACY_PYTHON_URL ?? '',
  };
}
