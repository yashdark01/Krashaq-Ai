import { NextRequest, NextResponse } from 'next/server';
import { processChat } from '@/lib/server/services/chat';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await processChat({
      message: body.message,
      location: body.location,
      phone: body.phone,
      session_id: body.session_id,
      language: body.language,
      provider: body.provider,
      model: body.model,
    });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}
