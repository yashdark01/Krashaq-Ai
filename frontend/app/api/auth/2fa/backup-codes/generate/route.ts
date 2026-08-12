import { NextRequest, NextResponse } from 'next/server';
import {
  getBackupCodesRemaining,
  regenerateBackupCodes,
} from '@/lib/server/auth/mfa-service';
import { requireAuth } from '@/lib/server/auth/rbac';
import { AuthError } from '@/lib/server/services/auth-service';
import { parseBody } from '@/lib/server/validation/parse-body';
import { z } from 'zod';

const regenSchema = z.object({
  password: z.string().min(1),
  code: z.string().min(6).max(12),
});

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  try {
    const status = await getBackupCodesRemaining(auth.user.id);
    return NextResponse.json(status);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ detail: error.message, code: error.code }, { status: error.status });
    }
    return NextResponse.json({ detail: 'Failed to load backup codes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  const parsed = await parseBody(request, regenSchema);
  if (!parsed.success) return parsed.response;

  try {
    const result = await regenerateBackupCodes(
      auth.user.id,
      parsed.data.password,
      parsed.data.code
    );
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ detail: error.message, code: error.code }, { status: error.status });
    }
    return NextResponse.json({ detail: 'Failed to regenerate backup codes' }, { status: 500 });
  }
}
