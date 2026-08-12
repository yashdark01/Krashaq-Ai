import { randomUUID } from 'crypto';
import { getCollection } from '@/lib/server/db/mongodb';

export interface NotificationInput {
  title: string;
  body: string;
  type?: string;
  alert_id?: string;
  supplier_id?: string;
}

function serialize(doc: Record<string, unknown>) {
  return {
    id: String(doc._id),
    user_id: String(doc.user_id),
    title: doc.title as string,
    body: doc.body as string,
    type: (doc.type as string) ?? 'alert',
    alert_id: doc.alert_id ? String(doc.alert_id) : null,
    supplier_id: doc.supplier_id ? String(doc.supplier_id) : null,
    read: Boolean(doc.read),
    created_at: doc.created_at,
  };
}

export async function ensureNotificationIndexes() {
  const col = await getCollection('notifications');
  await col.createIndex({ user_id: 1, read: 1, created_at: -1 });
}

export async function createNotification(userId: string, data: NotificationInput) {
  const col = await getCollection('notifications');
  const doc = {
    _id: randomUUID(),
    user_id: userId,
    title: data.title,
    body: data.body,
    type: data.type ?? 'alert',
    alert_id: data.alert_id ?? null,
    supplier_id: data.supplier_id ?? null,
    read: false,
    created_at: new Date(),
  };
  await col.insertOne(doc as never);
  return serialize(doc);
}

export async function listNotificationsForUser(userId: string, limit = 50) {
  const col = await getCollection('notifications');
  const docs = await col
    .find({ user_id: userId } as never)
    .sort({ created_at: -1 })
    .limit(limit)
    .toArray();
  return docs.map((d) => serialize(d as Record<string, unknown>));
}

export async function countUnreadNotifications(userId: string) {
  const col = await getCollection('notifications');
  return col.countDocuments({ user_id: userId, read: false } as never);
}

export async function markNotificationRead(userId: string, notificationId: string) {
  const col = await getCollection('notifications');
  const result = await col.updateOne(
    { _id: notificationId, user_id: userId } as never,
    { $set: { read: true, read_at: new Date() } } as never
  );
  return result.matchedCount > 0;
}

export async function markAllNotificationsRead(userId: string) {
  const col = await getCollection('notifications');
  await col.updateMany(
    { user_id: userId, read: false } as never,
    { $set: { read: true, read_at: new Date() } } as never
  );
}
