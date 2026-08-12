import { NextRequest, NextResponse } from 'next/server';
import { setMessageFeedback } from '@/lib/server/services/chat-memory';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    const { messageId } = await params;
    const body = await request.json();
    const sessionId = body.session_id as string;
    const feedback = body.feedback as 'up' | 'down' | null;

    if (!sessionId) {
      return NextResponse.json({ error: 'session_id is required' }, { status: 400 });
    }

    const ok = await setMessageFeedback(sessionId, messageId, feedback);
    if (!ok) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, feedback });
  } catch (error) {
    console.error('Feedback error:', error);
    return NextResponse.json({ error: 'Failed to save feedback' }, { status: 500 });
  }
}
