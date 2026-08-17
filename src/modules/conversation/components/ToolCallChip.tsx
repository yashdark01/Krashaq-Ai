'use client';

import { ChevronDown, ChevronRight, Wrench } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Marker, MarkerContent, MarkerIcon } from '@/components/ui/marker';
import { Spinner } from '@/components/ui/spinner';
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
    <div className="overflow-hidden rounded-lg">
      <Marker
        variant="border"
        role={isRunning ? 'status' : undefined}
        className="cursor-pointer hover:bg-muted/30"
        onClick={() => setOpen((v) => !v)}
      >
        <MarkerIcon>
          {isRunning ? <Spinner className="size-3.5 text-primary" /> : <Wrench className="size-3.5 text-primary" />}
        </MarkerIcon>
        <MarkerContent className={cn('flex flex-1 items-center gap-2 capitalize', isRunning && 'text-shimmer')}>
          {open ? (
            <ChevronDown className="size-3 shrink-0" aria-hidden />
          ) : (
            <ChevronRight className="size-3 shrink-0" aria-hidden />
          )}
          <span className="font-medium">{formatToolName(call.tool)}</span>
          {isRunning && <span className="ml-auto text-muted-foreground">Running…</span>}
          {call.duration_ms != null && call.status === 'done' && (
            <span className="ml-auto text-muted-foreground">{call.duration_ms}ms</span>
          )}
        </MarkerContent>
      </Marker>

      {open && (
        <div className="space-y-2 border-b border-border/60 bg-muted/20 px-4 py-2 text-xs text-muted-foreground">
          {Object.keys(call.input).length > 0 && (
            <div>
              <p className="mb-0.5 font-medium text-foreground/80">Input</p>
              <pre className="whitespace-pre-wrap break-words font-mono text-[10px] leading-relaxed">
                {JSON.stringify(call.input, null, 2)}
              </pre>
            </div>
          )}
          {call.output && (
            <div>
              <p className="mb-0.5 font-medium text-foreground/80">Output</p>
              <pre className="max-h-32 overflow-y-auto whitespace-pre-wrap break-words font-mono text-[10px] leading-relaxed">
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
    <div className="space-y-0">
      {calls.map((call, i) => (
        <ToolCallChip key={`${call.tool}-${i}`} call={call} />
      ))}
    </div>
  );
}
