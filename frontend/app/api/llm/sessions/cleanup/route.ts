import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/auth/rbac';
import { getCollection } from '@/lib/server/db/mongodb';

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.success) return auth.response;

  const body = await request.json().catch(() => ({}));
  const days = Number(body.older_than_days ?? 90);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const collection = await getCollection('chat_sessions');
  const result = await collection.deleteMany({
    updated_at: { $lt: cutoff },
    'messages.0': { $exists: false },
  });

  return NextResponse.json({ deleted: result.deletedCount, older_than_days: days });
}
