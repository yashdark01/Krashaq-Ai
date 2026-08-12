import { NextRequest, NextResponse } from 'next/server';
import { processChatStream } from '@/lib/server/services/chat';
import { requireAuth } from '@/lib/server/auth/rbac';
import type { StreamEvent } from '@/modules/conversation/types/message';

function encodeSse(event: StreamEvent): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`);
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  const body = await request.json();
  const signal = request.signal;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of processChatStream(
          {
            message: body.message,
            user_id: auth.user.id,
            user_role: auth.user.role,
            location: body.location,
            session_id: body.session_id,
            language: body.language,
            provider: body.provider,
            model: body.model,
          },
          signal
        )) {
          controller.enqueue(encodeSse(event));
        }
        controller.close();
      } catch (error) {
        console.error('Chat stream error:', error);
        const message =
          error instanceof Error && error.message === 'SESSION_NOT_FOUND'
            ? 'Chat session not found'
            : error instanceof Error
              ? error.message
              : 'Stream failed';
        const status = error instanceof Error && error.message === 'SESSION_NOT_FOUND' ? 404 : 500;
        const errEvent: StreamEvent = {
          type: 'error',
          code: status === 404 ? 'SESSION_NOT_FOUND' : 'STREAM_FAILED',
          message,
          retryable: status !== 404,
        };
        controller.enqueue(encodeSse(errEvent));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
