'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface LangSmithRun {
  id: string;
  name: string;
  run_type: string;
  start_time: string;
  end_time: string | null;
  total_tokens: number;
  total_cost: number | null;
  status: string;
  error: string | null;
  latency_ms: number | null;
  app_path: string | null;
}

interface LlmRunsTableProps {
  range: string;
  enabled: boolean;
}

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  const s = status.toLowerCase();
  if (s === 'success' || s === 'completed') return 'default';
  if (s === 'error' || s === 'failed') return 'destructive';
  return 'outline';
}

function langsmithRunUrl(appPath: string | null, runId: string) {
  if (appPath) {
    return appPath.startsWith('http') ? appPath : `https://smith.langchain.com${appPath}`;
  }
  return `https://smith.langchain.com/public/${runId}/r`;
}

export function LlmRunsTable({ range, enabled }: LlmRunsTableProps) {
  const { fetchWithAuth } = useAuth();
  const [runs, setRuns] = useState<LangSmithRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setRuns([]);
      setMessage(null);
      setSelectedId(null);
      setNextCursor(null);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setMessage(null);
      setSelectedId(null);
      try {
        const res = await fetchWithAuth(`/api/admin/analytics/llm/runs?range=${range}&limit=20`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setMessage(data.detail || 'Failed to load runs');
          setRuns([]);
          return;
        }
        setRuns(data.runs ?? []);
        setMessage(data.message ?? null);
        const cursors = data.cursors as Record<string, string | null> | undefined;
        setNextCursor(cursors?.next ?? null);
      } catch {
        if (!cancelled) {
          setMessage('Failed to load runs');
          setRuns([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, range, fetchWithAuth]);

  const loadMore = async () => {
    if (!nextCursor) return;
    setLoading(true);
    try {
      const res = await fetchWithAuth(
        `/api/admin/analytics/llm/runs?range=${range}&limit=20&cursor=${encodeURIComponent(nextCursor)}`
      );
      const data = await res.json();
      if (res.ok) {
        setRuns((prev) => [...prev, ...(data.runs ?? [])]);
        const cursors = data.cursors as Record<string, string | null> | undefined;
        setNextCursor(cursors?.next ?? null);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!enabled) return null;

  const selected = runs.find((r) => r.id === selectedId) ?? null;

  return (
    <div className="mt-6 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-medium">Recent agent runs</h3>
        {loading && runs.length === 0 && (
          <span className="text-xs text-muted-foreground">Loading…</span>
        )}
      </div>

      {message && runs.length === 0 && <p className="text-sm text-muted-foreground">{message}</p>}

      {runs.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Time</th>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Type</th>
                  <th className="px-3 py-2 font-medium text-right">Tokens</th>
                  <th className="px-3 py-2 font-medium text-right">Latency</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium w-8" />
                </tr>
              </thead>
              <tbody>
                {runs.map((run) => {
                  const isSelected = selectedId === run.id;
                  return (
                    <tr
                      key={run.id}
                      className={`border-b last:border-0 cursor-pointer hover:bg-muted/30 ${
                        isSelected ? 'bg-muted/50' : ''
                      }`}
                      onClick={() => setSelectedId(isSelected ? null : run.id)}
                    >
                      <td className="px-3 py-2 whitespace-nowrap text-muted-foreground">
                        {formatTime(run.start_time)}
                      </td>
                      <td className="px-3 py-2 max-w-[180px] truncate" title={run.name}>
                        {run.name}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className="text-[10px] font-normal">
                          {run.run_type}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {run.total_tokens.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                        {run.latency_ms !== null ? `${run.latency_ms}ms` : '—'}
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={statusVariant(run.status)} className="text-[10px]">
                          {run.status}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {isSelected ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selected && (
        <div className="rounded-lg border bg-muted/20 p-4 space-y-3 text-sm">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="font-medium">{selected.name}</p>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">{selected.id}</p>
            </div>
            <a
              href={langsmithRunUrl(selected.app_path, selected.id)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              Open in LangSmith <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <p className="text-muted-foreground">Started</p>
              <p>{formatTime(selected.start_time)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Tokens</p>
              <p>{selected.total_tokens.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Est. cost</p>
              <p>{selected.total_cost !== null ? `$${selected.total_cost.toFixed(4)}` : '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Latency</p>
              <p>{selected.latency_ms !== null ? `${selected.latency_ms}ms` : '—'}</p>
            </div>
          </div>
          {selected.error && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-xs font-medium text-destructive mb-1">Error</p>
              <pre className="text-xs whitespace-pre-wrap break-words text-destructive/90">
                {selected.error}
              </pre>
            </div>
          )}
        </div>
      )}

      {nextCursor && (
        <Button type="button" variant="outline" size="sm" onClick={loadMore} disabled={loading}>
          {loading ? 'Loading…' : 'Load more runs'}
        </Button>
      )}

      {!loading && runs.length === 0 && !message && (
        <p className="text-sm text-muted-foreground">No agent runs in this time window yet.</p>
      )}
    </div>
  );
}
