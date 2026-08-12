import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/auth/rbac';
import {
  deleteMessageForUser,
  findMessageForUser,
  updateMessageContent,
} from '@/lib/server/services/chat-memory';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  const { messageId } = await params;
  const found = await findMessageForUser(auth.user.id, messageId);
  if (!found) {
    return NextResponse.json({ error: 'Message not found' }, { status: 404 });
  }

  return NextResponse.json({
    session_id: found.session_id,
    message: found.message,
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  const { messageId } = await params;
  const body = await request.json();
  const content = body.content as string;
  if (!content?.trim()) {
    return NextResponse.json({ error: 'content is required' }, { status: 400 });
  }

  const ok = await updateMessageContent(auth.user.id, messageId, content.trim());
  if (!ok) {
    return NextResponse.json({ error: 'Message not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  const { messageId } = await params;
  const ok = await deleteMessageForUser(auth.user.id, messageId);
  if (!ok) {
    return NextResponse.json({ error: 'Message not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
