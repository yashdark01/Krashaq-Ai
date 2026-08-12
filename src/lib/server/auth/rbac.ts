import { NextRequest, NextResponse } from 'next/server';
import { getUserFromAuthHeader } from '@/lib/server/services/auth-service';
import { hasRole, normalizeRole, canAccessFarmer, type Role } from '@/lib/auth/roles';

export type { Role };

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  supplier_id?: string | null;
  default_location?: string | null;
  email_verified?: boolean;
  two_factor_enabled?: boolean;
}

export class RBACError extends Error {
  constructor(
    message: string,
    public code: string = 'FORBIDDEN',
    public status: number = 403
  ) {
    super(message);
    this.name = 'RBACError';
  }
}

function forbidden(detail = 'Forbidden') {
  return NextResponse.json({ detail, code: 'FORBIDDEN' }, { status: 403 });
}

function unauthorized(detail = 'Unauthorized') {
  return NextResponse.json({ detail, code: 'UNAUTHORIZED' }, { status: 401 });
}

export function toAuthUser(
  user: Awaited<ReturnType<typeof getUserFromAuthHeader>>
): AuthUser | null {
  if (!user) return null;
  return {
    ...user,
    role: normalizeRole(user.role),
  };
}

export async function requireAuth(request: NextRequest | Request) {
  const user = toAuthUser(await getUserFromAuthHeader(request.headers.get('authorization')));
  if (!user) {
    return { success: false as const, response: unauthorized() };
  }
  return { success: true as const, user };
}

export function requireRole(user: AuthUser, ...roles: Role[]) {
  if (!hasRole(user.role, roles)) {
    throw new RBACError('Insufficient permissions', 'FORBIDDEN', 403);
  }
}

export async function requireAdmin(request: NextRequest | Request) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth;
  if (!hasRole(auth.user.role, ['admin'])) {
    return { success: false as const, response: forbidden('Admin access required') };
  }
  return auth;
}

export async function requireSupplierOrAdmin(request: NextRequest | Request) {
  const auth = await requireAuth(request);
  if (!auth.success) return auth;
  if (!hasRole(auth.user.role, ['admin', 'supplier'])) {
    return { success: false as const, response: forbidden('Supplier or admin access required') };
  }
  return auth;
}

export function assertRole(user: AuthUser, ...roles: Role[]): NextResponse | null {
  try {
    requireRole(user, ...roles);
    return null;
  } catch {
    return forbidden('Insufficient permissions');
  }
}

export { canAccessFarmer } from '@/lib/auth/roles';

function farmerAccessDenied() {
  return NextResponse.json(
    { detail: 'You do not have access to this farmer', code: 'FARMER_ACCESS_DENIED' },
    { status: 403 }
  );
}

export function assertFarmerAccess(
  user: AuthUser,
  farmer: { supplier_id?: string | null } | null
): NextResponse | null {
  if (!farmer) {
    return NextResponse.json({ detail: 'Farmer not found', code: 'NOT_FOUND' }, { status: 404 });
  }
  if (!canAccessFarmer(user, farmer)) {
    return farmerAccessDenied();
  }
  return null;
}
