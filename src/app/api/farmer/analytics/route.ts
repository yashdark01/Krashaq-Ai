import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/auth/rbac';
import { getChatUsageByUserIds } from '@/lib/server/services/usage-analytics-service';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  if (auth.user.role !== 'farmer') {
    return NextResponse.json({ detail: 'Farmer access required' }, { status: 403 });
  }

  const usageMap = await getChatUsageByUserIds([auth.user.id]);
  const usage = usageMap.get(auth.user.id) ?? {
    chat_sessions: 0,
    total_messages: 0,
    messages_7d: 0,
    messages_30d: 0,
    last_active_at: null,
    active_7d: false,
  };

  return NextResponse.json({ farmer_id: auth.user.id, ...usage });
}
