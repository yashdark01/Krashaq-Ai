import { randomUUID } from 'crypto';
import { getCollection } from '@/lib/server/db/mongodb';

export async function logAdminAction(
  adminUserId: string,
  adminUserName: string,
  action: string,
  targetType: string,
  targetId: string | null,
  details?: Record<string, unknown>
) {
  try {
    const col = await getCollection('audit_logs');
    await col.insertOne({
      _id: randomUUID(),
      admin_user_id: adminUserId,
      admin_user_name: adminUserName,
      action,
      target_type: targetType,
      target_id: targetId,
      details: details ?? null,
      created_at: new Date(),
    } as never);
  } catch (error) {
    console.warn('Failed to write audit log:', error);
  }
}

export async function listAuditLogs(limit = 100) {
  const col = await getCollection('audit_logs');
  const docs = await col.find({}).sort({ created_at: -1 }).limit(limit).toArray();
  return docs.map((d) => ({
    id: String(d._id),
    admin_user_id: String(d.admin_user_id),
    admin_user_name: d.admin_user_name as string,
    action: d.action as string,
    target_type: d.target_type as string,
    target_id: d.target_id ? String(d.target_id) : null,
    details: d.details ? JSON.stringify(d.details) : null,
    created_at: d.created_at,
  }));
}
