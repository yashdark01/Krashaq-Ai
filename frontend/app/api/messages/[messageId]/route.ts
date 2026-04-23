import { NextRequest, NextResponse } from 'next/server';
import { api } from '@/lib/api/client';

export async function PUT(
  request: NextRequest,
  { params }: { params: { messageId: string } }
) {
  try {
    const body = await request.json();
    const response = await api.put<unknown>(
      `/api/messages/${params.messageId}`,
      body
    );

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error updating message:', error);
    return NextResponse.json(
      { error: 'Failed to update message' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { messageId: string } }
) {
  try {
    const response = await api.delete<unknown>(
      `/api/messages/${params.messageId}`
    );

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error deleting message:', error);
    return NextResponse.json(
      { error: 'Failed to delete message' },
      { status: 500 }
    );
  }
}
