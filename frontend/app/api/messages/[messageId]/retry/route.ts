import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/auth/rbac';
import { findMessageForUser } from '@/lib/server/services/chat-memory';
import { processChat } from '@/lib/server/services/chat';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  const { messageId } = await params;
  const found = await findMessageForUser(auth.user.id, messageId);
  if (!found || found.message.role !== 'assistant') {
    return NextResponse.json({ error: 'Assistant message not found' }, { status: 404 });
  }

  const priorUser = [...found.messages]
    .slice(0, found.index)
    .reverse()
    .find((m) => m.role === 'user');
  if (!priorUser) {
    return NextResponse.json({ error: 'No user message to retry from' }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const result = await processChat({
    message: priorUser.content,
    user_id: auth.user.id,
    user_role: auth.user.role,
    session_id: found.session_id,
    location: body.location ?? auth.user.default_location ?? undefined,
    provider: body.provider,
    model: body.model,
  });

  return NextResponse.json(result);
}
