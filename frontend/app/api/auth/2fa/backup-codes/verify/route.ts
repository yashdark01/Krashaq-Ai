import { NextRequest, NextResponse } from 'next/server';
import { api } from '@/lib/api/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await api.post<unknown>('/api/auth/2fa/backup-codes/verify', body);

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error verifying backup code:', error);
    return NextResponse.json(
      { error: 'Failed to verify backup code' },
      { status: 500 }
    );
  }
}
