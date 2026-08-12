import { NextRequest, NextResponse } from 'next/server';
import { exportSessionForUser } from '@/lib/server/services/chat-memory';
import { requireAuth } from '@/lib/server/auth/rbac';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  const sessionId = request.nextUrl.searchParams.get('session_id');
  const format = (request.nextUrl.searchParams.get('format') ?? 'md') as 'md' | 'json';

  if (!sessionId) {
    return NextResponse.json({ detail: 'session_id is required' }, { status: 400 });
  }

  try {
    const content = await exportSessionForUser(auth.user.id, sessionId, format);
    if (!content) {
      return NextResponse.json({ detail: 'Session not found', code: 'NOT_FOUND' }, { status: 404 });
    }

    const filename = `krashaq-chat-${sessionId.slice(0, 8)}.${format === 'json' ? 'json' : 'md'}`;
    return new NextResponse(content, {
      headers: {
        'Content-Type': format === 'json' ? 'application/json' : 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ detail: 'Export failed' }, { status: 500 });
  }
}
