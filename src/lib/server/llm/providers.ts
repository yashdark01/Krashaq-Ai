export type LLMProviderId =
  | 'groq'
  | 'openai'
  | 'anthropic'
  | 'gemini'
  | 'xai'
  | 'deepseek'
  | 'mistral'
  | 'ollama';

export interface LLMModelOption {
  id: string;
  label: string;
  description?: string;
}

export interface LLMProviderDefinition {
  id: LLMProviderId;
  label: string;
  description: string;
  envKey: string;
  models: LLMModelOption[];
  defaultModel: string;
}

export const LLM_PROVIDERS: LLMProviderDefinition[] = [
  {
    id: 'groq',
    label: 'Groq',
    description: 'Fast inference — Llama, Mixtral, Gemma',
    envKey: 'groqApiKey',
    defaultModel: 'llama-3.3-70b-versatile',
    models: [
      {
        id: 'llama-3.3-70b-versatile',
        label: 'Llama 3.3 70B',
        description: 'Best general purpose',
      },
      {
        id: 'llama-3.1-8b-instant',
        label: 'Llama 3.1 8B Instant',
        description: 'Fast & lightweight',
      },
      { id: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B', description: 'Strong multilingual' },
      { id: 'gemma2-9b-it', label: 'Gemma 2 9B', description: 'Google open model on Groq' },
    ],
  },
  {
    id: 'openai',
    label: 'OpenAI',
    description: 'GPT-4o, GPT-4, o-series reasoning',
    envKey: 'openaiApiKey',
    defaultModel: 'gpt-4o-mini',
    models: [
      { id: 'gpt-4o', label: 'GPT-4o', description: 'Most capable multimodal' },
      { id: 'gpt-4o-mini', label: 'GPT-4o Mini', description: 'Fast & cost-effective' },
      { id: 'gpt-4-turbo', label: 'GPT-4 Turbo', description: 'Legacy flagship' },
      { id: 'o3-mini', label: 'o3-mini', description: 'Reasoning model' },
    ],
  },
  {
    id: 'anthropic',
    label: 'Claude (Anthropic)',
    description: 'Claude 3.5 / 3.7 Sonnet & Haiku',
    envKey: 'anthropicApiKey',
    defaultModel: 'claude-3-5-haiku-latest',
    models: [
      {
        id: 'claude-3-5-sonnet-latest',
        label: 'Claude 3.5 Sonnet',
        description: 'Balanced quality',
      },
      { id: 'claude-3-5-haiku-latest', label: 'Claude 3.5 Haiku', description: 'Fast responses' },
      { id: 'claude-3-7-sonnet-latest', label: 'Claude 3.7 Sonnet', description: 'Latest Sonnet' },
      { id: 'claude-opus-4-20250514', label: 'Claude Opus 4', description: 'Highest capability' },
    ],
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    description: 'Gemini Flash & Pro via Google AI',
    envKey: 'googleApiKey',
    defaultModel: 'gemini-3.6-flash',
    models: [
      { id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash', description: 'Default — fast & latest' },
      { id: 'gemini-flash-latest', label: 'Gemini Flash (latest)', description: 'Always current flash' },
      { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash Preview', description: 'Preview tier' },
    ],
  },
  {
    id: 'xai',
    label: 'xAI (Grok)',
    description: 'Grok models via xAI API',
    envKey: 'xaiApiKey',
    defaultModel: 'grok-2-latest',
    models: [
      { id: 'grok-2-latest', label: 'Grok 2', description: 'Latest Grok' },
      { id: 'grok-beta', label: 'Grok Beta', description: 'Experimental' },
    ],
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    description: 'DeepSeek Chat & Reasoner',
    envKey: 'deepseekApiKey',
    defaultModel: 'deepseek-chat',
    models: [
      { id: 'deepseek-chat', label: 'DeepSeek Chat', description: 'General chat' },
      { id: 'deepseek-reasoner', label: 'DeepSeek Reasoner', description: 'Chain-of-thought' },
    ],
  },
  {
    id: 'mistral',
    label: 'Mistral AI',
    description: 'Mistral Large, Small, Codestral',
    envKey: 'mistralApiKey',
    defaultModel: 'mistral-small-latest',
    models: [
      { id: 'mistral-large-latest', label: 'Mistral Large', description: 'Flagship' },
      { id: 'mistral-small-latest', label: 'Mistral Small', description: 'Fast & cheap' },
      { id: 'codestral-latest', label: 'Codestral', description: 'Code-focused' },
    ],
  },
  {
    id: 'ollama',
    label: 'Ollama (Local)',
    description: 'Self-hosted models on your machine',
    envKey: 'ollamaBaseUrl',
    defaultModel: 'llama3.1:8b',
    models: [
      { id: 'llama3.1:8b', label: 'Llama 3.1 8B', description: 'Local default' },
      { id: 'mistral:7b', label: 'Mistral 7B', description: 'Local Mistral' },
      { id: 'gemma2:9b', label: 'Gemma 2 9B', description: 'Local Gemma' },
    ],
  },
];

export function getProviderDefinition(id: string): LLMProviderDefinition | undefined {
  return LLM_PROVIDERS.find((p) => p.id === id);
}

export function isValidProviderId(id: string): id is LLMProviderId {
  return LLM_PROVIDERS.some((p) => p.id === id);
}
