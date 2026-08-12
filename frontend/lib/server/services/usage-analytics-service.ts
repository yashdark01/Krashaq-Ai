import { getCollection } from '@/lib/server/db/mongodb';
import { getLicenseBySupplierId } from '@/lib/server/services/supplier-license-service';
import { getSubscriptionStatsForSupplier } from '@/lib/server/services/farmer-subscription-service';

export interface ChatUsageSummary {
  chat_sessions: number;
  total_messages: number;
  messages_7d: number;
  messages_30d: number;
  last_active_at: string | null;
  active_7d: boolean;
}

export interface FarmerUsageRow extends ChatUsageSummary {
  farmer_id: string;
  name: string;
  phone: string | null;
  location: string | null;
  is_active: boolean;
  created_at: string | null;
}

export interface SupplierUsageAnalytics {
  supplier_id: string;
  summary: ChatUsageSummary & {
    farmer_count: number;
    active_farmers_7d: number;
    alerts_total: number;
    alerts_enabled: number;
    seat_utilization_pct: number;
  };
  subscription: {
    plan: string;
    status: string;
    max_farmers: number;
    valid_from: string;
    valid_until: string;
    days_until_expiry: number;
    features: Record<string, boolean>;
  } | null;
  subscription_stats: {
    active: number;
    trial: number;
    expired: number;
    suspended: number;
    revenue_inr: number;
  };
  farmers: FarmerUsageRow[];
}

function periodStarts() {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(now);
  monthStart.setDate(monthStart.getDate() - 30);
  return { weekStart, monthStart };
}

function emptyUsage(): ChatUsageSummary {
  return {
    chat_sessions: 0,
    total_messages: 0,
    messages_7d: 0,
    messages_30d: 0,
    last_active_at: null,
    active_7d: false,
  };
}

/** Aggregate chat usage for many user IDs in one query. */
export async function getChatUsageByUserIds(userIds: string[]): Promise<Map<string, ChatUsageSummary>> {
  const map = new Map<string, ChatUsageSummary>();
  for (const id of userIds) map.set(id, emptyUsage());
  if (userIds.length === 0) return map;

  const { weekStart, monthStart } = periodStarts();
  const sessions = await getCollection('chat_sessions');
  const docs = await sessions
    .find({ user_id: { $in: userIds } } as never)
    .project({ user_id: 1, messages: 1, updated_at: 1 })
    .toArray();

  for (const doc of docs) {
    const userId = String(doc.user_id);
    const entry = map.get(userId) ?? emptyUsage();
    entry.chat_sessions += 1;

    const msgs = (doc.messages as Array<{ timestamp?: Date | string }>) ?? [];
    entry.total_messages += msgs.length;

    for (const m of msgs) {
      if (!m.timestamp) continue;
      const ts = new Date(m.timestamp);
      if (ts >= monthStart) entry.messages_30d += 1;
      if (ts >= weekStart) entry.messages_7d += 1;
    }

    const updated = doc.updated_at ? new Date(doc.updated_at as Date) : null;
    if (updated) {
      const prev = entry.last_active_at ? new Date(entry.last_active_at) : null;
      if (!prev || updated > prev) entry.last_active_at = updated.toISOString();
      if (updated >= weekStart) entry.active_7d = true;
    }

    map.set(userId, entry);
  }

  return map;
}

export async function getFarmerUsageAnalytics(farmerId: string): Promise<FarmerUsageRow | null> {
  const users = await getCollection('users');
  const farmer = await users.findOne({ _id: farmerId, role: 'farmer' } as never);
  if (!farmer) return null;

  const usageMap = await getChatUsageByUserIds([farmerId]);
  const usage = usageMap.get(farmerId) ?? emptyUsage();

  return {
    farmer_id: farmerId,
    name: farmer.name as string,
    phone: (farmer.phone as string | undefined) ?? null,
    location: (farmer.location as { locality?: string } | undefined)?.locality ?? null,
    is_active: farmer.is_active !== false,
    created_at: farmer.created_at ? new Date(farmer.created_at as Date).toISOString() : null,
    ...usage,
  };
}

export async function getSupplierUsageAnalytics(supplierId: string): Promise<SupplierUsageAnalytics | null> {
  const users = await getCollection('users');
  const supplier = await users.findOne({
    _id: supplierId,
    role: { $in: ['supplier', 'pestisides-supplier'] },
  } as never);
  if (!supplier) return null;

  const farmers = await users
    .find({ role: 'farmer', supplier_id: supplierId })
    .sort({ created_at: -1 })
    .toArray();

  const farmerIds = farmers.map((f) => String(f._id));
  const usageMap = await getChatUsageByUserIds(farmerIds);

  const farmerRows: FarmerUsageRow[] = farmers.map((f) => {
    const id = String(f._id);
    const usage = usageMap.get(id) ?? emptyUsage();
    return {
      farmer_id: id,
      name: f.name as string,
      phone: (f.phone as string | undefined) ?? null,
      location: (f.location as { locality?: string } | undefined)?.locality ?? null,
      is_active: f.is_active !== false,
      created_at: f.created_at ? new Date(f.created_at as Date).toISOString() : null,
      ...usage,
    };
  });

  const alertsCol = await getCollection('farmer_alerts');
  const [alertsTotal, alertsEnabled] = await Promise.all([
    alertsCol.countDocuments({ supplier_id: supplierId } as never),
    alertsCol.countDocuments({ supplier_id: supplierId, enabled: true } as never),
  ]);

  const license = await getLicenseBySupplierId(supplierId);
  const subscriptionStats = await getSubscriptionStatsForSupplier(supplierId);
  const summaryBase = farmerRows.reduce(
    (acc, f) => {
      acc.chat_sessions += f.chat_sessions;
      acc.total_messages += f.total_messages;
      acc.messages_7d += f.messages_7d;
      acc.messages_30d += f.messages_30d;
      if (f.active_7d) acc.active_farmers_7d += 1;
      if (f.last_active_at) {
        const ts = new Date(f.last_active_at);
        if (!acc.last_active_at || ts > new Date(acc.last_active_at)) {
          acc.last_active_at = f.last_active_at;
        }
        if (f.active_7d) acc.active_7d = true;
      }
      return acc;
    },
    { ...emptyUsage(), active_farmers_7d: 0 }
  );

  const maxFarmers = license?.max_farmers ?? 0;
  const farmerCount = farmerRows.length;

  return {
    supplier_id: supplierId,
    summary: {
      ...summaryBase,
      farmer_count: farmerCount,
      active_farmers_7d: summaryBase.active_farmers_7d,
      alerts_total: alertsTotal,
      alerts_enabled: alertsEnabled,
      seat_utilization_pct:
        maxFarmers > 0 ? Math.round((farmerCount / maxFarmers) * 100) : farmerCount > 0 ? 100 : 0,
    },
    subscription: license
      ? {
          plan: license.plan,
          status: license.status,
          max_farmers: license.max_farmers,
          valid_from: new Date(license.valid_from as Date).toISOString(),
          valid_until: new Date(license.valid_until as Date).toISOString(),
          days_until_expiry: Math.ceil(
            (new Date(license.valid_until as Date).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
          ),
          features: { ...(license.features as object) } as Record<string, boolean>,
        }
      : null,
    subscription_stats: subscriptionStats,
    farmers: farmerRows,
  };
}

export async function getUsageSummariesForSuppliers(
  supplierIds: string[]
): Promise<Map<string, Pick<SupplierUsageAnalytics['summary'], 'chat_sessions' | 'total_messages' | 'messages_7d' | 'active_farmers_7d'>>> {
  const result = new Map<
    string,
    Pick<SupplierUsageAnalytics['summary'], 'chat_sessions' | 'total_messages' | 'messages_7d' | 'active_farmers_7d'>
  >();

  if (supplierIds.length === 0) return result;

  const users = await getCollection('users');
  const farmers = await users
    .find({ role: 'farmer', supplier_id: { $in: supplierIds } })
    .project({ _id: 1, supplier_id: 1 })
    .toArray();

  const farmerToSupplier = new Map<string, string>();
  for (const f of farmers) {
    farmerToSupplier.set(String(f._id), String(f.supplier_id));
  }

  const usageMap = await getChatUsageByUserIds(farmers.map((f) => String(f._id)));

  for (const supplierId of supplierIds) {
    result.set(supplierId, {
      chat_sessions: 0,
      total_messages: 0,
      messages_7d: 0,
      active_farmers_7d: 0,
    });
  }

  for (const [farmerId, usage] of usageMap) {
    const supplierId = farmerToSupplier.get(farmerId);
    if (!supplierId) continue;
    const entry = result.get(supplierId)!;
    entry.chat_sessions += usage.chat_sessions;
    entry.total_messages += usage.total_messages;
    entry.messages_7d += usage.messages_7d;
    if (usage.active_7d) entry.active_farmers_7d += 1;
  }

  return result;
}
