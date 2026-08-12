import { randomUUID } from 'crypto';
import { getCollection } from '@/lib/server/db/mongodb';
import { createNotification } from '@/lib/server/services/notification-inbox-service';
import { getActiveSubscriptionForFarmer } from '@/lib/server/services/farmer-subscription-service';
import type { FarmerAlertCreateInput } from '@/lib/server/validation/alert.schemas';

import { renderAlertTemplate } from '@/lib/server/utils/alert-template';

function computeNextRun(schedule: FarmerAlertCreateInput['schedule'], from = new Date()) {
  const next = new Date(from);
  next.setSeconds(0, 0);
  next.setHours(schedule.hour, schedule.minute, 0, 0);
  if (schedule.frequency === 'weekly') {
    if (next <= from) next.setDate(next.getDate() + 7);
  } else if (next <= from) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

async function resolveTargetFarmerIds(
  supplierId: string,
  target: { mode: string; farmer_ids?: string[] }
) {
  const users = await getCollection('users');
  if (target.mode === 'selected' && target.farmer_ids?.length) {
    const farmers = await users
      .find({
        _id: { $in: target.farmer_ids },
        role: 'farmer',
        supplier_id: supplierId,
      } as never)
      .toArray();
    return farmers.map((f) => ({
      id: String(f._id),
      name: f.name as string,
      location: (f.location as { locality?: string } | undefined)?.locality ?? '',
    }));
  }

  const farmers = await users.find({ role: 'farmer', supplier_id: supplierId } as never).toArray();
  return farmers.map((f) => ({
    id: String(f._id),
    name: f.name as string,
    location: (f.location as { locality?: string } | undefined)?.locality ?? '',
  }));
}

export interface AlertRunResult {
  alerts_processed: number;
  notifications_sent: number;
  skipped_no_subscription: number;
  errors: string[];
  ran_at: string;
}

export async function runDueAlerts(options?: { forceAlertId?: string }): Promise<AlertRunResult> {
  const now = new Date();
  const alertsCol = await getCollection('farmer_alerts');
  const runsCol = await getCollection('alert_runs');

  const filter: Record<string, unknown> = { enabled: true };
  if (options?.forceAlertId) {
    filter._id = options.forceAlertId;
  } else {
    filter.next_run_at = { $lte: now };
  }

  const dueAlerts = await alertsCol.find(filter as never).toArray();
  const result: AlertRunResult = {
    alerts_processed: 0,
    notifications_sent: 0,
    skipped_no_subscription: 0,
    errors: [],
    ran_at: now.toISOString(),
  };

  for (const alertDoc of dueAlerts) {
    result.alerts_processed += 1;
    const alertId = String(alertDoc._id);
    const supplierId = String(alertDoc.supplier_id);
    const target = alertDoc.target as { mode: string; farmer_ids?: string[] };
    const schedule = alertDoc.schedule as FarmerAlertCreateInput['schedule'];
    const channel = (alertDoc.channel as string) ?? 'in_app';
    const template = alertDoc.template as string;
    const alertName = alertDoc.name as string;

    try {
      const farmers = await resolveTargetFarmerIds(supplierId, target);

      for (const farmer of farmers) {
        const sub = await getActiveSubscriptionForFarmer(farmer.id);
        if (!sub || sub.status === 'expired' || sub.status === 'suspended') {
          result.skipped_no_subscription += 1;
          continue;
        }

        const body = renderAlertTemplate(template, {
          name: farmer.name,
          location: farmer.location,
          message: alertName,
        });

        if (channel === 'in_app' || channel === 'email') {
          await createNotification(farmer.id, {
            title: alertName,
            body,
            type: String(alertDoc.alert_type),
            alert_id: alertId,
            supplier_id: supplierId,
          });
          result.notifications_sent += 1;
        }

        await runsCol.insertOne({
          _id: randomUUID(),
          alert_id: alertId,
          farmer_id: farmer.id,
          supplier_id: supplierId,
          channel,
          status: channel === 'in_app' ? 'delivered' : 'skipped',
          detail: channel === 'in_app' ? body : `${channel} not configured yet`,
          created_at: now,
        } as never);
      }

      const nextRun = computeNextRun(schedule, now);
      await alertsCol.updateOne(
        { _id: alertDoc._id } as never,
        {
          $set: {
            last_run_at: now,
            next_run_at: nextRun,
            updated_at: now,
          },
        } as never
      );
    } catch (err) {
      result.errors.push(`${alertId}: ${err instanceof Error ? err.message : 'delivery failed'}`);
    }
  }

  const jobsCol = await getCollection('platform_jobs');
  await jobsCol.updateOne(
    { _id: 'alert-runner' } as never,
    {
      $set: {
        job_name: 'Farmer alert delivery',
        last_run_at: now,
        last_result: result,
        updated_at: now,
      },
      $setOnInsert: { enabled: true, created_at: now },
    } as never,
    { upsert: true }
  );

  return result;
}

export async function getAlertRunnerStatus() {
  const jobsCol = await getCollection('platform_jobs');
  const job = await jobsCol.findOne({ _id: 'alert-runner' } as never);
  const runsCol = await getCollection('alert_runs');
  const recentRuns = await runsCol.find({}).sort({ created_at: -1 }).limit(20).toArray();

  return {
    job: job
      ? {
          id: 'alert-runner',
          job_name: job.job_name ?? 'Farmer alert delivery',
          enabled: job.enabled !== false,
          last_run_at: job.last_run_at ?? null,
          last_result: job.last_result ?? null,
        }
      : {
          id: 'alert-runner',
          job_name: 'Farmer alert delivery',
          enabled: true,
          last_run_at: null,
          last_result: null,
        },
    recent_deliveries: recentRuns.map((r) => ({
      id: String(r._id),
      alert_id: String(r.alert_id),
      farmer_id: String(r.farmer_id),
      channel: r.channel,
      status: r.status,
      created_at: r.created_at,
    })),
  };
}
