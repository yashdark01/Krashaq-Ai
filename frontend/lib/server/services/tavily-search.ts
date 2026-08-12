import { createHash } from 'crypto';
import { getConfig } from '@/lib/server/config';
import { cacheGet, cacheSet } from '@/lib/server/cache/redis';
import {
  buildWebSearchQuery,
  pickSearchDepth,
  pickSearchTopic,
  type WebSearchQueryContext,
} from '@/lib/server/services/web-search-query';

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export interface WebSearchResponse {
  success: boolean;
  query: string;
  answer: string | null;
  results: TavilySearchResult[];
  error?: string;
}

const TAVILY_URL = 'https://api.tavily.com/search';
const CACHE_TTL_SEC = 900; // 15 min

function cacheKey(query: string, depth: string, topic: string) {
  const hash = createHash('sha256').update(`${query}|${depth}|${topic}`).digest('hex');
  return `tavily:${hash}`;
}

export function isTavilyConfigured() {
  return Boolean(getConfig().tavilyApiKey);
}

export async function searchWeb(ctx: WebSearchQueryContext): Promise<WebSearchResponse> {
  const { tavilyApiKey, tavilyMaxResults } = getConfig();
  const query = buildWebSearchQuery(ctx);
  const search_depth = pickSearchDepth(ctx.message);
  const topic = pickSearchTopic(ctx.message);

  if (!tavilyApiKey) {
    return {
      success: false,
      query,
      answer: null,
      results: [],
      error: 'TAVILY_API_KEY not configured',
    };
  }

  const key = cacheKey(query, search_depth, topic);
  const cached = await cacheGet<WebSearchResponse>(key);
  if (cached) return cached;

  try {
    const res = await fetch(TAVILY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: tavilyApiKey,
        query,
        search_depth,
        topic,
        include_answer: true,
        include_raw_content: false,
        max_results: tavilyMaxResults,
        include_domains: [
          'agricoop.gov.in',
          'farmer.gov.in',
          'icar.org.in',
          'krishijagran.com',
          'krishisewa.com',
        ],
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) {
      const text = await res.text();
      return {
        success: false,
        query,
        answer: null,
        results: [],
        error: `Tavily HTTP ${res.status}: ${text.slice(0, 200)}`,
      };
    }

    const data = (await res.json()) as {
      answer?: string;
      results?: Array<{
        title?: string;
        url?: string;
        content?: string;
        score?: number;
      }>;
    };

    const response: WebSearchResponse = {
      success: true,
      query,
      answer: data.answer ?? null,
      results: (data.results ?? []).map((r) => ({
        title: r.title ?? 'Untitled',
        url: r.url ?? '',
        content: r.content ?? '',
        score: r.score ?? 0,
      })),
    };

    await cacheSet(key, response, CACHE_TTL_SEC);
    return response;
  } catch (error) {
    return {
      success: false,
      query,
      answer: null,
      results: [],
      error: error instanceof Error ? error.message : 'Tavily search failed',
    };
  }
}

export function formatWebSearchForPrompt(data: WebSearchResponse): string {
  if (!data.success) {
    return `Web search unavailable: ${data.error ?? 'unknown error'}`;
  }

  const lines: string[] = [`Web search query: ${data.query}`];

  if (data.answer) {
    lines.push('', 'Summary from web:', data.answer);
  }

  if (data.results.length > 0) {
    lines.push('', 'Sources:');
    for (const [i, r] of data.results.entries()) {
      lines.push(
        `[${i + 1}] ${r.title}`,
        r.url,
        r.content.slice(0, 600) + (r.content.length > 600 ? '…' : '')
      );
    }
    lines.push(
      '',
      'Use these sources in your answer. Cite source numbers. If uncertain, say so — do not invent scheme amounts or dates.'
    );
  } else {
    lines.push('', 'No web results found. Answer from general knowledge and say verification is needed.');
  }

  return lines.join('\n');
}

export function webSearchCitations(data: WebSearchResponse) {
  return data.results.map((r, i) => ({
    index: i + 1,
    title: r.title,
    url: r.url,
    snippet: r.content.slice(0, 200),
  }));
}
