import { NextRequest, NextResponse } from 'next/server';
import { renameSessionForUser } from '@/lib/server/services/chat-memory';
import { requireAuth } from '@/lib/server/auth/rbac';
import { z } from 'zod';
import { parseBody } from '@/lib/server/validation/parse-body';

const renameSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(120),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  const parsed = await parseBody(request, renameSchema);
  if (!parsed.success) return parsed.response;

  const { sessionId } = await params;
  const ok = await renameSessionForUser(auth.user.id, sessionId, parsed.data.title);
  if (!ok) {
    return NextResponse.json({ detail: 'Session not found', code: 'NOT_FOUND' }, { status: 404 });
  }

  return NextResponse.json({ session_id: sessionId, title: parsed.data.title });
}
