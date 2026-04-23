import { NextRequest, NextResponse } from 'next/server';
import { api } from '@/lib/api/client';

export async function POST(
  request: NextRequest,
  { params }: { params: { messageId: string } }
) {
  try {
    const response = await api.post<unknown>(
      `/api/messages/${params.messageId}/star`
    );

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error starring message:', error);
    return NextResponse.json(
      { error: 'Failed to star message' },
      { status: 500 }
    );
  }
}
