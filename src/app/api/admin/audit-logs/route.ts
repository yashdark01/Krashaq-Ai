import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/auth/rbac';
import { listAuditLogs } from '@/lib/server/services/audit-service';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response;

  const limit = Number(request.nextUrl.searchParams.get('limit') ?? 100);
  const items = await listAuditLogs(limit);
  return NextResponse.json({ items });
}
