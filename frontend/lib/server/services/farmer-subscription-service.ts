import { randomUUID } from 'crypto';
import { getCollection } from '@/lib/server/db/mongodb';
import { AuthError } from '@/lib/server/services/auth-service';
import { SUBSCRIPTION_PLAN_DEFAULTS } from '@/lib/server/constants/subscription-plans';
import type {
  FarmerSubscriptionIssueInput,
  SubscriptionPlan,
} from '@/lib/server/validation/farmer-subscription.schemas';

export type SubscriptionStatus = 'active' | 'expired' | 'suspended' | 'trial';

function serializeSubscription(doc: Record<string, unknown>) {
  return {
    id: String(doc._id),
    farmer_id: String(doc.farmer_id),
    supplier_id: String(doc.supplier_id),
    plan: doc.plan as string,
    status: doc.status as SubscriptionStatus,
    price_inr: doc.price_inr as number,
    valid_from: doc.valid_from,
    valid_until: doc.valid_until,
    features: doc.features as Record<string, boolean>,
    created_at: doc.created_at,
    updated_by: doc.updated_by ? String(doc.updated_by) : null,
  };
}

export async function ensureSubscriptionIndexes() {
  const col = await getCollection('farmer_subscriptions');
  await col.createIndex({ farmer_id: 1 });
  await col.createIndex({ supplier_id: 1, status: 1 });
}

export async function createFarmerSubscription(
  farmerId: string,
  supplierId: string,
  issuedBy: string,
  data: FarmerSubscriptionIssueInput
) {
  const defaults = SUBSCRIPTION_PLAN_DEFAULTS[data.plan];
  const validFrom = new Date();
  const validUntil = data.valid_until
    ? new Date(data.valid_until)
    : new Date(validFrom.getTime() + defaults.duration_days * 24 * 60 * 60 * 1000);

  const subscription = {
    _id: randomUUID(),
    farmer_id: farmerId,
    supplier_id: supplierId,
    plan: data.plan,
    status: (data.plan === 'trial' ? 'trial' : 'active') as SubscriptionStatus,
    price_inr: defaults.price_inr,
    valid_from: validFrom,
    valid_until: validUntil,
    features: { ...defaults.features },
    created_at: new Date(),
    updated_by: issuedBy,
  };

  const col = await getCollection('farmer_subscriptions');
  await col.insertOne(subscription as never);
  return serializeSubscription(subscription);
}

export async function getSubscriptionByFarmerId(farmerId: string) {
  const col = await getCollection('farmer_subscriptions');
  const docs = await col.find({ farmer_id: farmerId } as never).sort({ created_at: -1 }).limit(1).toArray();
  const doc = docs[0];
  return doc ? serializeSubscription(doc as Record<string, unknown>) : null;
}

export async function getActiveSubscriptionForFarmer(farmerId: string) {
  const col = await getCollection('farmer_subscriptions');
  const docs = await col
    .find({ farmer_id: farmerId, status: { $in: ['active', 'trial'] } } as never)
    .sort({ valid_until: -1 })
    .limit(1)
    .toArray();
  const doc = docs[0];
  if (!doc) return null;

  const sub = serializeSubscription(doc as Record<string, unknown>);
  if (new Date(sub.valid_until as string | Date) < new Date()) {
    await col.updateOne(
      { _id: doc._id } as never,
      { $set: { status: 'expired', updated_at: new Date() } } as never
    );
    return { ...sub, status: 'expired' as SubscriptionStatus };
  }
  return sub;
}

export async function getSubscriptionsByFarmerIds(farmerIds: string[]) {
  const map = new Map<string, ReturnType<typeof serializeSubscription>>();
  if (farmerIds.length === 0) return map;

  const col = await getCollection('farmer_subscriptions');
  const docs = await col.find({ farmer_id: { $in: farmerIds } } as never).sort({ created_at: -1 }).toArray();

  for (const doc of docs) {
    const farmerId = String(doc.farmer_id);
    if (!map.has(farmerId)) {
      map.set(farmerId, serializeSubscription(doc as Record<string, unknown>));
    }
  }
  return map;
}

export async function listSubscriptionsForSupplier(supplierId: string) {
  const col = await getCollection('farmer_subscriptions');
  const docs = await col.find({ supplier_id: supplierId } as never).sort({ created_at: -1 }).toArray();
  return docs.map((d) => serializeSubscription(d as Record<string, unknown>));
}

export async function countActiveSubscriptionsForSupplier(supplierId: string) {
  const col = await getCollection('farmer_subscriptions');
  return col.countDocuments({
    supplier_id: supplierId,
    status: { $in: ['active', 'trial'] },
    valid_until: { $gt: new Date() },
  } as never);
}

export async function getSubscriptionStatsForSupplier(supplierId: string) {
  const col = await getCollection('farmer_subscriptions');
  const docs = await col.find({ supplier_id: supplierId } as never).toArray();
  const now = new Date();
  let active = 0;
  let expired = 0;
  let suspended = 0;
  let trial = 0;
  let revenue_inr = 0;

  for (const doc of docs) {
    const status = doc.status as string;
    if (status === 'suspended') suspended += 1;
    else if (status === 'trial') trial += 1;
    else if (new Date(doc.valid_until as Date) < now || status === 'expired') expired += 1;
    else active += 1;
    if (status === 'active' && new Date(doc.valid_until as Date) >= now) {
      revenue_inr += (doc.price_inr as number) ?? 0;
    }
  }

  return { active, expired, suspended, trial, total: docs.length, revenue_inr };
}

export async function suspendFarmerSubscription(
  farmerId: string,
  supplierId: string,
  updatedBy: string
) {
  const col = await getCollection('farmer_subscriptions');
  const result = await col.updateMany(
    { farmer_id: farmerId, supplier_id: supplierId, status: { $in: ['active', 'trial'] } } as never,
    { $set: { status: 'suspended', updated_by: updatedBy, updated_at: new Date() } } as never
  );
  if (result.matchedCount === 0) throw new AuthError('Subscription not found', 'NOT_FOUND', 404);
  return getSubscriptionByFarmerId(farmerId);
}

export async function reactivateFarmerSubscription(
  farmerId: string,
  supplierId: string,
  updatedBy: string
) {
  const col = await getCollection('farmer_subscriptions');
  const docs = await col.find({ farmer_id: farmerId, supplier_id: supplierId } as never).sort({ created_at: -1 }).limit(1).toArray();
  const latest = docs[0];
  if (!latest) throw new AuthError('Subscription not found', 'NOT_FOUND', 404);

  const validUntil = new Date(latest.valid_until as Date);
  const status = validUntil > new Date() ? (latest.plan === 'trial' ? 'trial' : 'active') : 'expired';

  await col.updateOne(
    { _id: latest._id } as never,
    { $set: { status, updated_by: updatedBy, updated_at: new Date() } } as never
  );
  return getSubscriptionByFarmerId(farmerId);
}

export async function renewFarmerSubscription(
  farmerId: string,
  supplierId: string,
  updatedBy: string,
  patch: { plan?: SubscriptionPlan; valid_until: Date }
) {
  const col = await getCollection('farmer_subscriptions');
  await col.updateMany(
    { farmer_id: farmerId, supplier_id: supplierId, status: { $in: ['active', 'trial'] } } as never,
    { $set: { status: 'expired', updated_by: updatedBy, updated_at: new Date() } } as never
  );
  const plan = patch.plan ?? 'basic';
  return createFarmerSubscription(farmerId, supplierId, updatedBy, {
    plan,
    valid_until: patch.valid_until.toISOString(),
  });
}

/** Farmers under a supplier need an active subscription to use the app. */
export async function assertFarmerSubscriptionAllowsLogin(farmerId: string, supplierId: string | null) {
  if (!supplierId) return null;

  const sub = await getActiveSubscriptionForFarmer(farmerId);
  if (!sub) {
    throw new AuthError(
      'No active subscription. Contact your supplier to renew.',
      'SUBSCRIPTION_INACTIVE',
      403
    );
  }
  if (sub.status === 'expired') {
    throw new AuthError(
      'Subscription expired. Contact your supplier to renew.',
      'SUBSCRIPTION_EXPIRED',
      403
    );
  }
  if (sub.status === 'suspended') {
    throw new AuthError(
      'Subscription suspended. Contact your supplier.',
      'SUBSCRIPTION_SUSPENDED',
      403
    );
  }
  return sub;
}
