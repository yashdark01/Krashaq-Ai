import { NextRequest, NextResponse } from 'next/server';
import { parseBody } from '@/lib/server/validation/parse-body';
import { forgotPasswordSchema } from '@/lib/server/validation/auth.schemas';
import { requestPasswordReset } from '@/lib/server/services/email-auth-service';
import { AuthError } from '@/lib/server/services/auth-service';

export async function POST(request: NextRequest) {
  const parsed = await parseBody(request, forgotPasswordSchema);
  if (!parsed.success) return parsed.response;

  try {
    const result = await requestPasswordReset(parsed.data.email);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ detail: error.message, code: error.code }, { status: error.status });
    }
    console.error('Forgot password error:', error);
    return NextResponse.json({ detail: 'Failed to process request' }, { status: 500 });
  }
}
