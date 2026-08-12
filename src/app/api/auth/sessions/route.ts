import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/server/auth/jwt';
import {
  getUserFromAuthHeader,
  getUserSessions,
  AuthError,
} from '@/lib/server/services/auth-service';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromAuthHeader(request.headers.get('authorization'));
    if (!user) {
      return NextResponse.json({ detail: 'Unauthorized', code: 'UNAUTHORIZED' }, { status: 401 });
    }

    const authHeader = request.headers.get('authorization');
    let currentSessionId: string | undefined;
    if (authHeader?.startsWith('Bearer ')) {
      const payload = await verifyToken(authHeader.slice(7));
      if (payload?.sid) currentSessionId = String(payload.sid);
    }

    const sessions = await getUserSessions(user.id, currentSessionId);
    return NextResponse.json({ items: sessions });
  } catch (error) {
    console.error('List sessions error:', error);
    return NextResponse.json({ detail: 'Failed to list sessions' }, { status: 500 });
  }
}
