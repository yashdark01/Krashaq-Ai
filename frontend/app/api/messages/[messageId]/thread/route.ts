import { NextRequest, NextResponse } from 'next/server';
import { api } from '@/lib/api/client';

export async function GET(
  request: NextRequest,
  { params }: { params: { messageId: string } }
) {
  try {
    const response = await api.get<unknown>(
      `/api/messages/${params.messageId}/thread`
    );

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error fetching message thread:', error);
    return NextResponse.json(
      { error: 'Failed to fetch message thread' },
      { status: 500 }
    );
  }
}
