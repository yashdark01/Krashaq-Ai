import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/auth/rbac';
import { getSessionMessages, deleteSessionForUser } from '@/lib/server/services/chat-memory';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  const { sessionId } = await params;
  const data = await getSessionMessages(auth.user.id, sessionId);
  if (!data) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  return NextResponse.json({ session_id: sessionId, ...data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  const { sessionId } = await params;
  const ok = await deleteSessionForUser(auth.user.id, sessionId);
  if (!ok) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
