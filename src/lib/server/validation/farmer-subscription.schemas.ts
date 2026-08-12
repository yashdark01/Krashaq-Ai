import { z } from 'zod';

export const subscriptionPlanSchema = z.enum(['trial', 'basic', 'standard', 'premium']);
export type SubscriptionPlan = z.infer<typeof subscriptionPlanSchema>;

export const farmerSubscriptionIssueSchema = z.object({
  plan: subscriptionPlanSchema.default('trial'),
  valid_until: z.string().datetime().optional(),
});

export const farmerSubscriptionRenewSchema = z.object({
  plan: subscriptionPlanSchema.optional(),
  valid_until: z.string().datetime(),
});

export type FarmerSubscriptionIssueInput = z.infer<typeof farmerSubscriptionIssueSchema>;
export type FarmerSubscriptionRenewInput = z.infer<typeof farmerSubscriptionRenewSchema>;
