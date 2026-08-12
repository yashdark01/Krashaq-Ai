import { randomUUID } from 'crypto';
import { getCollection } from '@/lib/server/db/mongodb';
import { AuthError } from '@/lib/server/services/auth-service';
import type { LicensePlan } from '@/lib/server/validation/supplier.schemas';
import { LICENSE_PLAN_DEFAULTS, type LicenseFeatures } from '@/lib/server/constants/license-plans';

export type LicenseStatus = 'active' | 'expired' | 'suspended' | 'trial';

export type { LicenseFeatures };
export { LICENSE_PLAN_DEFAULTS };

function serializeLicense(doc: Record<string, unknown>) {
  return {
    id: String(doc._id),
    supplier_id: String(doc.supplier_id),
    plan: doc.plan as string,
    max_farmers: doc.max_farmers as number,
    status: doc.status as LicenseStatus,
    valid_from: doc.valid_from,
    valid_until: doc.valid_until,
    features: doc.features as LicenseFeatures,
    created_at: doc.created_at,
    updated_by: doc.updated_by ? String(doc.updated_by) : null,
  };
}

export async function ensureLicenseIndexes() {
  const col = await getCollection('supplier_licenses');
  await col.createIndex({ supplier_id: 1 });
  await col.createIndex({ status: 1, valid_until: 1 });
}

export async function createSupplierLicense(
  supplierId: string,
  plan: LicensePlan,
  adminId: string,
  options?: { valid_until?: Date; max_farmers?: number }
) {
  const defaults = LICENSE_PLAN_DEFAULTS[plan];
  const validFrom = new Date();
  const validUntil =
    options?.valid_until ??
    new Date(validFrom.getTime() + (plan === 'trial' ? 14 : 365) * 24 * 60 * 60 * 1000);

  const license = {
    _id: randomUUID(),
    supplier_id: supplierId,
    plan,
    max_farmers: options?.max_farmers ?? defaults.max_farmers,
    status: 'active' as LicenseStatus,
    valid_from: validFrom,
    valid_until: validUntil,
    features: { ...defaults.features },
    created_at: new Date(),
    updated_by: adminId,
  };

  const col = await getCollection('supplier_licenses');
  await col.insertOne(license as never);
  return serializeLicense(license);
}

export async function getActiveLicenseForSupplier(supplierId: string) {
  const col = await getCollection('supplier_licenses');
  const docs = await col
    .find({ supplier_id: supplierId, status: { $in: ['active', 'trial'] } } as never)
    .sort({ valid_until: -1 })
    .limit(1)
    .toArray();
  const doc = docs[0];
  if (!doc) return null;

  const license = serializeLicense(doc as Record<string, unknown>);
  if (new Date(license.valid_until as string | Date) < new Date()) {
    await col.updateOne(
      { _id: doc._id } as never,
      { $set: { status: 'expired', updated_at: new Date() } } as never
    );
    return { ...license, status: 'expired' as LicenseStatus };
  }
  return license;
}

export async function getLicenseBySupplierId(supplierId: string) {
  const col = await getCollection('supplier_licenses');
  const docs = await col
    .find({ supplier_id: supplierId } as never)
    .sort({ created_at: -1 })
    .limit(1)
    .toArray();
  const doc = docs[0];
  return doc ? serializeLicense(doc as Record<string, unknown>) : null;
}

export async function reactivateSupplierLicense(supplierId: string, adminId: string) {
  const col = await getCollection('supplier_licenses');
  const docs = await col
    .find({ supplier_id: supplierId } as never)
    .sort({ created_at: -1 })
    .limit(1)
    .toArray();
  const latest = docs[0];
  if (!latest) return;
  const validUntil = new Date(latest.valid_until as string | Date);
  const status = validUntil > new Date() ? 'active' : 'expired';
  await col.updateOne(
    { _id: latest._id } as never,
    { $set: { status, updated_by: adminId, updated_at: new Date() } } as never
  );
}

export async function suspendSupplierLicense(supplierId: string, adminId: string) {
  const col = await getCollection('supplier_licenses');
  await col.updateMany(
    { supplier_id: supplierId, status: { $in: ['active', 'trial'] } } as never,
    { $set: { status: 'suspended', updated_by: adminId, updated_at: new Date() } } as never
  );
}

export async function renewSupplierLicense(
  supplierId: string,
  adminId: string,
  patch: { plan?: LicensePlan; valid_until: Date; max_farmers?: number }
) {
  await suspendSupplierLicense(supplierId, adminId);
  const plan = patch.plan ?? 'starter';
  return createSupplierLicense(supplierId, plan, adminId, {
    valid_until: patch.valid_until,
    max_farmers: patch.max_farmers,
  });
}

export async function countFarmersForSupplier(supplierId: string) {
  const users = await getCollection('users');
  return users.countDocuments({ role: 'farmer', supplier_id: supplierId });
}

export async function assertSupplierLicenseAllowsLogin(supplierId: string) {
  const license = await getActiveLicenseForSupplier(supplierId);
  if (!license) {
    throw new AuthError('No active license. Contact Krashaq support.', 'LICENSE_INACTIVE', 403);
  }
  if (license.status === 'expired') {
    throw new AuthError('License expired. Contact Krashaq to renew.', 'LICENSE_EXPIRED', 403);
  }
  if (license.status === 'suspended') {
    throw new AuthError('License suspended. Contact Krashaq support.', 'LICENSE_SUSPENDED', 403);
  }
  return license;
}

export async function assertCanAddFarmer(supplierId: string) {
  const license = await assertSupplierLicenseAllowsLogin(supplierId);
  const count = await countFarmersForSupplier(supplierId);
  if (count >= license.max_farmers) {
    throw new AuthError(
      `Farmer seat limit reached (${license.max_farmers}). Upgrade your license.`,
      'LICENSE_SEAT_LIMIT',
      403
    );
  }
  return { license, farmer_count: count };
}
