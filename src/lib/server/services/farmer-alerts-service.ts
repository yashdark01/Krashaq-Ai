import { randomUUID } from 'crypto';
import { getCollection } from '@/lib/server/db/mongodb';
import type { FarmerAlertCreateInput } from '@/lib/server/validation/alert.schemas';

function serializeAlert(doc: Record<string, unknown>) {
  return {
    id: String(doc._id),
    supplier_id: String(doc.supplier_id),
    name: doc.name as string,
    alert_type: doc.alert_type as string,
    schedule: doc.schedule,
    target: doc.target,
    template: doc.template as string,
    channel: doc.channel as string,
    enabled: Boolean(doc.enabled),
    last_run_at: doc.last_run_at ?? null,
    next_run_at: doc.next_run_at ?? null,
    created_at: doc.created_at,
    updated_at: doc.updated_at,
  };
}

function computeNextRun(schedule: FarmerAlertCreateInput['schedule']) {
  const next = new Date();
  next.setSeconds(0, 0);
  next.setHours(schedule.hour, schedule.minute, 0, 0);
  if (next <= new Date()) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

export async function listAlertsForSupplier(supplierId: string) {
  const col = await getCollection('farmer_alerts');
  const docs = await col
    .find({ supplier_id: supplierId } as never)
    .sort({ created_at: -1 })
    .toArray();
  return docs.map((d) => serializeAlert(d as Record<string, unknown>));
}

export async function createAlertForSupplier(supplierId: string, data: FarmerAlertCreateInput) {
  const col = await getCollection('farmer_alerts');
  const now = new Date();
  const defaultTemplate =
    data.template ??
    (data.alert_type === 'weather'
      ? "Good morning {{name}}! Check today's weather for {{location}} in your Krashaq dashboard."
      : 'Reminder from your supplier: {{message}}');

  const alert = {
    _id: randomUUID(),
    supplier_id: supplierId,
    name: data.name,
    alert_type: data.alert_type,
    schedule: data.schedule,
    target: data.target,
    template: defaultTemplate,
    channel: data.channel,
    enabled: data.enabled,
    last_run_at: null,
    next_run_at: computeNextRun(data.schedule),
    created_at: now,
    updated_at: now,
  };

  await col.insertOne(alert as never);
  return serializeAlert(alert);
}

export async function updateAlertForSupplier(
  supplierId: string,
  alertId: string,
  patch: Partial<FarmerAlertCreateInput>
) {
  const col = await getCollection('farmer_alerts');
  const $set: Record<string, unknown> = { updated_at: new Date() };
  if (patch.name !== undefined) $set.name = patch.name;
  if (patch.alert_type !== undefined) $set.alert_type = patch.alert_type;
  if (patch.schedule !== undefined) {
    $set.schedule = patch.schedule;
    $set.next_run_at = computeNextRun(patch.schedule);
  }
  if (patch.target !== undefined) $set.target = patch.target;
  if (patch.template !== undefined) $set.template = patch.template;
  if (patch.channel !== undefined) $set.channel = patch.channel;
  if (patch.enabled !== undefined) $set.enabled = patch.enabled;

  const result = await col.updateOne(
    { _id: alertId, supplier_id: supplierId } as never,
    { $set } as never
  );
  if (result.matchedCount === 0) return null;

  const doc = await col.findOne({ _id: alertId } as never);
  return doc ? serializeAlert(doc as Record<string, unknown>) : null;
}

export async function deleteAlertForSupplier(supplierId: string, alertId: string) {
  const col = await getCollection('farmer_alerts');
  const result = await col.deleteOne({ _id: alertId, supplier_id: supplierId } as never);
  return result.deletedCount > 0;
}

export async function getAlertForSupplier(supplierId: string, alertId: string) {
  const col = await getCollection('farmer_alerts');
  const doc = await col.findOne({ _id: alertId, supplier_id: supplierId } as never);
  return doc ? serializeAlert(doc as Record<string, unknown>) : null;
}
