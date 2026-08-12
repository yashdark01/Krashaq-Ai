import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/auth/rbac';
import { getCollection } from '@/lib/server/db/mongodb';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  const users = await getCollection('users');
  const scheduledAt = new Date();
  scheduledAt.setDate(scheduledAt.getDate() + 30);

  await users.updateOne(
    { _id: auth.user.id } as never,
    {
      $set: {
        deletion_scheduled_at: scheduledAt,
        updated_at: new Date(),
      },
    } as never
  );

  return NextResponse.json({
    scheduled: true,
    deletion_scheduled_at: scheduledAt.toISOString(),
    message: 'Account scheduled for deletion in 30 days',
  });
}
