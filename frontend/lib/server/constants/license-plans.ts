import type { LicensePlan } from '@/lib/server/validation/supplier.schemas';

export interface LicenseFeatures {
  alerts: boolean;
  whatsapp: boolean;
  advanced_analytics: boolean;
}

export const LICENSE_PLAN_DEFAULTS: Record<
  LicensePlan,
  { max_farmers: number; features: LicenseFeatures }
> = {
  trial: { max_farmers: 10, features: { alerts: true, whatsapp: false, advanced_analytics: false } },
  starter: { max_farmers: 25, features: { alerts: true, whatsapp: false, advanced_analytics: false } },
  growth: { max_farmers: 100, features: { alerts: true, whatsapp: true, advanced_analytics: false } },
  enterprise: {
    max_farmers: 9999,
    features: { alerts: true, whatsapp: true, advanced_analytics: true },
  },
};
