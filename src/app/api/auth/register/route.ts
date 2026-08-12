import { NextRequest, NextResponse } from 'next/server';
import { signupUser, AuthError, extractRequestMeta } from '@/lib/server/services/auth-service';
import { parseBody } from '@/lib/server/validation/parse-body';
import { signupSchema } from '@/lib/server/validation/auth.schemas';

export async function POST(request: NextRequest) {
  const parsed = await parseBody(request, signupSchema);
  if (!parsed.success) return parsed.response;

  try {
    const meta = extractRequestMeta(request);
    const result = await signupUser(parsed.data, meta);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { detail: error.message, code: error.code },
        { status: error.status }
      );
    }
    console.error('Register error:', error);
    return NextResponse.json(
      { detail: 'Registration failed', code: 'REGISTER_FAILED' },
      { status: 500 }
    );
  }
}
