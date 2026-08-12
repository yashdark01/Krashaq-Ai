import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/auth/rbac';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ configId: string }> }
) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response;
  const { configId } = await params;
  return NextResponse.json({ id: configId, triggered: true });
}
