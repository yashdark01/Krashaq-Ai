import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/server/auth/jwt';
import {
  getUserFromAuthHeader,
  revokeUserSession,
  AuthError,
} from '@/lib/server/services/auth-service';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const user = await getUserFromAuthHeader(request.headers.get('authorization'));
    if (!user) {
      return NextResponse.json({ detail: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const { sessionId } = await params;

    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const payload = await verifyToken(authHeader.slice(7));
      if (payload?.sid === sessionId) {
        return NextResponse.json(
          { detail: 'Cannot revoke the current session. Use logout instead.', code: 'CURRENT_SESSION' },
          { status: 400 }
        );
      }
    }

    const result = await revokeUserSession(user.id, sessionId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ detail: error.message, code: error.code }, { status: error.status });
    }
    console.error('Revoke session error:', error);
    return NextResponse.json({ detail: 'Failed to revoke session' }, { status: 500 });
  }
}
