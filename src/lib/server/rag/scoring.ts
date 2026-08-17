const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'is',
  'are',
  'was',
  'were',
  'what',
  'how',
  'when',
  'where',
  'who',
  'in',
  'on',
  'at',
  'for',
  'to',
  'of',
  'and',
  'or',
  'me',
  'my',
  'i',
  'tell',
  'about',
  'kya',
  'kaise',
  'hai',
  'ke',
  'ki',
  'ka',
  'se',
  'mein',
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s\u0900-\u097F-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

export function keywordScore(query: string, title: string, content: string, tags: string[] = []) {
  const qTokens = tokenize(query);
  if (!qTokens.length) return 0;

  const titleTokens = new Set(tokenize(title));
  const contentTokens = tokenize(content);
  const tagTokens = new Set(tags.map((t) => t.toLowerCase()));

  let score = 0;
  for (const token of qTokens) {
    if (titleTokens.has(token)) score += 4;
    if (tagTokens.has(token)) score += 3;
    const contentHits = contentTokens.filter((t) => t === token || t.includes(token)).length;
    score += Math.min(contentHits, 3);
  }

  return score / qTokens.length;
}

export function l2Normalize(vec: number[]): number[] {
  let norm = 0;
  for (const v of vec) norm += v * v;
  norm = Math.sqrt(norm);
  if (!norm) return vec;
  return vec.map((v) => v / norm);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || !a.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/** Reciprocal Rank Fusion for two ranked lists */
export function reciprocalRankFusion<T extends { id: string }>(
  lists: Array<Array<T & { score: number }>>,
  k = 60,
  limit = 5
): Array<T & { score: number }> {
  const fused = new Map<string, T & { score: number }>();

  for (const list of lists) {
    list.forEach((item, rank) => {
      const rrf = 1 / (k + rank + 1);
      const existing = fused.get(item.id);
      if (existing) {
        existing.score += rrf;
      } else {
        fused.set(item.id, { ...item, score: rrf });
      }
    });
  }

  return [...fused.values()].sort((a, b) => b.score - a.score).slice(0, limit);
}

export function chunkText(text: string, maxLen = 550): string[] {
  const paragraphs = text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let buf = '';

  for (const para of paragraphs) {
    if ((buf + '\n\n' + para).length <= maxLen) {
      buf = buf ? `${buf}\n\n${para}` : para;
    } else {
      if (buf) chunks.push(buf);
      if (para.length <= maxLen) {
        buf = para;
      } else {
        for (let i = 0; i < para.length; i += maxLen) {
          chunks.push(para.slice(i, i + maxLen));
        }
        buf = '';
      }
    }
  }
  if (buf) chunks.push(buf);
  return chunks;
}
