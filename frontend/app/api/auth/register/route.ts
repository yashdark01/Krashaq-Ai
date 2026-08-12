import { NextRequest, NextResponse } from 'next/server';
import { signupUser } from '@/lib/server/services/auth-service';

/** Google OAuth completion registration — same as signup without password requirement handled separately */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await signupUser({
      ...body,
      password: body.password ?? `oauth-${Date.now()}`,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : 'Registration failed' },
      { status: 400 }
    );
  }
}
