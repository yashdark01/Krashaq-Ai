import { groupSessionsByDate, filterSessionsByQuery } from '@/lib/chat/session-groups';
import type { ChatSessionSummary } from '@/modules/conversation/types/message';

const base: ChatSessionSummary[] = [
  {
    session_id: '1',
    title: 'Wheat advice',
    updated_at: new Date().toISOString(),
    message_count: 2,
  },
  {
    session_id: '2',
    title: 'Weather today',
    updated_at: new Date(Date.now() - 86400000).toISOString(),
    message_count: 4,
  },
];

describe('session-groups', () => {
  it('filters sessions by query', () => {
    expect(filterSessionsByQuery(base, 'wheat')).toHaveLength(1);
    expect(filterSessionsByQuery(base, '')).toHaveLength(2);
  });

  it('groups sessions by date', () => {
    const groups = groupSessionsByDate(base);
    expect(groups.some((g) => g.label === 'Today')).toBe(true);
    expect(groups.some((g) => g.label === 'Yesterday')).toBe(true);
  });
});
