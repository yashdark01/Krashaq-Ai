import type { SubscriptionPlan } from '@/lib/server/validation/farmer-subscription.schemas';

export interface SubscriptionFeatures {
  chat: boolean;
  weather: boolean;
  alerts: boolean;
  advanced_advisory: boolean;
}

/** Plans a supplier sells to their farmers (mirrors admin → supplier license model). */
export const SUBSCRIPTION_PLAN_DEFAULTS: Record<
  SubscriptionPlan,
  { duration_days: number; price_inr: number; features: SubscriptionFeatures }
> = {
  trial: {
    duration_days: 14,
    price_inr: 0,
    features: { chat: true, weather: true, alerts: false, advanced_advisory: false },
  },
  basic: {
    duration_days: 30,
    price_inr: 99,
    features: { chat: true, weather: true, alerts: false, advanced_advisory: false },
  },
  standard: {
    duration_days: 90,
    price_inr: 249,
    features: { chat: true, weather: true, alerts: true, advanced_advisory: false },
  },
  premium: {
    duration_days: 365,
    price_inr: 799,
    features: { chat: true, weather: true, alerts: true, advanced_advisory: true },
  },
};
