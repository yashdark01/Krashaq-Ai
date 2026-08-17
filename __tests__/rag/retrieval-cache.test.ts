import { ragCacheKey } from '@/lib/server/rag/retrieval-cache';

describe('rag retrieval cache', () => {
  it('builds stable cache keys', () => {
    expect(ragCacheKey('PM-KISAN eligibility', 5)).toBe(
      ragCacheKey('  pm-kisan   eligibility  ', 5)
    );
    expect(ragCacheKey('test', 5)).toContain('rag:v2:');
  });
});
