import { z } from 'zod';
import { nameSchema } from './common';

export const licensePlanSchema = z.enum(['starter', 'growth', 'enterprise', 'trial']);

export type LicensePlan = z.infer<typeof licensePlanSchema>;

export const supplierOnboardSchema = z.object({
  email: z.string().email().max(120),
  password: z.string().min(8).max(128),
  name: nameSchema,
  company_name: z.string().trim().min(1).max(120).optional(),
  phone: z.string().trim().max(20).optional(),
  plan: licensePlanSchema.default('starter'),
  valid_until: z.string().datetime().optional(),
  max_farmers: z.number().int().min(1).max(10000).optional(),
});

export const supplierUpdateSchema = z.object({
  name: nameSchema.optional(),
  company_name: z.string().trim().min(1).max(120).optional(),
  phone: z.string().trim().max(20).optional(),
});

export const supplierSuspendSchema = z.object({
  reason: z.string().trim().min(1).max(500),
});

export const supplierRenewSchema = z.object({
  plan: licensePlanSchema.optional(),
  valid_until: z.string().datetime(),
  max_farmers: z.number().int().min(1).max(10000).optional(),
});

export type SupplierOnboardInput = z.infer<typeof supplierOnboardSchema>;
export type SupplierUpdateInput = z.infer<typeof supplierUpdateSchema>;
