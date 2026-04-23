import { NextRequest, NextResponse } from 'next/server';
import { api } from '@/lib/api/client';

export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const body = await request.json();
    const response = await api.put<unknown>(
      `/api/admin/users/${params.userId}/role`,
      body
    );

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error updating user role:', error);
    return NextResponse.json(
      { error: 'Failed to update user role' },
      { status: 500 }
    );
  }
}
