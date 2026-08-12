'use client';

import { useEffect, useState } from 'react';

export interface LLMModelOption {
  id: string;
  label: string;
  description?: string;
}

export interface LLMProviderOption {
  id: string;
  label: string;
  description: string;
  configured: boolean;
  default_model: string;
  models: LLMModelOption[];
}

interface LLMProvidersResponse {
  default_provider: string;
  fallback_chain: string[];
  providers: LLMProviderOption[];
}

interface ModelSelectorProps {
  provider: string;
  model: string;
  onProviderChange: (provider: string) => void;
  onModelChange: (model: string) => void;
  className?: string;
}

export function ModelSelector({
  provider,
  model,
  onProviderChange,
  onModelChange,
  className = '',
}: ModelSelectorProps) {
  const [data, setData] = useState<LLMProvidersResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/llm/providers')
      .then((r) => r.json())
      .then((json: LLMProvidersResponse) => {
        setData(json);
        if (!provider) {
          const configured = json.providers.find((p) => p.configured);
          const pick = configured ?? json.providers.find((p) => p.id === json.default_provider);
          if (pick) {
            onProviderChange(pick.id);
            onModelChange(pick.default_model);
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const selectedProvider = data?.providers.find((p) => p.id === provider);
  const models = selectedProvider?.models ?? [];

  if (loading) {
    return <div className={`text-xs text-muted-foreground ${className}`}>Loading models…</div>;
  }

  return (
    <div className={`flex flex-wrap gap-2 items-center ${className}`}>
      <select
        value={provider}
        onChange={(e) => {
          const next = data?.providers.find((p) => p.id === e.target.value);
          onProviderChange(e.target.value);
          if (next) onModelChange(next.default_model);
        }}
        className="text-xs rounded-md border bg-background px-2 py-1.5 min-w-[140px]"
        aria-label="AI provider"
      >
        {data?.providers.map((p) => (
          <option key={p.id} value={p.id} disabled={!p.configured}>
            {p.label}
            {!p.configured ? ' (add API key)' : ''}
          </option>
        ))}
      </select>

      <select
        value={model}
        onChange={(e) => onModelChange(e.target.value)}
        className="text-xs rounded-md border bg-background px-2 py-1.5 min-w-[160px]"
        aria-label="AI model"
        disabled={!selectedProvider?.configured}
      >
        {models.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
      </select>

      {selectedProvider && !selectedProvider.configured && (
        <span className="text-xs text-amber-600 dark:text-amber-400">
          Set {selectedProvider.id.toUpperCase()} API key in .env.local
        </span>
      )}
    </div>
  );
}
