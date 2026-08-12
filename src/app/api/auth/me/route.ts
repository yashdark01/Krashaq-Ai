import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/server/auth/rbac';
import { getCollection } from '@/lib/server/db/mongodb';
import { serializeUser } from '@/lib/server/services/auth-service';
import { parseBody } from '@/lib/server/validation/parse-body';
import { z } from 'zod';

const patchSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  phone: z.string().max(20).optional(),
  default_location: z.string().max(120).optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  const users = await getCollection('users');
  const user = await users.findOne({ _id: auth.user.id } as never);
  if (!user) {
    return NextResponse.json({ detail: 'User not found' }, { status: 404 });
  }

  return NextResponse.json(serializeUser(user as Record<string, unknown>));
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth.response;

  const parsed = await parseBody(request, patchSchema);
  if (!parsed.success) return parsed.response;

  const $set: Record<string, unknown> = { updated_at: new Date() };
  if (parsed.data.name !== undefined) $set.name = parsed.data.name.trim();
  if (parsed.data.phone !== undefined) $set.phone = parsed.data.phone.trim();
  if (parsed.data.default_location !== undefined) {
    $set.default_location = parsed.data.default_location.trim();
  }

  if (Object.keys($set).length === 1) {
    return NextResponse.json({ detail: 'No fields to update' }, { status: 400 });
  }

  const users = await getCollection('users');
  await users.updateOne({ _id: auth.user.id } as never, { $set } as never);
  const user = await users.findOne({ _id: auth.user.id } as never);
  if (!user) {
    return NextResponse.json({ detail: 'User not found' }, { status: 404 });
  }

  return NextResponse.json(serializeUser(user as Record<string, unknown>));
}
