import type { ChatSessionSummary } from '@/modules/conversation/types/message';

export type SessionGroupLabel = 'Today' | 'Yesterday' | 'Previous 7 days' | 'Older';

export interface GroupedSessions {
  label: SessionGroupLabel;
  sessions: ChatSessionSummary[];
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function groupSessionsByDate(
  sessions: ChatSessionSummary[],
  now = new Date()
): GroupedSessions[] {
  const today = startOfDay(now).getTime();
  const yesterday = today - 86400000;
  const weekAgo = today - 7 * 86400000;

  const buckets: Record<SessionGroupLabel, ChatSessionSummary[]> = {
    Today: [],
    Yesterday: [],
    'Previous 7 days': [],
    Older: [],
  };

  for (const s of sessions) {
    const t = startOfDay(new Date(s.updated_at)).getTime();
    if (t >= today) buckets.Today.push(s);
    else if (t >= yesterday) buckets.Yesterday.push(s);
    else if (t >= weekAgo) buckets['Previous 7 days'].push(s);
    else buckets.Older.push(s);
  }

  return (Object.keys(buckets) as SessionGroupLabel[])
    .filter((label) => buckets[label].length > 0)
    .map((label) => ({ label, sessions: buckets[label] }));
}

export function filterSessionsByQuery(
  sessions: ChatSessionSummary[],
  query: string
): ChatSessionSummary[] {
  const q = query.trim().toLowerCase();
  if (!q) return sessions;
  return sessions.filter((s) => s.title.toLowerCase().includes(q));
}
