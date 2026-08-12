'use client';

import { ArrowUp, Square } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ModelSelectorPill } from './ModelSelectorPill';

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onStop?: () => void;
  isStreaming?: boolean;
  disabled?: boolean;
  provider: string;
  model: string;
  onProviderChange: (p: string) => void;
  onModelChange: (m: string) => void;
  placeholder?: string;
}

export function ChatComposer({
  value,
  onChange,
  onSend,
  onStop,
  isStreaming,
  disabled,
  provider,
  model,
  onProviderChange,
  onModelChange,
  placeholder = 'Ask about weather, irrigation, crops…',
}: ChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, []);

  useEffect(() => {
    resize();
  }, [value, resize]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming && value.trim()) onSend();
    }
  };

  return (
    <div className="border-t bg-background/95 backdrop-blur px-4 py-3 md:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-2">
          <ModelSelectorPill
            provider={provider}
            model={model}
            onProviderChange={onProviderChange}
            onModelChange={onModelChange}
          />
        </div>
        <div
          className={cn(
            'flex items-end gap-2 rounded-2xl border bg-card px-3 py-2 shadow-sm',
            'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ring-offset-background'
          )}
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled && !isStreaming}
            rows={1}
            className="flex-1 resize-none bg-transparent py-2 text-sm leading-relaxed placeholder:text-muted-foreground focus:outline-none disabled:opacity-50 min-h-[40px] max-h-[200px]"
            aria-label="Message input"
          />
          {isStreaming ? (
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="h-8 w-8 shrink-0 rounded-lg"
              onClick={onStop}
              aria-label="Stop generating"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </Button>
          ) : (
            <Button
              type="button"
              size="icon"
              className="h-8 w-8 shrink-0 rounded-lg"
              onClick={onSend}
              disabled={!value.trim() || disabled}
              aria-label="Send message"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          )}
        </div>
        <p className="mt-1.5 text-center text-[10px] text-muted-foreground hidden sm:block">
          Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
