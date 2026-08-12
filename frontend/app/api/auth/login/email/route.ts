import { NextRequest, NextResponse } from 'next/server';
import { loginWithEmail } from '@/lib/server/services/auth-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await loginWithEmail(body.email, body.password);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : 'Login failed' },
      { status: 401 }
    );
  }
}
