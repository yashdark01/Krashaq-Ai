'use client';

import { BookOpen, ExternalLink } from 'lucide-react';
import type { MessageCitation } from '@/modules/conversation/types/message';

interface CitationListProps {
  citations: MessageCitation[];
}

export function CitationList({ citations }: CitationListProps) {
  if (!citations.length) return null;

  const unique = citations.filter(
    (c, i, arr) =>
      arr.findIndex(
        (x) =>
          (x.doc_id && c.doc_id && x.doc_id === c.doc_id) ||
          (x.title === c.title && x.index === c.index)
      ) === i
  );

  return (
    <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2 text-xs">
      <p className="flex items-center gap-1.5 font-medium text-foreground/90 mb-1.5">
        <BookOpen className="h-3 w-3 text-primary" />
        Sources
      </p>
      <ul className="space-y-1.5">
        {unique.map((cite) => (
          <li key={`${cite.index}-${cite.title}`} className="text-muted-foreground">
            <span className="font-medium text-foreground/80">
              [{cite.source === 'kb' ? 'KB' : 'Web'}
              {cite.index}] {cite.title}
            </span>
            {cite.url ? (
              <a
                href={cite.url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1 inline-flex items-center gap-0.5 text-primary hover:underline"
              >
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            ) : null}
            <p className="mt-0.5 leading-relaxed">{cite.snippet}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
