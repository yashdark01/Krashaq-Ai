import { getCollection } from '@/lib/server/db/mongodb';
import { getConfig } from '@/lib/server/config';
import { isTavilyConfigured } from '@/lib/server/services/tavily-search';

export async function getAdminDashboardStats() {
  const users = await getCollection('users');
  const sessions = await getCollection('chat_sessions');
  const refreshTokens = await getCollection('refresh_tokens');

  const [totalUsers, farmers, suppliers, admins, activeSessions, chatSessions] = await Promise.all([
    users.countDocuments({}),
    users.countDocuments({ role: 'farmer' }),
    users.countDocuments({ role: { $in: ['supplier', 'pestisides-supplier'] } }),
    users.countDocuments({ role: 'admin' }),
    refreshTokens.countDocuments({ revoked: false, expires_at: { $gt: new Date() } }),
    sessions.countDocuments({}),
  ]);

  const cfg = getConfig();

  const licenses = await getCollection('supplier_licenses');
  const activeLicenses = await licenses.countDocuments({
    status: { $in: ['active', 'trial'] },
    valid_until: { $gt: new Date() },
  });
  const suspendedSuppliers = await users.countDocuments({
    role: { $in: ['supplier', 'pestisides-supplier'] },
    is_active: false,
  });

  return {
    users: {
      total: totalUsers,
      farmers,
      suppliers,
      admins,
      suspended_suppliers: suspendedSuppliers,
    },
    licenses: { active: activeLicenses },
    sessions: { active: activeSessions, chat_sessions: chatSessions },
    services: {
      mongodb: true,
      smtp: Boolean(cfg.smtpHost && cfg.smtpUser),
      weather: Boolean(cfg.weatherApiKey),
      llm: Boolean(cfg.groqApiKey || cfg.openaiApiKey || cfg.googleApiKey),
      tavily: isTavilyConfigured(),
      langsmith: Boolean(cfg.langsmithApiKey && cfg.langsmithTracing),
    },
  };
}

export async function listAdminUsers(skip = 0, limit = 50, q?: string, excludeSuppliers = true) {
  const users = await getCollection('users');
  const filter: Record<string, unknown> = {};
  if (excludeSuppliers) {
    filter.role = { $nin: ['supplier', 'pestisides-supplier'] };
  }
  if (q?.trim()) {
    filter.$or = [
      { email: { $regex: q.trim(), $options: 'i' } },
      { name: { $regex: q.trim(), $options: 'i' } },
    ];
  }

  const docs = await users.find(filter).skip(skip).limit(limit).sort({ created_at: -1 }).toArray();
  return docs.map((u) => ({
    id: String(u._id),
    email: u.email,
    name: u.name,
    role: u.role,
    is_active: u.is_active !== false,
    email_verified: Boolean(u.email_verified),
    two_factor_enabled: Boolean(u.two_factor_enabled),
    created_at: u.created_at,
  }));
}

export async function getAdminAnalyticsStats() {
  const users = await getCollection('users');
  const sessions = await getCollection('chat_sessions');
  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(now);
  monthStart.setDate(monthStart.getDate() - 30);

  const [totalUsers, activeUsers, newToday, newWeek, newMonth, allUsers, chatDocs, activeSessions] =
    await Promise.all([
      users.countDocuments({}),
      users.countDocuments({ is_active: { $ne: false } }),
      users.countDocuments({ created_at: { $gte: dayStart } }),
      users.countDocuments({ created_at: { $gte: weekStart } }),
      users.countDocuments({ created_at: { $gte: monthStart } }),
      users.find({}).project({ role: 1 }).toArray(),
      sessions.find({}).project({ messages: 1, updated_at: 1 }).toArray(),
      sessions.countDocuments({ updated_at: { $gte: weekStart } }),
    ]);

  const by_role: Record<string, number> = {};
  for (const u of allUsers) {
    const role = String(u.role ?? 'farmer');
    by_role[role] = (by_role[role] ?? 0) + 1;
  }

  let totalMessages = 0;
  let messagesToday = 0;
  for (const doc of chatDocs) {
    const msgs = (doc.messages as Array<{ timestamp?: Date }>) ?? [];
    totalMessages += msgs.length;
    for (const m of msgs) {
      if (m.timestamp && new Date(m.timestamp) >= dayStart) messagesToday++;
    }
  }

  const mem = process.memoryUsage();

  return {
    users: {
      total_users: totalUsers,
      active_users: activeUsers,
      new_users_today: newToday,
      new_users_week: newWeek,
      new_users_month: newMonth,
      by_role,
      by_language: { en: totalUsers },
    },
    chat: {
      total_messages: totalMessages,
      messages_today: messagesToday,
      avg_response_time: 1.2,
      active_sessions: activeSessions,
    },
    weather: {
      total_requests: 0,
      requests_today: 0,
    },
    system: {
      uptime: process.uptime() / 3600,
      memory_usage: (mem.heapUsed / mem.heapTotal) * 100,
      cpu_usage: 0,
    },
  };
}

export async function getSupplierDashboardStats(supplierId: string) {
  const users = await getCollection('users');
  const sessions = await getCollection('chat_sessions');

  const farmerCount = await users.countDocuments({ role: 'farmer', supplier_id: supplierId });
  const recentChats = await sessions.countDocuments({ user_id: supplierId });

  return { farmer_count: farmerCount, my_chat_sessions: recentChats };
}

export async function getAdminUserById(userId: string) {
  const users = await getCollection('users');
  const user = await users.findOne({ _id: userId } as never);
  if (!user) return null;
  return {
    id: String(user._id),
    email: user.email,
    name: user.name,
    role: user.role,
    is_active: user.is_active !== false,
    email_verified: Boolean(user.email_verified),
    two_factor_enabled: Boolean(user.two_factor_enabled),
    created_at: user.created_at,
  };
}

export async function updateAdminUser(userId: string, patch: Record<string, unknown>) {
  const users = await getCollection('users');
  const allowed = ['name', 'role', 'is_active', 'default_location'];
  const $set: Record<string, unknown> = { updated_at: new Date() };
  for (const key of allowed) {
    if (key in patch) $set[key] = patch[key];
  }
  const result = await users.updateOne({ _id: userId } as never, { $set } as never);
  return result.matchedCount > 0;
}

export async function setUserRole(userId: string, role: string) {
  return updateAdminUser(userId, { role });
}

export async function setUserActive(userId: string, isActive: boolean) {
  return updateAdminUser(userId, { is_active: isActive });
}
