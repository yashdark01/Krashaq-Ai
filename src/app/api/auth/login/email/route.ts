import { NextRequest, NextResponse } from 'next/server';
import { loginWithEmail, AuthError, extractRequestMeta } from '@/lib/server/services/auth-service';
import { parseBody } from '@/lib/server/validation/parse-body';
import { loginSchema } from '@/lib/server/validation/auth.schemas';

export async function POST(request: NextRequest) {
  const parsed = await parseBody(request, loginSchema);
  if (!parsed.success) return parsed.response;

  try {
    const meta = extractRequestMeta(request);
    const result = await loginWithEmail(parsed.data.email, parsed.data.password, meta);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { detail: error.message, code: error.code },
        { status: error.status }
      );
    }
    console.error('Login error:', error);
    return NextResponse.json({ detail: 'Login failed', code: 'LOGIN_FAILED' }, { status: 500 });
  }
}
