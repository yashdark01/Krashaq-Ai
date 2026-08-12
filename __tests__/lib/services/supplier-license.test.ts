import { LICENSE_PLAN_DEFAULTS } from '@/lib/server/constants/license-plans';

describe('LICENSE_PLAN_DEFAULTS', () => {
  it('defines seat limits per plan', () => {
    expect(LICENSE_PLAN_DEFAULTS.starter.max_farmers).toBe(25);
    expect(LICENSE_PLAN_DEFAULTS.growth.max_farmers).toBe(100);
    expect(LICENSE_PLAN_DEFAULTS.enterprise.max_farmers).toBe(9999);
    expect(LICENSE_PLAN_DEFAULTS.trial.max_farmers).toBe(10);
  });

  it('enables alerts on all plans', () => {
    for (const plan of Object.values(LICENSE_PLAN_DEFAULTS)) {
      expect(plan.features.alerts).toBe(true);
    }
  });
});
