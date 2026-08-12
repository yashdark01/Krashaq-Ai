import { NextRequest, NextResponse } from 'next/server';
import { signupUser } from '@/lib/server/services/auth-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await signupUser(body);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : 'Signup failed' },
      { status: 400 }
    );
  }
}
