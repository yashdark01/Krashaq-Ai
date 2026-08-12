import { canAccessFarmer } from '@/lib/auth/roles';

describe('canAccessFarmer', () => {
  const supplierUser = {
    id: 'supplier-1',
    role: 'supplier',
  };

  const adminUser = {
    id: 'admin-1',
    role: 'admin',
  };

  it('allows admin to access any farmer', () => {
    expect(canAccessFarmer(adminUser, { supplier_id: 'other-supplier' })).toBe(true);
  });

  it('allows supplier to access own farmers only', () => {
    expect(canAccessFarmer(supplierUser, { supplier_id: 'supplier-1' })).toBe(true);
    expect(canAccessFarmer(supplierUser, { supplier_id: 'supplier-2' })).toBe(false);
    expect(canAccessFarmer(supplierUser, { supplier_id: null })).toBe(false);
  });
});
