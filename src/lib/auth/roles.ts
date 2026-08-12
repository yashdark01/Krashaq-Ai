export type Role = 'admin' | 'supplier' | 'farmer';

const ROLE_ALIASES: Record<string, Role> = {
  admin: 'admin',
  supplier: 'supplier',
  farmer: 'farmer',
  'pestisides-supplier': 'supplier',
};

export function normalizeRole(role: string | undefined | null): Role {
  if (!role) return 'farmer';
  return ROLE_ALIASES[role] ?? 'farmer';
}

export function hasRole(userRole: string | undefined | null, allowed: Role[]): boolean {
  return allowed.includes(normalizeRole(userRole));
}

export function isAdminRole(role: string | undefined | null): boolean {
  return normalizeRole(role) === 'admin';
}

export function isSupplierRole(role: string | undefined | null): boolean {
  return normalizeRole(role) === 'supplier';
}

export function isFarmerRole(role: string | undefined | null): boolean {
  return normalizeRole(role) === 'farmer';
}

export function canAccessFarmer(
  user: { id: string; role: string },
  farmer: { supplier_id?: string | null }
): boolean {
  const role = normalizeRole(user.role);
  if (role === 'admin') return true;
  if (role === 'supplier') {
    return Boolean(farmer.supplier_id && farmer.supplier_id === user.id);
  }
  return false;
}
