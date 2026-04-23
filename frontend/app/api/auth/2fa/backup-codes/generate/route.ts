import { NextRequest, NextResponse } from 'next/server';
import { api } from '@/lib/api/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await api.post<unknown>('/api/auth/2fa/backup-codes/generate', body);

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error generating backup codes:', error);
    return NextResponse.json(
      { error: 'Failed to generate backup codes' },
      { status: 500 }
    );
  }
}
