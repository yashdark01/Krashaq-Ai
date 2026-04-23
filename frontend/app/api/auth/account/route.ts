import { NextRequest, NextResponse } from 'next/server';
import { api } from '@/lib/api/client';

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await api.delete<unknown>('/api/auth/account');

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    );
  }
}
