import { NextRequest, NextResponse } from 'next/server';
import { api } from '@/lib/api/client';

export async function GET(request: NextRequest) {
  try {
    const response = await api.get<unknown>('/api/auth/sessions');

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const response = await api.delete<unknown>('/api/auth/sessions');

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error deleting all sessions:', error);
    return NextResponse.json(
      { error: 'Failed to delete all sessions' },
      { status: 500 }
    );
  }
}
