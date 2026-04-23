import { NextRequest, NextResponse } from 'next/server';
import { api } from '@/lib/api/client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query') || '';
    const skip = searchParams.get('skip') || '0';
    const limit = searchParams.get('limit') || '50';
    const date_from = searchParams.get('date_from');
    const date_to = searchParams.get('date_to');
    const type = searchParams.get('type');

    const params: Record<string, string> = {
      query,
      skip,
      limit,
    };

    if (date_from) params.date_from = date_from;
    if (date_to) params.date_to = date_to;
    if (type) params.type = type;

    const response = await api.get<unknown>('/api/messages/search', { params });

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error searching messages:', error);
    return NextResponse.json(
      { error: 'Failed to search messages' },
      { status: 500 }
    );
  }
}
