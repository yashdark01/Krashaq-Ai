import { NextRequest, NextResponse } from 'next/server';
import { deleteSessionForUser, getSessionMessages } from '@/lib/server/services/chat-memory';
import { requireAuth } from '@/lib/server/auth/rbac';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');
    const skip = parseInt(searchParams.get('skip') ?? '0', 10);
    const limit = parseInt(searchParams.get('limit') ?? '100', 10);

    if (!sessionId) {
      return NextResponse.json({ error: 'session_id is required' }, { status: 400 });
    }

    const result = await getSessionMessages(auth.user.id, sessionId, skip, limit);
    if (!result) {
      return NextResponse.json({ detail: 'Session not found', code: 'NOT_FOUND' }, { status: 404 });
    }

    return NextResponse.json({
      items: result.items.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        created_at: m.timestamp,
        tools_used: m.tools_used,
        llm_provider: m.llm_provider,
        llm_model: m.llm_model,
        detected_crop: m.detected_crop,
        language: m.language,
        feedback: m.feedback,
        starred: m.starred ?? false,
      })),
      total: result.total,
      session_id: sessionId,
    });
  } catch (error) {
    console.error('Messages GET error:', error);
    return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');
    if (!sessionId) {
      return NextResponse.json({ error: 'session_id is required' }, { status: 400 });
    }
    const deleted = await deleteSessionForUser(auth.user.id, sessionId);
    if (!deleted) {
      return NextResponse.json({ detail: 'Session not found', code: 'NOT_FOUND' }, { status: 404 });
    }
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error('Messages DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
  }
}
