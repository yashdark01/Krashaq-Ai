import {
  kbToolKey,
  retrievalPromptFromKb,
  emptyKbRetrievalState,
  kbAlreadyRetrieved,
} from '@/lib/server/agents/kb-retrieval-helpers';

describe('kb-retrieval helpers', () => {
  it('builds stable tool keys from query', () => {
    expect(kbToolKey('PM-KISAN')).toBe('search_knowledge_base:{"query":"PM-KISAN"}');
  });

  it('detects when KB was already retrieved for the query', () => {
    const state = {
      rag_query: 'PM-KISAN eligibility',
      rag_relevant: true,
      executed_tool_keys: [kbToolKey('PM-KISAN eligibility')],
    };
    expect(kbAlreadyRetrieved(state)).toBe(true);
  });

  it('returns empty retrieval defaults', () => {
    const empty = emptyKbRetrievalState();
    expect(empty.rag_relevant).toBe(false);
    expect(empty.rag_chunks).toEqual([]);
  });

  it('formats retrieval prompt for matched and unmatched KB', () => {
    expect(retrievalPromptFromKb('[KB1] PM-KISAN\nDetails')).toContain('[KB1]');
    expect(retrievalPromptFromKb('No verified knowledge base documents matched')).toContain(
      'Do not invent'
    );
  });
});
