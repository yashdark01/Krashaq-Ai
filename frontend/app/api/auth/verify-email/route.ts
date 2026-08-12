import { NextRequest, NextResponse } from 'next/server';
import { verifyEmailToken } from '@/lib/server/services/email-auth-service';
import { AuthError } from '@/lib/server/services/auth-service';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  try {
    const result = await verifyEmailToken(token ?? '');
    return NextResponse.redirect(
      new URL(`/auth/login?verified=1&email=${encodeURIComponent(result.email)}`, request.url)
    );
  } catch (error) {
    const message = error instanceof AuthError ? error.message : 'Email verification failed';
    return NextResponse.redirect(
      new URL(`/auth/login?verify_error=${encodeURIComponent(message)}`, request.url)
    );
  }
}
