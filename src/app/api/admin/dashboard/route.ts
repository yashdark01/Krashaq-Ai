import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/auth/rbac';
import {
  getAdminDashboardStats,
  getAdminAnalyticsStats,
} from '@/lib/server/services/admin-service';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response;

  try {
    const stats = await getAdminDashboardStats();
    const analytics = await getAdminAnalyticsStats();
    return NextResponse.json({ ...stats, ...analytics });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    return NextResponse.json({ detail: 'Failed to load dashboard' }, { status: 500 });
  }
}
