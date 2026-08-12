import { NextRequest, NextResponse } from 'next/server';
import { getSessionMessages, deleteSession } from '@/lib/server/services/chat-memory';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');
    const skip = parseInt(searchParams.get('skip') ?? '0', 10);
    const limit = parseInt(searchParams.get('limit') ?? '100', 10);

    if (!sessionId) {
      return NextResponse.json({ error: 'session_id is required' }, { status: 400 });
    }

    const { items, total } = await getSessionMessages(sessionId, skip, limit);

    return NextResponse.json({
      items: items.map((m) => ({
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
      })),
      total,
      session_id: sessionId,
    });
  } catch (error) {
    console.error('Messages GET error:', error);
    return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');
    if (!sessionId) {
      return NextResponse.json({ error: 'session_id is required' }, { status: 400 });
    }
    const deleted = await deleteSession(sessionId);
    return NextResponse.json({ deleted });
  } catch (error) {
    console.error('Messages DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
  }
}
