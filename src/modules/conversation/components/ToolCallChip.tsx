'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ToolCallRecord } from '@/modules/conversation/types/message';

function formatToolName(tool: string) {
  return tool.replace(/_/g, ' ');
}

interface ToolCallChipProps {
  call: ToolCallRecord;
}

export function ToolCallChip({ call }: ToolCallChipProps) {
  const [open, setOpen] = useState(false);
  const isRunning = call.status === 'running';

  return (
    <div className="rounded-lg border border-border/80 bg-muted/30 text-xs overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left hover:bg-muted/50 transition-colors"
      >
        {open ? (
          <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
        )}
        <Wrench className="h-3 w-3 shrink-0 text-primary" />
        <span className="font-medium capitalize">{formatToolName(call.tool)}</span>
        {isRunning && <span className="ml-auto text-muted-foreground animate-pulse">Running…</span>}
        {call.duration_ms != null && call.status === 'done' && (
          <span className="ml-auto text-muted-foreground">{call.duration_ms}ms</span>
        )}
      </button>
      {open && (
        <div className="border-t border-border/60 px-2.5 py-2 space-y-2 text-muted-foreground">
          {Object.keys(call.input).length > 0 && (
            <div>
              <p className="font-medium text-foreground/80 mb-0.5">Input</p>
              <pre className="whitespace-pre-wrap break-words font-mono text-[10px] leading-relaxed">
                {JSON.stringify(call.input, null, 2)}
              </pre>
            </div>
          )}
          {call.output && (
            <div>
              <p className="font-medium text-foreground/80 mb-0.5">Output</p>
              <pre
                className={cn(
                  'whitespace-pre-wrap break-words font-mono text-[10px] leading-relaxed max-h-32 overflow-y-auto'
                )}
              >
                {call.output}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ToolCallListProps {
  calls: ToolCallRecord[];
}

export function ToolCallList({ calls }: ToolCallListProps) {
  if (!calls.length) return null;
  return (
    <div className="space-y-1.5 mb-2">
      {calls.map((call, i) => (
        <ToolCallChip key={`${call.tool}-${i}`} call={call} />
      ))}
    </div>
  );
}
