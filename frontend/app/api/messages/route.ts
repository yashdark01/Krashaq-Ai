import { NextRequest, NextResponse } from 'next/server';
import { api } from '@/lib/api/client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const session_id = searchParams.get('session_id');
    const skip = searchParams.get('skip') || '0';
    const limit = searchParams.get('limit') || '50';

    const params: Record<string, string> = {
      skip,
      limit,
    };

    if (session_id) {
      params.session_id = session_id;
    }

    const response = await api.get<unknown>('/api/messages', { params });

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}
