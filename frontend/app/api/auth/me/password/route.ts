import { NextRequest, NextResponse } from 'next/server';
import { api } from '@/lib/api/client';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await api.put<unknown>('/api/auth/me/password', body);

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error updating password:', error);
    return NextResponse.json(
      { error: 'Failed to update password' },
      { status: 500 }
    );
  }
}
