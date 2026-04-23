import { NextRequest, NextResponse } from 'next/server';
import { api } from '@/lib/api/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await api.post<unknown>('/api/admin/moderation/flag', body);

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error flagging content:', error);
    return NextResponse.json(
      { error: 'Failed to flag content' },
      { status: 500 }
    );
  }
}
