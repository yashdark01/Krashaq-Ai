import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatGroq } from '@langchain/groq';
import { ChatMistralAI } from '@langchain/mistralai';
import { ChatOllama } from '@langchain/ollama';
import { ChatOpenAI } from '@langchain/openai';
import { getConfig } from '@/lib/server/config';
import {
  getProviderDefinition,
  isValidProviderId,
  LLM_PROVIDERS,
  type LLMProviderId,
} from '@/lib/server/llm/providers';

export interface LLMInstance {
  llm: BaseChatModel;
  provider: LLMProviderId;
  model: string;
}

export interface LLMSelection {
  provider?: string;
  model?: string;
}

function providerIsConfigured(providerId: LLMProviderId): boolean {
  const config = getConfig();
  switch (providerId) {
    case 'groq':
      return Boolean(config.groqApiKey);
    case 'openai':
      return Boolean(config.openaiApiKey);
    case 'anthropic':
      return Boolean(config.anthropicApiKey);
    case 'gemini':
      return Boolean(config.googleApiKey);
    case 'xai':
      return Boolean(config.xaiApiKey);
    case 'deepseek':
      return Boolean(config.deepseekApiKey);
    case 'mistral':
      return Boolean(config.mistralApiKey);
    case 'ollama':
      return Boolean(config.ollamaBaseUrl);
    default:
      return false;
  }
}

function resolveModel(providerId: LLMProviderId, model?: string): string {
  const def = getProviderDefinition(providerId);
  if (!def) throw new Error(`Unknown provider: ${providerId}`);
  if (model && def.models.some((m) => m.id === model)) return model;
  if (model) return model; // allow custom model ids (e.g. new Ollama tags)
  const config = getConfig();
  const envModel =
    providerId === 'groq'
      ? config.groqModel
      : providerId === 'gemini'
        ? config.geminiModel
        : undefined;
  return envModel ?? def.defaultModel;
}

export function createLLM(providerId: LLMProviderId, model?: string): LLMInstance {
  const config = getConfig();
  const resolvedModel = resolveModel(providerId, model);
  const temperature = 0.4;

  switch (providerId) {
    case 'groq':
      if (!config.groqApiKey) throw new Error('GROQ_API_KEY not configured');
      return {
        provider: 'groq',
        model: resolvedModel,
        llm: new ChatGroq({
          apiKey: config.groqApiKey,
          model: resolvedModel,
          temperature,
        }),
      };
    case 'openai':
      if (!config.openaiApiKey) throw new Error('OPENAI_API_KEY not configured');
      return {
        provider: 'openai',
        model: resolvedModel,
        llm: new ChatOpenAI({
          apiKey: config.openaiApiKey,
          model: resolvedModel,
          temperature,
        }),
      };
    case 'anthropic':
      if (!config.anthropicApiKey) throw new Error('ANTHROPIC_API_KEY not configured');
      return {
        provider: 'anthropic',
        model: resolvedModel,
        llm: new ChatAnthropic({
          apiKey: config.anthropicApiKey,
          model: resolvedModel,
          temperature,
        }),
      };
    case 'gemini':
      if (!config.googleApiKey) throw new Error('GOOGLE_API_KEY not configured');
      return {
        provider: 'gemini',
        model: resolvedModel,
        llm: new ChatGoogleGenerativeAI({
          apiKey: config.googleApiKey,
          model: resolvedModel,
          temperature,
        }),
      };
    case 'xai':
      if (!config.xaiApiKey) throw new Error('XAI_API_KEY not configured');
      return {
        provider: 'xai',
        model: resolvedModel,
        llm: new ChatOpenAI({
          apiKey: config.xaiApiKey,
          model: resolvedModel,
          temperature,
          configuration: { baseURL: 'https://api.x.ai/v1' },
        }),
      };
    case 'deepseek':
      if (!config.deepseekApiKey) throw new Error('DEEPSEEK_API_KEY not configured');
      return {
        provider: 'deepseek',
        model: resolvedModel,
        llm: new ChatOpenAI({
          apiKey: config.deepseekApiKey,
          model: resolvedModel,
          temperature,
          configuration: { baseURL: 'https://api.deepseek.com/v1' },
        }),
      };
    case 'mistral':
      if (!config.mistralApiKey) throw new Error('MISTRAL_API_KEY not configured');
      return {
        provider: 'mistral',
        model: resolvedModel,
        llm: new ChatMistralAI({
          apiKey: config.mistralApiKey,
          model: resolvedModel,
          temperature,
        }),
      };
    case 'ollama':
      return {
        provider: 'ollama',
        model: resolvedModel,
        llm: new ChatOllama({
          baseUrl: config.ollamaBaseUrl,
          model: resolvedModel,
          temperature,
        }),
      };
    default:
      throw new Error(`Unsupported provider: ${providerId}`);
  }
}

export function getProviderChain(selection?: LLMSelection): LLMProviderId[] {
  const config = getConfig();
  const requested = selection?.provider?.trim().toLowerCase();

  const asConfigured = (ids: string[]): LLMProviderId[] =>
    ids.filter((id): id is LLMProviderId => isValidProviderId(id) && providerIsConfigured(id));

  if (requested && isValidProviderId(requested)) {
    return asConfigured([requested, ...config.llmFallbackChain.filter((p) => p !== requested)]);
  }

  return asConfigured([config.defaultLlmProvider, ...config.llmFallbackChain]);
}

export function resolveLLM(selection?: LLMSelection): LLMInstance | null {
  const chain = getProviderChain(selection);
  if (!chain.length) return null;

  const primary = chain[0];
  try {
    return createLLM(primary, selection?.model);
  } catch {
    for (const fallback of chain.slice(1)) {
      try {
        return createLLM(fallback);
      } catch {
        continue;
      }
    }
    return null;
  }
}

export function listProvidersForApi() {
  const config = getConfig();
  return {
    default_provider: config.defaultLlmProvider,
    fallback_chain: config.llmFallbackChain,
    providers: LLM_PROVIDERS.map((p) => ({
      id: p.id,
      label: p.label,
      description: p.description,
      configured: providerIsConfigured(p.id),
      default_model: p.defaultModel,
      models: p.models,
    })),
  };
}
