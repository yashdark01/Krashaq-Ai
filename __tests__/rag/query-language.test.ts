import {
  buildRetrievalQuery,
  detectQueryLanguage,
  expandQueryForRetrieval,
  isIndicQuery,
  resolveRetrievalMinScore,
} from '@/lib/server/rag/query-language';

describe('query-language', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, RAG_MIN_SCORE: '0.65', RAG_MIN_SCORE_HI: '0.55' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('detects Hindi from Devanagari script', () => {
    expect(detectQueryLanguage('गेहू की बुआई')).toBe('hi');
    expect(isIndicQuery('गेहू की बुआई')).toBe(true);
  });

  it('detects Hinglish from romanized markers', () => {
    expect(detectQueryLanguage('PM KISAN yojana kya hai')).toBe('hinglish');
    expect(detectQueryLanguage('MP mein gehu ki buai kab karni chahiye?')).toBe('hinglish');
  });

  it('expands Hindi/Hinglish queries with English farming terms', () => {
    const expanded = expandQueryForRetrieval('MP mein gehu ki buai kab karni chahiye?');
    expect(expanded).toContain('wheat');
    expect(expanded).toContain('sowing');
    expect(expanded).toContain('Madhya Pradesh');
  });

  it('leaves English queries unchanged when no glossary match', () => {
    expect(buildRetrievalQuery('What is the capital of France?')).toBe(
      'What is the capital of France?'
    );
  });

  it('uses lower min score for indic queries', () => {
    expect(resolveRetrievalMinScore('What is PM-KISAN?')).toBe(0.65);
    expect(resolveRetrievalMinScore('PM KISAN yojana kya hai')).toBe(0.55);
  });
});
