import { NextResponse } from 'next/server';
import { listSessions } from '@/lib/server/services/chat-memory';

export async function GET() {
  try {
    const sessions = await listSessions(30);
    return NextResponse.json({
      items: sessions.map((s) => ({
        session_id: s.session_id,
        title: s.title,
        updated_at: s.updated_at,
        message_count: s.message_count,
      })),
    });
  } catch (error) {
    console.error('Sessions list error:', error);
    return NextResponse.json({ error: 'Failed to list sessions' }, { status: 500 });
  }
}
