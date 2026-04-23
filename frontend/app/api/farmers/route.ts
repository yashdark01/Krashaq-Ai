import { NextRequest, NextResponse } from 'next/server';
import { api } from '@/lib/api/client';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const skip = searchParams.get('skip') || '0';
    const limit = searchParams.get('limit') || '50';

    const response = await api.get<unknown>('/api/farmers', {
      params: { skip, limit },
    });

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error fetching farmers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch farmers' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await api.post<unknown>('/api/farmers', body);

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error creating farmer:', error);
    return NextResponse.json(
      { error: 'Failed to create farmer' },
      { status: 500 }
    );
  }
}
