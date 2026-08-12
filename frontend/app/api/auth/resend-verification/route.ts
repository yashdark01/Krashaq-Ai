import { NextRequest, NextResponse } from 'next/server';
import { parseBody } from '@/lib/server/validation/parse-body';
import { resendVerificationSchema } from '@/lib/server/validation/auth.schemas';
import {
  resendVerificationEmail,
  resendVerificationForAuthUser,
} from '@/lib/server/services/email-auth-service';
import { AuthError } from '@/lib/server/services/auth-service';

export async function POST(request: NextRequest) {
  const parsed = await parseBody(request, resendVerificationSchema);
  if (!parsed.success) return parsed.response;

  try {
    if (parsed.data.email) {
      const result = await resendVerificationEmail(parsed.data.email);
      return NextResponse.json(result);
    }

    const result = await resendVerificationForAuthUser(request.headers.get('authorization'));
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ detail: error.message, code: error.code }, { status: error.status });
    }
    console.error('Resend verification error:', error);
    return NextResponse.json({ detail: 'Failed to resend verification email' }, { status: 500 });
  }
}
