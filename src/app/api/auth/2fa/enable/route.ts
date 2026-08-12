import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/auth/rbac';
import { startMfaSetup, confirmMfaSetup } from '@/lib/server/auth/mfa-service';
import { AuthError } from '@/lib/server/services/auth-service';
import { parseBody } from '@/lib/server/validation/parse-body';
import { z } from 'zod';

const confirmSchema = z.object({ code: z.string().min(6).max(8) });

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  try {
    const result = await startMfaSetup(auth.user.id);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { detail: error.message, code: error.code },
        { status: error.status }
      );
    }
    return NextResponse.json({ detail: 'MFA setup failed' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  const parsed = await parseBody(request, confirmSchema);
  if (!parsed.success) return parsed.response;

  try {
    const result = await confirmMfaSetup(auth.user.id, parsed.data.code);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { detail: error.message, code: error.code },
        { status: error.status }
      );
    }
    return NextResponse.json({ detail: 'MFA confirmation failed' }, { status: 500 });
  }
}
