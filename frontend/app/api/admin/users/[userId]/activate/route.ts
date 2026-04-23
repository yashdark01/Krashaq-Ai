import { NextRequest, NextResponse } from 'next/server';
import { api } from '@/lib/api/client';

export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const body = await request.json();
    const response = await api.put<unknown>(
      `/api/admin/users/${params.userId}/activate`,
      body
    );

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error activating user:', error);
    return NextResponse.json(
      { error: 'Failed to activate user' },
      { status: 500 }
    );
  }
}
