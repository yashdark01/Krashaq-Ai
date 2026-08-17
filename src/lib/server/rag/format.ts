import type { KbChunkRecord, KbCitation } from '@/lib/server/rag/types';

export function formatKbContextForPrompt(chunks: KbChunkRecord[], citations: KbCitation[]): string {
  if (!chunks.length) {
    return 'No verified knowledge base documents matched this query.';
  }

  return chunks
    .map((c, i) => {
      const cite = citations[i];
      return `[KB${i + 1}] ${c.title} (id: ${cite?.doc_id ?? c.doc_id})\n${c.content}`;
    })
    .join('\n\n');
}
