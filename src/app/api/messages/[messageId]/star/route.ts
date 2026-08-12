import { NextRequest, NextResponse } from 'next/server';
import { toggleMessageStar } from '@/lib/server/services/chat-memory';
import { requireAuth } from '@/lib/server/auth/rbac';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  try {
    const { messageId } = await params;
    const body = await request.json();
    const sessionId = body.session_id as string;
    if (!sessionId) {
      return NextResponse.json({ error: 'session_id is required' }, { status: 400 });
    }

    const starred = await toggleMessageStar(auth.user.id, sessionId, messageId);
    if (starred === null) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    return NextResponse.json({ starred });
  } catch (error) {
    console.error('Star toggle error:', error);
    return NextResponse.json({ error: 'Failed to toggle star' }, { status: 500 });
  }
}
