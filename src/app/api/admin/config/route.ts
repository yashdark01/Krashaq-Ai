import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/auth/rbac';
import { getConfig } from '@/lib/server/config';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response;

  const cfg = getConfig();
  return NextResponse.json({
    llm_provider: cfg.defaultLlmProvider,
    groq_model: cfg.groqModel,
    gemini_model: cfg.geminiModel,
    llm_fallback_chain: cfg.llmFallbackChain,
    langsmith_tracing: cfg.langsmithTracing,
    langsmith_project: cfg.langsmithProject,
    agent_runtime: process.env.AGENT_RUNTIME ?? 'langgraph',
    services: {
      mongodb: Boolean(cfg.mongodbUrl),
      redis: Boolean(cfg.redisUrl),
      smtp: Boolean(cfg.smtpHost && cfg.smtpUser),
      weather: Boolean(cfg.weatherApiKey),
      groq: Boolean(cfg.groqApiKey),
      google: Boolean(cfg.googleApiKey),
      openai: Boolean(cfg.openaiApiKey),
      anthropic: Boolean(cfg.anthropicApiKey),
      tavily: Boolean(cfg.tavilyApiKey),
      langsmith: Boolean(cfg.langsmithApiKey && cfg.langsmithTracing),
    },
    note: 'Secrets are loaded from environment variables (.env.local). Restart the server after changing them.',
  });
}
