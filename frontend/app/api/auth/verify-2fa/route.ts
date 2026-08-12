import { NextRequest, NextResponse } from 'next/server';
import { verifyMfaLogin } from '@/lib/server/auth/mfa-service';
import { extractRequestMeta, AuthError } from '@/lib/server/services/auth-service';
import { parseBody } from '@/lib/server/validation/parse-body';
import { z } from 'zod';

const schema = z.object({
  mfa_token: z.string().min(1),
  code: z.string().min(6).max(12),
});

export async function POST(request: NextRequest) {
  const parsed = await parseBody(request, schema);
  if (!parsed.success) return parsed.response;

  try {
    const meta = extractRequestMeta(request);
    const result = await verifyMfaLogin(parsed.data.mfa_token, parsed.data.code, meta);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ detail: error.message, code: error.code }, { status: error.status });
    }
    return NextResponse.json({ detail: 'MFA verification failed' }, { status: 500 });
  }
}
