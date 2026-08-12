import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/auth/rbac';
import { getLlmSessionStats } from '@/lib/server/services/chat-memory';

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response;

  const stats = await getLlmSessionStats();
  return NextResponse.json(stats);
}
