'use client';

import { Sprout } from 'lucide-react';
import { cn } from '@/lib/utils';

const PROMPTS = [
  { label: 'Aaj ka mausam kaisa hai?', value: 'Aaj ka mausam kaisa hai?' },
  { label: 'Kab paani dena chahiye?', value: 'Kab paani dena chahiye?' },
  { label: 'Gehu ki khaad kab daalein?', value: 'Gehu ki khaad kab daalein?' },
  { label: "What's the weather today?", value: "What's the weather today?" },
  { label: 'Irrigation advice for my crop', value: 'Irrigation advice for my crop' },
  { label: 'Best time to sow wheat?', value: 'Best time to sow wheat?' },
];

interface ChatEmptyStateProps {
  onSelect: (prompt: string) => void;
  userName?: string;
  className?: string;
}

export function ChatEmptyState({ onSelect, userName, className }: ChatEmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-6 py-12 text-center animate-fade-in',
        className
      )}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Sprout className="h-7 w-7" aria-hidden />
      </div>
      <h2 className="font-display text-xl font-semibold text-foreground">
        {userName ? `Namaste, ${userName.split(' ')[0]}` : 'Krashaq'}
      </h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground leading-relaxed">
        Ask about weather, irrigation, crops, or fertilizers — in Hindi, English, or Hinglish.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-2 max-w-lg">
        {PROMPTS.map(({ label, value }) => (
          <button
            key={value}
            type="button"
            onClick={() => onSelect(value)}
            className="rounded-full border border-border bg-card px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-secondary hover:border-primary/30 min-h-touch text-left"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
