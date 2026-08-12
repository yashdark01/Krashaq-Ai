import { randomUUID } from 'crypto';
import { getCollection } from '@/lib/server/db/mongodb';
import { hashPassword } from '@/lib/server/auth/password';
import { AuthError } from '@/lib/server/services/auth-service';
import {
  createSupplierLicense,
  getLicenseBySupplierId,
  getActiveLicenseForSupplier,
  countFarmersForSupplier,
  renewSupplierLicense,
  suspendSupplierLicense,
  reactivateSupplierLicense,
} from '@/lib/server/services/supplier-license-service';
import { logAdminAction } from '@/lib/server/services/audit-service';
import { getUsageSummariesForSuppliers } from '@/lib/server/services/usage-analytics-service';
import { sendTransactionalEmail } from '@/lib/server/services/notification-service';
import { supplierWelcomeEmail } from '@/lib/server/email/templates';
import type {
  SupplierOnboardInput,
  SupplierUpdateInput,
} from '@/lib/server/validation/supplier.schemas';
import type { LicensePlan } from '@/lib/server/validation/supplier.schemas';

function serializeSupplier(
  user: Record<string, unknown>,
  license: Record<string, unknown> | null,
  farmerCount: number
) {
  return {
    id: String(user._id),
    email: user.email as string,
    name: user.name as string,
    company_name: (user.company_name as string | undefined) ?? null,
    phone: (user.phone as string | undefined) ?? null,
    role: user.role as string,
    is_active: user.is_active !== false,
    suspension_reason: (user.suspension_reason as string | undefined) ?? null,
    suspended_at: user.suspended_at ?? null,
    onboarded_by: user.onboarded_by ? String(user.onboarded_by) : null,
    created_at: user.created_at,
    farmer_count: farmerCount,
    license: license
      ? {
          id: license.id,
          plan: license.plan,
          max_farmers: license.max_farmers,
          status: license.status,
          valid_from: license.valid_from,
          valid_until: license.valid_until,
          features: license.features,
        }
      : null,
  };
}

export async function listSuppliersWithLicenses() {
  const users = await getCollection('users');
  const suppliers = await users
    .find({ role: { $in: ['supplier', 'pestisides-supplier'] } })
    .sort({ created_at: -1 })
    .toArray();

  const supplierIds = suppliers.map((s) => String(s._id));
  const usageMap = await getUsageSummariesForSuppliers(supplierIds);

  const result = [];
  for (const s of suppliers) {
    const id = String(s._id);
    const license = await getLicenseBySupplierId(id);
    const farmerCount = await countFarmersForSupplier(id);
    const usage = usageMap.get(id);
    result.push({
      ...serializeSupplier(s as Record<string, unknown>, license, farmerCount),
      usage: usage ?? {
        chat_sessions: 0,
        total_messages: 0,
        messages_7d: 0,
        active_farmers_7d: 0,
      },
    });
  }
  return result;
}

export async function getSupplierDetail(supplierId: string) {
  const users = await getCollection('users');
  const user = await users.findOne({
    _id: supplierId,
    role: { $in: ['supplier', 'pestisides-supplier'] },
  } as never);
  if (!user) return null;

  const license = await getLicenseBySupplierId(supplierId);
  const farmerCount = await countFarmersForSupplier(supplierId);
  return serializeSupplier(user as Record<string, unknown>, license, farmerCount);
}

export async function onboardSupplier(
  adminId: string,
  adminName: string,
  data: SupplierOnboardInput
) {
  const users = await getCollection('users');
  const email = data.email.toLowerCase().trim();
  const existing = await users.findOne({ email });
  if (existing) throw new AuthError('Email already registered', 'EMAIL_EXISTS', 409);

  const supplierId = randomUUID();
  const passwordHash = await hashPassword(data.password);
  const now = new Date();
  const validUntil = data.valid_until ? new Date(data.valid_until) : undefined;

  const supplier = {
    _id: supplierId,
    email,
    name: data.name.trim(),
    company_name: data.company_name?.trim(),
    phone: data.phone?.trim(),
    password_hash: passwordHash,
    role: 'supplier',
    supplier_id: null,
    is_active: true,
    email_verified: true,
    two_factor_enabled: false,
    onboarded_by: adminId,
    created_at: now,
    updated_at: now,
  };

  await users.insertOne(supplier as never);
  const license = await createSupplierLicense(supplierId, data.plan, adminId, {
    valid_until: validUntil,
    max_farmers: data.max_farmers,
  });

  await logAdminAction(adminId, adminName, 'supplier.onboard', 'supplier', supplierId, {
    email,
    plan: data.plan,
  });

  try {
    const { subject, html, text } = supplierWelcomeEmail(data.name, email, data.password);
    await sendTransactionalEmail(email, subject, html, 'welcome', text);
  } catch (error) {
    console.error('Supplier welcome email failed:', error);
  }

  return serializeSupplier(supplier, license, 0);
}

export async function updateSupplier(supplierId: string, data: SupplierUpdateInput) {
  const users = await getCollection('users');
  const $set: Record<string, unknown> = { updated_at: new Date() };
  if (data.name !== undefined) $set.name = data.name.trim();
  if (data.company_name !== undefined) $set.company_name = data.company_name.trim();
  if (data.phone !== undefined) $set.phone = data.phone.trim();

  const result = await users.updateOne(
    { _id: supplierId, role: { $in: ['supplier', 'pestisides-supplier'] } } as never,
    { $set } as never
  );
  if (result.matchedCount === 0) return null;
  return getSupplierDetail(supplierId);
}

export async function suspendSupplier(
  supplierId: string,
  adminId: string,
  adminName: string,
  reason: string
) {
  const users = await getCollection('users');
  const now = new Date();
  const result = await users.updateOne(
    { _id: supplierId, role: { $in: ['supplier', 'pestisides-supplier'] } } as never,
    {
      $set: {
        is_active: false,
        suspension_reason: reason,
        suspended_at: now,
        suspended_by: adminId,
        updated_at: now,
      },
    } as never
  );
  if (result.matchedCount === 0) throw new AuthError('Supplier not found', 'NOT_FOUND', 404);

  await suspendSupplierLicense(supplierId, adminId);
  await logAdminAction(adminId, adminName, 'supplier.suspend', 'supplier', supplierId, { reason });
  return getSupplierDetail(supplierId);
}

export async function reactivateSupplier(supplierId: string, adminId: string, adminName: string) {
  const users = await getCollection('users');
  const result = await users.updateOne(
    { _id: supplierId, role: { $in: ['supplier', 'pestisides-supplier'] } } as never,
    {
      $set: {
        is_active: true,
        suspension_reason: null,
        suspended_at: null,
        suspended_by: null,
        updated_at: new Date(),
      },
    } as never
  );
  if (result.matchedCount === 0) throw new AuthError('Supplier not found', 'NOT_FOUND', 404);

  await reactivateSupplierLicense(supplierId, adminId);
  await logAdminAction(adminId, adminName, 'supplier.reactivate', 'supplier', supplierId, {});
  return getSupplierDetail(supplierId);
}

export async function renewSupplier(
  supplierId: string,
  adminId: string,
  adminName: string,
  patch: { plan?: LicensePlan; valid_until: Date; max_farmers?: number }
) {
  const detail = await getSupplierDetail(supplierId);
  if (!detail) throw new AuthError('Supplier not found', 'NOT_FOUND', 404);

  await renewSupplierLicense(supplierId, adminId, patch);
  await logAdminAction(adminId, adminName, 'supplier.renew_license', 'supplier', supplierId, patch);
  return getSupplierDetail(supplierId);
}

export async function getSupplierDashboardForUser(supplierId: string) {
  const license = await getActiveLicenseForSupplier(supplierId);
  const farmerCount = await countFarmersForSupplier(supplierId);
  const users = await getCollection('users');
  const user = await users.findOne({ _id: supplierId } as never);

  const usageMap = await getUsageSummariesForSuppliers([supplierId]);
  const usage = usageMap.get(supplierId);

  const alertsCol = await getCollection('farmer_alerts');
  const alertsEnabled = await alertsCol.countDocuments({
    supplier_id: supplierId,
    enabled: true,
  } as never);

  return {
    supplier: user
      ? {
          id: String(user._id),
          name: user.name as string,
          company_name: (user.company_name as string | undefined) ?? null,
          is_active: user.is_active !== false,
        }
      : null,
    farmer_count: farmerCount,
    license: license
      ? {
          plan: license.plan,
          max_farmers: license.max_farmers,
          status: license.status,
          valid_until: license.valid_until,
          seats_used: farmerCount,
          seats_remaining: Math.max(0, license.max_farmers - farmerCount),
          features: license.features,
        }
      : null,
    usage: usage ?? {
      chat_sessions: 0,
      total_messages: 0,
      messages_7d: 0,
      active_farmers_7d: 0,
    },
    alerts_enabled: alertsEnabled,
  };
}

export async function listFarmersForSupplierAdmin(supplierId: string) {
  const users = await getCollection('users');
  const farmers = await users
    .find({ role: 'farmer', supplier_id: supplierId })
    .sort({ created_at: -1 })
    .toArray();
  return farmers.map((f) => ({
    id: String(f._id),
    name: f.name as string,
    phone: (f.phone as string | undefined) ?? null,
    location: (f.location as { locality?: string } | undefined)?.locality ?? null,
    is_active: f.is_active !== false,
    created_at: f.created_at,
  }));
}
