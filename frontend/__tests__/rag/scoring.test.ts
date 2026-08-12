import { keywordScore, tokenize, reciprocalRankFusion } from '@/lib/server/rag/scoring';

describe('rag scoring', () => {
  it('tokenizes query words', () => {
    const tokens = tokenize('What is PM-KISAN scheme?');
    expect(tokens.some((t) => t.includes('kisan') || t.includes('pm'))).toBe(true);
  });

  it('scores title matches higher', () => {
    const high = keywordScore(
      'PM-KISAN eligibility',
      'PM-KISAN Scheme Overview',
      'Income support for farmers',
      ['pm-kisan']
    );
    const low = keywordScore(
      'PM-KISAN eligibility',
      'Unrelated document',
      'Nothing here',
      []
    );
    expect(high).toBeGreaterThan(low);
  });

  it('fuses ranked lists with RRF', () => {
    const fused = reciprocalRankFusion([
      [
        { id: 'a', score: 1 },
        { id: 'b', score: 0.5 },
      ],
      [
        { id: 'b', score: 1 },
        { id: 'c', score: 0.5 },
      ],
    ]);
    expect(fused[0].id).toBe('b');
  });
});
