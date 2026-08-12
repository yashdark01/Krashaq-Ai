import { NextRequest, NextResponse } from 'next/server';
import { searchMessagesForUser } from '@/lib/server/services/chat-memory';
import { requireAuth } from '@/lib/server/auth/rbac';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  const q = request.nextUrl.searchParams.get('q') ?? '';
  if (!q.trim()) {
    return NextResponse.json({ items: [] });
  }

  try {
    const limit = Number(request.nextUrl.searchParams.get('limit') ?? 20);
    const items = await searchMessagesForUser(auth.user.id, q, limit);
    return NextResponse.json({ items });
  } catch (error) {
    console.error('Message search error:', error);
    return NextResponse.json({ detail: 'Search failed' }, { status: 500 });
  }
}
