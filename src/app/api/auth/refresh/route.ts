import { NextRequest, NextResponse } from 'next/server';
import {
  refreshAccessToken,
  AuthError,
  extractRequestMeta,
} from '@/lib/server/services/auth-service';
import { parseBody } from '@/lib/server/validation/parse-body';
import { refreshSchema } from '@/lib/server/validation/auth.schemas';

export async function POST(request: NextRequest) {
  const parsed = await parseBody(request, refreshSchema);
  if (!parsed.success) return parsed.response;

  try {
    const meta = extractRequestMeta(request);
    const result = await refreshAccessToken(parsed.data.refresh_token, meta);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { detail: error.message, code: error.code },
        { status: error.status }
      );
    }
    console.error('Refresh error:', error);
    return NextResponse.json(
      { detail: 'Invalid refresh token', code: 'INVALID_REFRESH_TOKEN' },
      { status: 401 }
    );
  }
}
