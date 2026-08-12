import { getMainNavForRole, getBottomNavForRole } from '@/lib/navigation/main-nav';

describe('main navigation by role', () => {
  it('shows farmers link for supplier only; admin uses suppliers hub', () => {
    const farmerNav = getMainNavForRole('farmer');
    const supplierNav = getMainNavForRole('supplier');
    const adminNav = getMainNavForRole('admin');

    expect(farmerNav.some((item) => item.href === '/farmers')).toBe(false);
    expect(supplierNav.some((item) => item.href === '/farmers')).toBe(true);
    expect(adminNav.some((item) => item.href === '/farmers')).toBe(false);
    expect(adminNav.some((item) => item.href === '/admin/suppliers')).toBe(true);
  });

  it('includes dashboard and chat for all roles', () => {
    expect(getMainNavForRole('farmer').some((item) => item.href === '/')).toBe(true);
    expect(getMainNavForRole('supplier').some((item) => item.href === '/supplier')).toBe(true);
    expect(getMainNavForRole('admin').some((item) => item.href === '/')).toBe(true);

    for (const role of ['farmer', 'supplier', 'admin']) {
      expect(getMainNavForRole(role).some((item) => item.href === '/chat')).toBe(true);
    }
  });

  it('filters bottom nav consistently', () => {
    expect(getBottomNavForRole('farmer')).toHaveLength(4);
    expect(getBottomNavForRole('supplier')).toHaveLength(6);
    expect(
      getBottomNavForRole('supplier').some((item) => item.href === '/supplier/subscriptions')
    ).toBe(true);
  });

  it('farmer sees subscription nav; supplier sees subscriptions hub', () => {
    expect(getMainNavForRole('farmer').some((item) => item.href === '/farmer/subscription')).toBe(
      true
    );
    expect(
      getMainNavForRole('supplier').some((item) => item.href === '/supplier/subscriptions')
    ).toBe(true);
  });
});
