import { z } from 'zod';
import { nameSchema } from './common';
import { subscriptionPlanSchema } from './farmer-subscription.schemas';

export const farmerCreateSchema = z.object({
  name: nameSchema,
  phone: z
    .string()
    .trim()
    .regex(/^\+?[1-9]\d{7,14}$/, 'Invalid phone number'),
  location: z.string().trim().max(200).optional(),
  supplier_id: z.string().uuid().optional(),
  subscription_plan: subscriptionPlanSchema.default('trial'),
});

export const farmerAssignSchema = z.object({
  supplier_id: z.string().uuid(),
});

export type FarmerCreateInput = z.infer<typeof farmerCreateSchema>;
export type FarmerAssignInput = z.infer<typeof farmerAssignSchema>;

