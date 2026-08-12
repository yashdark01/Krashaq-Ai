import { getConfig } from '@/lib/server/config';

export interface LangSmithStats {
  configured: boolean;
  message?: string;
  run_count?: number;
  total_tokens?: number;
  total_cost?: number;
  latency_avg?: number;
  error_rate?: number;
}

export interface LangSmithRunSummary {
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

export interface LangSmithRunsResult {
  configured: boolean;
  message?: string;
  runs: LangSmithRunSummary[];
  cursors?: Record<string, string | null>;
}

export function rangeToDates(range: string) {
  const end = new Date();
  const start = new Date();
  if (range === '24h') start.setHours(start.getHours() - 24);
  else if (range === '30d') start.setDate(start.getDate() - 30);
  else start.setDate(start.getDate() - 7);
  return { start, end };
}

function langsmithHeaders(apiKey: string) {
  return {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
  };
}

function langsmithEndpoint() {
  const cfg = getConfig();
  return cfg.langsmithEndpoint || 'https://api.smith.langchain.com';
}

function mapRun(raw: Record<string, unknown>): LangSmithRunSummary {
  const start = raw.start_time ? new Date(String(raw.start_time)).getTime() : null;
  const end = raw.end_time ? new Date(String(raw.end_time)).getTime() : null;
  const latency_ms =
    start !== null && end !== null && end >= start ? end - start : null;

  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? 'run'),
    run_type: String(raw.run_type ?? 'chain'),
    start_time: String(raw.start_time ?? ''),
    end_time: raw.end_time ? String(raw.end_time) : null,
    total_tokens: Number(raw.total_tokens ?? 0),
    total_cost:
      raw.total_cost !== undefined && raw.total_cost !== null
        ? Number(raw.total_cost)
        : null,
    status: String(raw.status ?? 'unknown'),
    error: raw.error ? String(raw.error) : null,
    latency_ms,
    app_path: raw.app_path ? String(raw.app_path) : null,
  };
}

export async function getLangSmithStats(range = '7d'): Promise<LangSmithStats> {
  const cfg = getConfig();
  if (!cfg.langsmithApiKey) {
    return { configured: false, message: 'Set LANGCHAIN_API_KEY to enable LLM analytics' };
  }

  const { start, end } = rangeToDates(range);
  const endpoint = langsmithEndpoint();

  try {
    const res = await fetch(`${endpoint}/api/v1/runs/stats`, {
      method: 'POST',
      headers: langsmithHeaders(cfg.langsmithApiKey),
      body: JSON.stringify({
        session: [{ name: cfg.langsmithProject }],
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        is_root: true,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return { configured: true, message: `LangSmith API error: ${res.status}` };
    }

    const data = (await res.json()) as {
      run_count?: number;
      total_tokens?: number;
      total_cost?: number;
      latency_avg?: number;
      error_rate?: number;
    };

    return {
      configured: true,
      run_count: data.run_count ?? 0,
      total_tokens: data.total_tokens ?? 0,
      total_cost: data.total_cost ?? 0,
      latency_avg: data.latency_avg ?? 0,
      error_rate: data.error_rate ?? 0,
    };
  } catch (error) {
    return {
      configured: true,
      message: error instanceof Error ? error.message : 'LangSmith fetch failed',
    };
  }
}

export async function getLangSmithRuns(
  range = '7d',
  limit = 25,
  cursor?: string | null
): Promise<LangSmithRunsResult> {
  const cfg = getConfig();
  if (!cfg.langsmithApiKey) {
    return {
      configured: false,
      message: 'Set LANGCHAIN_API_KEY to enable LLM analytics',
      runs: [],
    };
  }

  const { start, end } = rangeToDates(range);
  const endpoint = langsmithEndpoint();

  const body: Record<string, unknown> = {
    session: [{ name: cfg.langsmithProject }],
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    is_root: true,
    limit: Math.min(Math.max(limit, 1), 50),
    order: 'desc',
    select: [
      'id',
      'name',
      'run_type',
      'start_time',
      'end_time',
      'total_tokens',
      'total_cost',
      'status',
      'error',
      'app_path',
    ],
  };

  if (cursor) {
    body.cursor = cursor;
  }

  try {
    const res = await fetch(`${endpoint}/api/v1/runs/query`, {
      method: 'POST',
      headers: langsmithHeaders(cfg.langsmithApiKey),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      return {
        configured: true,
        message: `LangSmith API error: ${res.status}`,
        runs: [],
      };
    }

    const data = (await res.json()) as {
      runs?: Record<string, unknown>[];
      cursors?: Record<string, string | null>;
    };

    return {
      configured: true,
      runs: (data.runs ?? []).map(mapRun),
      cursors: data.cursors,
    };
  } catch (error) {
    return {
      configured: true,
      message: error instanceof Error ? error.message : 'LangSmith fetch failed',
      runs: [],
    };
  }
}
