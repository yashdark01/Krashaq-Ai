import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/auth/rbac';
import { getCollection } from '@/lib/server/db/mongodb';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  const users = await getCollection('users');
  await users.updateOne(
    { _id: auth.user.id } as never,
    {
      $unset: { deletion_scheduled_at: '' },
      $set: { updated_at: new Date() },
    } as never
  );

  return NextResponse.json({ cancelled: true });
}
