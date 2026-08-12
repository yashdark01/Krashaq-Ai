import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/auth/rbac';
import { disableMfa } from '@/lib/server/auth/mfa-service';
import { AuthError } from '@/lib/server/services/auth-service';
import { parseBody } from '@/lib/server/validation/parse-body';
import { z } from 'zod';

const schema = z.object({
  password: z.string().min(1),
  code: z.string().min(6).max(12),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  const parsed = await parseBody(request, schema);
  if (!parsed.success) return parsed.response;

  try {
    const result = await disableMfa(auth.user.id, parsed.data.password, parsed.data.code);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ detail: error.message, code: error.code }, { status: error.status });
    }
    return NextResponse.json({ detail: 'Failed to disable MFA' }, { status: 500 });
  }
}
