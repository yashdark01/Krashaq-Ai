import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/auth/rbac';
import { getAdminAnalyticsStats } from '@/lib/server/services/admin-service';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response;

  const stats = await getAdminAnalyticsStats();
  return NextResponse.json(stats.users);
}
