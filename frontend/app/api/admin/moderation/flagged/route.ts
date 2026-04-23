import { NextRequest, NextResponse } from 'next/server';
import { api } from '@/lib/api/client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const skip = searchParams.get('skip') || '0';
    const limit = searchParams.get('limit') || '50';
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    const params: Record<string, string> = {
      skip,
      limit,
    };

    if (status) params.status = status;
    if (type) params.type = type;

    const response = await api.get<unknown>('/api/admin/moderation/flagged', {
      params,
    });

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error fetching flagged content:', error);
    return NextResponse.json(
      { error: 'Failed to fetch flagged content' },
      { status: 500 }
    );
  }
}
