import { randomUUID } from 'crypto';
import { getCollection } from '@/lib/server/db/mongodb';
import type { AuthUser } from '@/lib/server/auth/rbac';
import type { FarmerCreateInput } from '@/lib/server/validation/farmer.schemas';
import { AuthError } from '@/lib/server/services/auth-service';
import { assertCanAddFarmer } from '@/lib/server/services/supplier-license-service';
import {
  createFarmerSubscription,
  getSubscriptionsByFarmerIds,
} from '@/lib/server/services/farmer-subscription-service';

function serializeFarmer(
  f: Record<string, unknown>,
  subscription?: Record<string, unknown> | null
) {
  return {
    id: String(f._id),
    name: f.name as string,
    phone: f.phone as string | undefined,
    location: (f.location as { locality?: string } | undefined)?.locality ?? null,
    supplier_id: f.supplier_id ? String(f.supplier_id) : null,
    subscription: subscription
      ? {
          plan: subscription.plan,
          status: subscription.status,
          valid_until: subscription.valid_until,
          price_inr: subscription.price_inr,
        }
      : null,
  };
}

function buildFarmerFilter(user: AuthUser, supplierId?: string | null) {
  const filter: Record<string, unknown> = { role: 'farmer' };

  if (user.role === 'supplier') {
    filter.supplier_id = user.id;
  } else if (user.role === 'admin' && supplierId) {
    filter.supplier_id = supplierId;
  }

  return filter;
}

export async function listFarmersForUser(
  user: AuthUser,
  skip = 0,
  limit = 50,
  supplierId?: string | null
) {
  const users = await getCollection('users');
  const farmers = await users
    .find(buildFarmerFilter(user, supplierId))
    .skip(skip)
    .limit(limit)
    .toArray();

  const farmerIds = farmers.map((f) => String(f._id));
  const subMap = await getSubscriptionsByFarmerIds(farmerIds);

  return farmers.map((f) => {
    const id = String(f._id);
    return serializeFarmer(f as Record<string, unknown>, subMap.get(id) ?? null);
  });
}

export async function createFarmerForUser(user: AuthUser, data: FarmerCreateInput) {
  const users = await getCollection('users');
  const existing = await users.findOne({ phone: data.phone });
  if (existing) throw new Error('Phone number already registered');

  let supplierId: string | null = null;
  if (user.role === 'supplier') {
    await assertCanAddFarmer(user.id);
    supplierId = user.id;
  } else if (user.role === 'admin') {
    if (!data.supplier_id) {
      throw new Error('supplier_id is required when creating a farmer as admin');
    }
    const supplier = await users.findOne({
      _id: data.supplier_id,
      role: { $in: ['supplier', 'pestisides-supplier'] },
    } as never);
    if (!supplier) throw new Error('Supplier not found');
    supplierId = data.supplier_id;
    await assertCanAddFarmer(supplierId);
  }

  const userId = randomUUID();
  const farmer = {
    _id: userId,
    name: data.name,
    phone: data.phone,
    role: 'farmer',
    supplier_id: supplierId,
    language: 'hi',
    location: {
      locality: data.location ?? null,
    },
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  await users.insertOne(farmer as never);

  if (supplierId) {
    const plan = data.subscription_plan ?? 'trial';
    const issuedBy = user.role === 'supplier' ? user.id : user.id;
    await createFarmerSubscription(userId, supplierId, issuedBy, { plan });
  }

  const subMap = await getSubscriptionsByFarmerIds([userId]);
  return serializeFarmer(farmer, subMap.get(userId) ?? null);
}

export async function getFarmerRecordById(farmerId: string) {
  const users = await getCollection('users');
  return users.findOne({ _id: farmerId, role: 'farmer' } as never);
}

export async function getFarmerByIdForUser(user: AuthUser, farmerId: string) {
  const farmer = await getFarmerRecordById(farmerId);
  if (!farmer) return null;
  if (user.role === 'supplier' && farmer.supplier_id !== user.id) return null;
  return serializeFarmer(farmer as Record<string, unknown>);
}

export async function getFarmerByPhoneForUser(user: AuthUser, phone: string) {
  const users = await getCollection('users');
  const farmer = await users.findOne({ phone, role: 'farmer' });
  if (!farmer) return null;
  if (user.role === 'supplier' && farmer.supplier_id !== user.id) return null;
  return serializeFarmer(farmer as Record<string, unknown>);
}

export async function updateFarmerForUser(
  user: AuthUser,
  farmerId: string,
  data: { name?: string; location?: string }
) {
  const farmer = await getFarmerRecordById(farmerId);
  if (!farmer) return null;
  if (user.role === 'supplier' && farmer.supplier_id !== user.id) return null;

  const users = await getCollection('users');
  const update: Record<string, unknown> = { updated_at: new Date() };
  if (data.name) update.name = data.name;
  if (data.location) {
    update.location = {
      ...(farmer.location as object),
      locality: data.location,
    };
  }

  await users.updateOne({ _id: farmerId } as never, { $set: update } as never);
  return getFarmerByIdForUser(user, farmerId);
}

export async function deleteFarmerForUser(user: AuthUser, farmerId: string) {
  const farmer = await getFarmerRecordById(farmerId);
  if (!farmer) return false;
  if (user.role === 'supplier' && farmer.supplier_id !== user.id) return false;

  const users = await getCollection('users');
  const result = await users.deleteOne({ _id: farmerId, role: 'farmer' } as never);
  return result.deletedCount > 0;
}

export async function assignFarmerToSupplier(farmerId: string, supplierId: string) {
  const users = await getCollection('users');
  const farmer = await getFarmerRecordById(farmerId);
  if (!farmer) throw new Error('Farmer not found');

  const supplier = await users.findOne({
    _id: supplierId,
    role: { $in: ['supplier', 'pestisides-supplier'] },
  } as never);
  if (!supplier) throw new Error('Supplier not found');

  await users.updateOne(
    { _id: farmerId } as never,
    { $set: { supplier_id: supplierId, updated_at: new Date() } } as never
  );

  const updated = await getFarmerRecordById(farmerId);
  return updated ? serializeFarmer(updated as Record<string, unknown>) : null;
}

export async function listSuppliersWithCounts() {
  const users = await getCollection('users');
  const suppliers = await users
    .find({ role: { $in: ['supplier', 'pestisides-supplier'] } })
    .toArray();

  const counts = await users
    .aggregate([
      { $match: { role: 'farmer', supplier_id: { $ne: null } } },
      { $group: { _id: '$supplier_id', count: { $sum: 1 } } },
    ])
    .toArray();

  const countMap = new Map(counts.map((c) => [String(c._id), c.count as number]));

  return suppliers.map((s) => ({
    id: String(s._id),
    name: s.name as string,
    email: s.email as string,
    phone: (s.phone as string | undefined) ?? null,
    farmer_count: countMap.get(String(s._id)) ?? 0,
  }));
}

// Backward-compatible exports used before scoping was added
export async function listFarmers(skip = 0, limit = 50) {
  const users = await getCollection('users');
  const farmers = await users.find({ role: 'farmer' }).skip(skip).limit(limit).toArray();
  return farmers.map((f) => serializeFarmer(f as Record<string, unknown>));
}

export async function createFarmer(data: FarmerCreateInput) {
  throw new Error('Use createFarmerForUser with authenticated context');
}

export async function getFarmerById(farmerId: string) {
  const farmer = await getFarmerRecordById(farmerId);
  return farmer ? serializeFarmer(farmer as Record<string, unknown>) : null;
}

export async function getFarmerByPhone(phone: string) {
  const users = await getCollection('users');
  const farmer = await users.findOne({ phone, role: 'farmer' });
  return farmer ? serializeFarmer(farmer as Record<string, unknown>) : null;
}

export async function updateFarmer(farmerId: string, data: { name?: string; location?: string }) {
  const users = await getCollection('users');
  const farmer = await getFarmerRecordById(farmerId);
  if (!farmer) return null;

  const update: Record<string, unknown> = { updated_at: new Date() };
  if (data.name) update.name = data.name;
  if (data.location) {
    update.location = {
      ...(farmer.location as object),
      locality: data.location,
    };
  }

  await users.updateOne({ _id: farmerId } as never, { $set: update } as never);
  return getFarmerById(farmerId);
}

export async function deleteFarmer(farmerId: string) {
  const users = await getCollection('users');
  const result = await users.deleteOne({ _id: farmerId, role: 'farmer' } as never);
  return result.deletedCount > 0;
}
