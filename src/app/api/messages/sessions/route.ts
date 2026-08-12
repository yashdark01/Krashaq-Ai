import { NextRequest, NextResponse } from 'next/server';
import { listSessionsForUser } from '@/lib/server/services/chat-memory';
import { requireAuth } from '@/lib/server/auth/rbac';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  try {
    const q = request.nextUrl.searchParams.get('q') ?? undefined;
    const limit = Number(request.nextUrl.searchParams.get('limit') ?? 50);
    const sessions = await listSessionsForUser(auth.user.id, limit, q);
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
