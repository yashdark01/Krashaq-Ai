import { ragRequestCache } from '@/lib/server/rag/request-cache';

describe('ragRequestCache', () => {
  beforeEach(() => {
    ragRequestCache.clear();
  });

  it('deduplicates queries within a turn', () => {
    const result = {
      chunks: [],
      citations: [],
      hasRelevant: false,
      context: 'test',
    };
    ragRequestCache.set('PM-KISAN scheme', result);
    expect(ragRequestCache.get('pm-kisan scheme')).toEqual(result);
    expect(ragRequestCache.has('  PM-KISAN   scheme  ')).toBe(true);
  });
});
