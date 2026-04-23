import { NextRequest, NextResponse } from 'next/server';
import { api } from '@/lib/api/client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query') || '';
    const skip = searchParams.get('skip') || '0';
    const limit = searchParams.get('limit') || '50';

    const response = await api.get<unknown>('/api/admin/users/search', {
      params: { query, skip, limit },
    });

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json(
      { error: 'Failed to search users' },
      { status: 500 }
    );
  }
}
