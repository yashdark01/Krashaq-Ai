import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/auth/rbac';
import { getMessageThreadForUser } from '@/lib/server/services/chat-memory';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  const { messageId } = await params;
  const thread = await getMessageThreadForUser(auth.user.id, messageId);
  if (!thread) {
    return NextResponse.json({ error: 'Message not found' }, { status: 404 });
  }

  return NextResponse.json(thread);
}
