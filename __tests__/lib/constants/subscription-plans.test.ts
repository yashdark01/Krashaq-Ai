import { SUBSCRIPTION_PLAN_DEFAULTS } from '@/lib/server/constants/subscription-plans';

describe('SUBSCRIPTION_PLAN_DEFAULTS', () => {
  it('defines trial, basic, standard, premium with duration and price', () => {
    expect(SUBSCRIPTION_PLAN_DEFAULTS.trial.duration_days).toBe(14);
    expect(SUBSCRIPTION_PLAN_DEFAULTS.trial.price_inr).toBe(0);
    expect(SUBSCRIPTION_PLAN_DEFAULTS.basic.features.chat).toBe(true);
    expect(SUBSCRIPTION_PLAN_DEFAULTS.premium.features.advanced_advisory).toBe(true);
  });
});
