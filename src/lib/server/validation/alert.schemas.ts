import { z } from 'zod';

export const alertTypeSchema = z.enum(['weather', 'irrigation', 'custom', 'scheme']);
export const alertChannelSchema = z.enum(['in_app', 'sms', 'whatsapp', 'email']);
export const alertFrequencySchema = z.enum(['daily', 'weekly']);

export const farmerAlertCreateSchema = z.object({
  name: z.string().trim().min(1).max(120),
  alert_type: alertTypeSchema.default('weather'),
  schedule: z.object({
    frequency: alertFrequencySchema.default('daily'),
    hour: z.number().int().min(0).max(23).default(7),
    minute: z.number().int().min(0).max(59).default(0),
    timezone: z.string().default('Asia/Kolkata'),
  }),
  target: z.object({
    mode: z.enum(['all_farmers', 'selected']).default('all_farmers'),
    farmer_ids: z.array(z.string().uuid()).optional(),
  }),
  template: z.string().trim().min(1).max(2000).optional(),
  channel: alertChannelSchema.default('in_app'),
  enabled: z.boolean().default(true),
});

export const farmerAlertUpdateSchema = farmerAlertCreateSchema.partial();

export type FarmerAlertCreateInput = z.infer<typeof farmerAlertCreateSchema>;
