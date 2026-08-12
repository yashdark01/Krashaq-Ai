import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/auth/rbac';
import { getLangSmithRuns } from '@/lib/server/services/langsmith-service';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response;

  const range = request.nextUrl.searchParams.get('range') ?? '7d';
  const limit = Number(request.nextUrl.searchParams.get('limit') ?? '25');
  const cursor = request.nextUrl.searchParams.get('cursor');

  const result = await getLangSmithRuns(range, limit, cursor);
  return NextResponse.json({ range, ...result });
}
