import { NextRequest, NextResponse } from 'next/server';
import { getStarredMessagesForUser } from '@/lib/server/services/chat-memory';
import { requireAuth } from '@/lib/server/auth/rbac';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  try {
    const items = await getStarredMessagesForUser(auth.user.id);
    return NextResponse.json({ items });
  } catch (error) {
    console.error('Starred messages error:', error);
    return NextResponse.json({ detail: 'Failed to load starred messages' }, { status: 500 });
  }
}
