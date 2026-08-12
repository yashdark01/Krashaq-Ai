import { NextRequest, NextResponse } from 'next/server';
import { refreshAccessToken } from '@/lib/server/services/auth-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await refreshAccessToken(body.refresh_token);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : 'Invalid refresh token' },
      { status: 401 }
    );
  }
}
