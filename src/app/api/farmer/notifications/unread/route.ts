import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/auth/rbac';
import { countUnreadNotifications } from '@/lib/server/services/notification-inbox-service';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  const count = await countUnreadNotifications(auth.user.id);
  return NextResponse.json({ unread: count });
}
