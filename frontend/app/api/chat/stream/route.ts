import { NextRequest } from 'next/server';
import { processChatStream } from '@/lib/server/services/chat';
import type { StreamEvent } from '@/modules/conversation/types/message';

function encodeSse(event: StreamEvent): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const signal = request.signal;

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of processChatStream(
          {
            message: body.message,
            location: body.location,
            phone: body.phone,
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
        const errEvent: StreamEvent = {
          type: 'error',
          code: 'STREAM_FAILED',
          message: error instanceof Error ? error.message : 'Stream failed',
          retryable: true,
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
