import {
  normalizeRole,
  hasRole,
  isAdminRole,
  isSupplierRole,
  isFarmerRole,
} from '@/lib/auth/roles';

describe('roles', () => {
  describe('normalizeRole', () => {
    it('maps pestisides-supplier to supplier', () => {
      expect(normalizeRole('pestisides-supplier')).toBe('supplier');
    });

    it('defaults unknown roles to farmer', () => {
      expect(normalizeRole('unknown')).toBe('farmer');
      expect(normalizeRole(null)).toBe('farmer');
    });

    it('preserves canonical roles', () => {
      expect(normalizeRole('admin')).toBe('admin');
      expect(normalizeRole('supplier')).toBe('supplier');
      expect(normalizeRole('farmer')).toBe('farmer');
    });
  });

  describe('hasRole', () => {
    it('allows supplier alias for supplier-only routes', () => {
      expect(hasRole('pestisides-supplier', ['supplier'])).toBe(true);
    });

    it('denies farmer from supplier routes', () => {
      expect(hasRole('farmer', ['admin', 'supplier'])).toBe(false);
    });
  });

  describe('role helpers', () => {
    it('identifies roles correctly', () => {
      expect(isAdminRole('admin')).toBe(true);
      expect(isSupplierRole('pestisides-supplier')).toBe(true);
      expect(isFarmerRole('farmer')).toBe(true);
      expect(isAdminRole('farmer')).toBe(false);
    });
  });
});
