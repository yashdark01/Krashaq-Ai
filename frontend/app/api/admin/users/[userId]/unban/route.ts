import { NextRequest, NextResponse } from 'next/server';
import { api } from '@/lib/api/client';

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const response = await api.post<unknown>(
      `/api/admin/users/${params.userId}/unban`
    );

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error unbanning user:', error);
    return NextResponse.json(
      { error: 'Failed to unban user' },
      { status: 500 }
    );
  }
}
