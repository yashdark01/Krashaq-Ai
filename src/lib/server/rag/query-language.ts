import { getConfig } from '@/lib/server/config';

export type QueryLanguage = 'en' | 'hi' | 'hinglish';

const DEVANAGARI = /[\u0900-\u097F]/;

const HINGLISH_MARKERS = [
  'kya',
  'kaise',
  'kaun',
  'hai',
  'hain',
  'mera',
  'meri',
  'aaj',
  'paani',
  'fasal',
  'mein',
  'kab',
  'karni',
  'chahiye',
  'yojana',
  'gehu',
  'buai',
];

/** Append English farming terms so Hindi/Hinglish queries match English KB embeddings. */
const QUERY_GLOSSARY: Array<[RegExp, string]> = [
  [/pm[\s-]*kisan|kisan samman|kisan yojana/gi, 'PM-KISAN scheme farmer income support eligibility'],
  [/yojana/gi, 'scheme government program'],
  [/eligible|yogya|patrata/gi, 'eligible eligibility landholding farmer family'],
  [/gehu|gahu/gi, 'wheat rabi crop'],
  [/buai|bovai/gi, 'sowing planting window'],
  [/madhya pradesh|mp mein|mp/gi, 'Madhya Pradesh MP'],
  [/sinchai|paani|sinche/gi, 'irrigation drip water'],
  [/keede|kit|pest|rog/gi, 'pest disease rust semilooper whitefly'],
  [/semilooper/gi, 'semilooper defoliation soybean pest'],
  [/soybean|soya/gi, 'soybean crop pest IPM'],
  [/drip|emitter|filter/gi, 'drip irrigation emitter filter maintenance'],
  [/6000|chhah hazar|₹/gi, '6000 rupees benefit installment'],
];

export function detectQueryLanguage(query: string): QueryLanguage {
  if (DEVANAGARI.test(query)) return 'hi';
  const lower = query.toLowerCase();
  if (HINGLISH_MARKERS.some((w) => lower.includes(w))) return 'hinglish';
  return 'en';
}

export function isIndicQuery(query: string): boolean {
  const lang = detectQueryLanguage(query);
  return lang === 'hi' || lang === 'hinglish';
}

export function expandQueryForRetrieval(query: string): string {
  const trimmed = query.trim();
  if (!trimmed) return trimmed;

  const additions = new Set<string>();
  for (const [pattern, expansion] of QUERY_GLOSSARY) {
    if (pattern.test(trimmed)) {
      for (const term of expansion.split(/\s+/)) {
        additions.add(term);
      }
    }
  }

  if (!additions.size) return trimmed;
  return `${trimmed} ${[...additions].join(' ')}`.trim();
}

export function buildRetrievalQuery(query: string): string {
  const trimmed = query.trim();
  if (!trimmed) return trimmed;
  if (!isIndicQuery(trimmed)) return trimmed;
  return expandQueryForRetrieval(trimmed);
}

export function resolveRetrievalMinScore(query: string): number {
  const cfg = getConfig();
  if (!isIndicQuery(query)) return cfg.ragMinScore;
  return cfg.ragMinScoreHi;
}
