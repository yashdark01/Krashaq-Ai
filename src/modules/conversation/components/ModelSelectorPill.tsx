'use client';

import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface LLMModelOption {
  id: string;
  label: string;
}

export interface LLMProviderOption {
  id: string;
  label: string;
  configured: boolean;
  default_model: string;
  models: LLMModelOption[];
}

interface ModelSelectorPillProps {
  provider: string;
  model: string;
  onProviderChange: (provider: string) => void;
  onModelChange: (model: string) => void;
  className?: string;
}

export function ModelSelectorPill({
  provider,
  model,
  onProviderChange,
  onModelChange,
  className,
}: ModelSelectorPillProps) {
  const [providers, setProviders] = useState<LLMProviderOption[]>([]);
  const [defaultProvider, setDefaultProvider] = useState('groq');

  useEffect(() => {
    fetch('/api/llm/providers')
      .then((r) => r.json())
      .then((json) => {
        setProviders(json.providers ?? []);
        setDefaultProvider(json.default_provider ?? 'groq');
      })
      .catch(console.error);
  }, []);

  const selected = providers.find((p) => p.id === provider);
  const modelLabel =
    selected?.models.find((m) => m.id === model)?.label ?? model.split('-').slice(0, 2).join(' ');

  const configured = selected?.configured ?? true;

  // Avoid duplicate names in display (e.g., "Google Gemini Gemini 3.6 Flash")
  const displayName = modelLabel.includes(selected?.label || '')
    ? modelLabel
    : `${selected?.label ?? provider} · ${modelLabel}`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn('h-7 gap-1 rounded-full px-2.5 text-xs font-normal', className)}
          aria-label="Select AI model"
        >
          <span
            className={cn('h-1.5 w-1.5 rounded-full', configured ? 'bg-primary' : 'bg-brand-clay')}
          />
          {displayName}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 max-h-80 overflow-y-auto">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Recommended</DropdownMenuLabel>
        {providers
          .filter((p) => p.configured)
          .slice(0, 4)
          .map((p) => (
            <DropdownMenuItem
              key={p.id}
              onClick={() => {
                onProviderChange(p.id);
                onModelChange(p.default_model);
              }}
              className={cn(provider === p.id && 'bg-accent')}
            >
              <span className="font-medium">{p.label}</span>
              <span className="ml-auto text-xs text-muted-foreground truncate max-w-[100px]">
                {p.default_model.split('-')[0]}
              </span>
            </DropdownMenuItem>
          ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          All providers
        </DropdownMenuLabel>
        {providers.map((p) => (
          <div key={p.id}>
            <DropdownMenuItem
              disabled={!p.configured}
              onClick={() => {
                onProviderChange(p.id);
                onModelChange(p.default_model);
              }}
              className={cn('font-medium', provider === p.id && 'bg-accent')}
            >
              {p.label}
              {!p.configured && (
                <span className="ml-auto text-[10px] text-muted-foreground">No key</span>
              )}
            </DropdownMenuItem>
            {provider === p.id &&
              p.models.map((m) => (
                <DropdownMenuItem
                  key={m.id}
                  inset
                  onClick={() => onModelChange(m.id)}
                  className={cn('text-xs', model === m.id && 'bg-accent')}
                >
                  {m.label}
                </DropdownMenuItem>
              ))}
          </div>
        ))}
        {!providers.length && <DropdownMenuItem disabled>Loading…</DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
