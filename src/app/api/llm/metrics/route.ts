import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/auth/rbac';
import { getLangSmithStats } from '@/lib/server/services/langsmith-service';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response;

  const range = request.nextUrl.searchParams.get('range') ?? '7d';
  const stats = await getLangSmithStats(range);
  return NextResponse.json(stats);
}
