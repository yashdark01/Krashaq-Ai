'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Brain, Zap, DollarSign, Clock, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { LlmRunsTable } from './LlmRunsTable';

interface LlmStats {
  configured: boolean;
  message?: string;
  range?: string;
  run_count?: number;
  total_tokens?: number;
  total_cost?: number;
  latency_avg?: number;
  error_rate?: number;
}

export function LlmAnalyticsSection() {
  const { fetchWithAuth } = useAuth();
  const [stats, setStats] = useState<LlmStats | null>(null);
  const [range, setRange] = useState('7d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetchWithAuth(`/api/admin/analytics/llm?range=${range}`);
        if (res.ok && !cancelled) {
          setStats(await res.json());
        }
      } catch (e) {
        console.error('LLM analytics fetch failed', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchWithAuth, range]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            LLM Analytics (LangSmith)
          </CardTitle>
          <CardDescription>Token usage, cost, and latency for Krashaq AI runs</CardDescription>
        </div>
        <div className="flex gap-1">
          {(['24h', '7d', '30d'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`px-2 py-1 text-xs rounded-md border ${
                range === r ? 'bg-primary text-primary-foreground border-primary' : 'border-border'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading LLM stats…</p>
        ) : !stats?.configured ? (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground mb-1">LangSmith not configured</p>
            <p>
              Set <code className="text-xs">LANGCHAIN_API_KEY</code> and{' '}
              <code className="text-xs">LANGCHAIN_TRACING_V2=true</code> in environment variables to
              trace chat runs and see usage here.
            </p>
            {stats?.message && <p className="mt-2 text-xs">{stats.message}</p>}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <StatCard icon={Zap} label="Agent runs" value={String(stats.run_count ?? 0)} />
            <StatCard
              icon={Brain}
              label="Total tokens"
              value={(stats.total_tokens ?? 0).toLocaleString()}
            />
            <StatCard
              icon={DollarSign}
              label="Est. cost (USD)"
              value={`$${(stats.total_cost ?? 0).toFixed(4)}`}
            />
            <StatCard
              icon={Clock}
              label="Avg latency"
              value={`${((stats.latency_avg ?? 0) * 1000).toFixed(0)}ms`}
            />
            <StatCard
              icon={AlertTriangle}
              label="Error rate"
              value={`${((stats.error_rate ?? 0) * 100).toFixed(1)}%`}
            />
          </div>
        )}
        {stats?.configured && (
          <div className="mt-3 flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {range} window
            </Badge>
            <a
              href="https://smith.langchain.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline"
            >
              Open LangSmith →
            </a>
          </div>
        )}
        <LlmRunsTable range={range} enabled={Boolean(stats?.configured)} />
      </CardContent>
    </Card>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Zap;
  label: string;
  value: string;
}) {
  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}
