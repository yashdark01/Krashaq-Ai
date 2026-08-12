import {
  shouldUseWebSearch,
  buildWebSearchQuery,
  pickSearchDepth,
  pickSearchTopic,
} from '@/lib/server/services/web-search-query';

describe('web-search-query', () => {
  describe('shouldUseWebSearch', () => {
    it('triggers for scheme and market queries', () => {
      expect(shouldUseWebSearch('PM-KISAN eligibility 2026')).toBe(true);
      expect(shouldUseWebSearch('wheat MSP today mandi rate')).toBe(true);
      expect(shouldUseWebSearch('latest pest alert soybean MP')).toBe(true);
    });

    it('skips pure weather-only questions', () => {
      expect(shouldUseWebSearch('weather')).toBe(false);
      expect(shouldUseWebSearch("what's the weather")).toBe(false);
    });

    it('triggers for explain/how-to questions', () => {
      expect(shouldUseWebSearch('how to apply for drip irrigation subsidy')).toBe(true);
    });
  });

  describe('buildWebSearchQuery', () => {
    it('enriches query with location and crop', () => {
      const q = buildWebSearchQuery({
        message: 'PM-KISAN documents',
        location: 'Bhopal, MP',
        crop: 'wheat',
        language: 'hi',
      });
      expect(q).toContain('PM-KISAN');
      expect(q).toContain('Bhopal');
      expect(q).toContain('wheat');
      expect(q).toContain('India agriculture');
    });
  });

  describe('search depth and topic', () => {
    it('uses advanced depth for policy queries', () => {
      expect(pickSearchDepth('compare wheat vs rice subsidy policy')).toBe('advanced');
    });

    it('uses news topic for latest updates', () => {
      expect(pickSearchTopic('latest MSP news today')).toBe('news');
    });
  });
});
