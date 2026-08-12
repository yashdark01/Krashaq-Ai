import { randomUUID } from 'crypto';
import { getCollection } from '@/lib/server/db/mongodb';

export async function listFarmers(skip = 0, limit = 50) {
  const users = await getCollection('users');
  const farmers = await users
    .find({ role: 'farmer' })
    .skip(skip)
    .limit(limit)
    .toArray();

  return farmers.map((f) => ({
    id: f._id,
    name: f.name,
    phone: f.phone,
    location: (f.location as { locality?: string } | undefined)?.locality ?? null,
  }));
}

export async function createFarmer(data: {
  name: string;
  phone: string;
  location?: string;
}) {
  const users = await getCollection('users');
  const existing = await users.findOne({ phone: data.phone });
  if (existing) throw new Error('Phone number already registered');

  const userId = randomUUID();
  const farmer = {
    _id: userId,
    name: data.name,
    phone: data.phone,
    role: 'farmer',
    language: 'hi',
    location: {
      locality: data.location ?? null,
    },
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  await users.insertOne(farmer as never);
  return {
    id: userId,
    name: data.name,
    phone: data.phone,
    location: data.location ?? null,
  };
}

export async function getFarmerById(farmerId: string) {
  const users = await getCollection('users');
  const farmer = await users.findOne({ _id: farmerId, role: 'farmer' } as never);
  if (!farmer) return null;
  return {
    id: farmer._id,
    name: farmer.name,
    phone: farmer.phone,
    location: (farmer.location as { locality?: string } | undefined)?.locality ?? null,
  };
}

export async function getFarmerByPhone(phone: string) {
  const users = await getCollection('users');
  const farmer = await users.findOne({ phone, role: 'farmer' });
  if (!farmer) return null;
  return {
    id: farmer._id,
    name: farmer.name,
    phone: farmer.phone,
    location: (farmer.location as { locality?: string } | undefined)?.locality ?? null,
  };
}

export async function updateFarmer(
  farmerId: string,
  data: { name?: string; location?: string }
) {
  const users = await getCollection('users');
  const farmer = await users.findOne({ _id: farmerId, role: 'farmer' } as never);
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
