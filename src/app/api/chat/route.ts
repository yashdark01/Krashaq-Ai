import { NextRequest, NextResponse } from 'next/server';
import { processChat } from '@/lib/server/services/chat';
import { requireAuth } from '@/lib/server/auth/rbac';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  try {
    const body = await request.json();
    const result = await processChat({
      message: body.message,
      user_id: auth.user.id,
      user_role: auth.user.role,
      location: body.location,
      session_id: body.session_id,
      language: body.language,
      provider: body.provider,
      model: body.model,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === 'SESSION_NOT_FOUND') {
      return NextResponse.json({ detail: 'Session not found', code: 'NOT_FOUND' }, { status: 404 });
    }
    console.error('Chat API error:', error);
    return NextResponse.json({ error: 'Failed to process chat request' }, { status: 500 });
  }
}
