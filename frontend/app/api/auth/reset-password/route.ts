import { NextRequest, NextResponse } from 'next/server';
import { parseBody } from '@/lib/server/validation/parse-body';
import { resetPasswordSchema } from '@/lib/server/validation/auth.schemas';
import { resetPasswordWithToken } from '@/lib/server/services/email-auth-service';
import { AuthError } from '@/lib/server/services/auth-service';

export async function POST(request: NextRequest) {
  const parsed = await parseBody(request, resetPasswordSchema);
  if (!parsed.success) return parsed.response;

  try {
    const result = await resetPasswordWithToken(parsed.data.token, parsed.data.password);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ detail: error.message, code: error.code }, { status: error.status });
    }
    console.error('Reset password error:', error);
    return NextResponse.json({ detail: 'Failed to reset password' }, { status: 500 });
  }
}
