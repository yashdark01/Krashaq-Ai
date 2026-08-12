import { randomUUID } from 'crypto';
import { getCollection } from '@/lib/server/db/mongodb';
import { hashPassword, verifyPassword } from '@/lib/server/auth/password';
import { createAccessToken } from '@/lib/server/auth/jwt';
import {
  createRefreshSession,
  findValidRefreshSession,
  revokeRefreshSession,
  rotateRefreshSession,
  listUserSessions,
  revokeRefreshSessionById,
  extractRequestMeta,
  type SessionMeta,
} from '@/lib/server/auth/session-service';
import { verifyToken } from '@/lib/server/auth/jwt';
import { normalizeRole } from '@/lib/auth/roles';
import type { SignupInput } from '@/lib/server/validation/auth.schemas';
import { sendSignupEmails } from '@/lib/server/services/email-auth-service';
import { createMfaChallenge } from '@/lib/server/auth/mfa-service';
import { assertSupplierLicenseAllowsLogin } from '@/lib/server/services/supplier-license-service';
import { assertFarmerSubscriptionAllowsLogin } from '@/lib/server/services/farmer-subscription-service';
import { isSupplierRole, isFarmerRole } from '@/lib/auth/roles';

export class AuthError extends Error {
  constructor(
    message: string,
    public code: string = 'AUTH_ERROR',
    public status: number = 400
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

function userIdFromDoc(user: { _id?: unknown }): string {
  return String(user._id);
}

export function serializeUser(user: Record<string, unknown>) {
  const location = (user.location as Record<string, string> | undefined) ?? {};
  return {
    id: String(user._id),
    email: user.email as string,
    name: user.name as string,
    default_location: location.locality ?? null,
    role: normalizeRole((user.role as string) ?? 'farmer'),
    supplier_id: user.supplier_id ? String(user.supplier_id) : null,
    state: location.state ?? null,
    district: location.district ?? null,
    tehsil: location.tehsil ?? null,
    locality: location.locality ?? null,
    pincode: location.pincode ?? null,
    language: (user.language as string) ?? 'hi',
    email_verified: Boolean(user.email_verified),
    two_factor_enabled: Boolean(user.two_factor_enabled),
  };
}

async function issueAuthTokens(
  userId: string,
  email: string,
  role: string,
  user: Record<string, unknown>,
  meta?: SessionMeta,
  sessionId?: string
) {
  const accessToken = await createAccessToken({ sub: userId, email, role, sid: sessionId });
  const session = await createRefreshSession(userId, meta);

  return {
    access_token: accessToken,
    refresh_token: session.refreshToken,
    session_id: session.sessionId,
    user: serializeUser(user),
    requires_2fa: Boolean(user.two_factor_enabled),
  };
}

export async function signupUser(data: SignupInput, meta?: SessionMeta) {
  const users = await getCollection('users');
  const email = data.email.toLowerCase();
  const existing = await users.findOne({ email });
  if (existing) throw new AuthError('User with this email already exists', 'EMAIL_EXISTS', 409);

  const userId = randomUUID();
  const passwordHash = await hashPassword(data.password);

  const user = {
    _id: userId,
    email,
    name: data.name.trim(),
    password_hash: passwordHash,
    phone: data.phone?.trim() || undefined,
    location: {
      state: data.state,
      district: data.district,
      tehsil: data.tehsil,
      locality: data.locality,
      pincode: data.pincode,
    },
    role: 'farmer',
    supplier_id: null,
    language: 'hi',
    is_active: true,
    email_verified: false,
    two_factor_enabled: false,
    phone_verified: false,
    created_at: new Date(),
    updated_at: new Date(),
  };

  await users.insertOne(user as never);

  try {
    await sendSignupEmails(userId, user.name, email);
  } catch (error) {
    console.error('Failed to send signup emails:', error);
  }

  return issueAuthTokens(userId, email, user.role, user, meta);
}

export async function loginWithEmail(email: string, password: string, meta?: SessionMeta) {
  const users = await getCollection('users');
  const normalizedEmail = email.toLowerCase().trim();
  const user = await users.findOne({ email: normalizedEmail });
  if (!user?.password_hash) {
    throw new AuthError('Invalid email or password', 'INVALID_CREDENTIALS', 401);
  }

  if (user.is_active === false) {
    throw new AuthError('Account is deactivated', 'ACCOUNT_INACTIVE', 403);
  }

  const role = normalizeRole((user.role as string) ?? 'farmer');
  if (isSupplierRole(role)) {
    await assertSupplierLicenseAllowsLogin(userIdFromDoc(user));
  }
  if (isFarmerRole(role)) {
    const supplierId = user.supplier_id ? String(user.supplier_id) : null;
    await assertFarmerSubscriptionAllowsLogin(userIdFromDoc(user), supplierId);
  }

  const valid = await verifyPassword(password, user.password_hash as string);
  if (!valid) throw new AuthError('Invalid email or password', 'INVALID_CREDENTIALS', 401);

  if (user.two_factor_enabled) {
    const mfa = await createMfaChallenge(userIdFromDoc(user));
    return {
      requires_2fa: true,
      mfa_token: mfa.mfa_token,
      user: serializeUser(user as Record<string, unknown>),
      access_token: null,
      refresh_token: null,
    };
  }

  return issueAuthTokens(
    userIdFromDoc(user),
    user.email as string,
    (user.role as string) ?? 'farmer',
    user as Record<string, unknown>,
    meta
  );
}

export async function refreshAccessToken(refreshToken: string, meta?: SessionMeta) {
  const rotated = await rotateRefreshSession(refreshToken, meta);
  if (!rotated) {
    throw new AuthError('Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN', 401);
  }

  const users = await getCollection('users');
  const user = await users.findOne({ _id: rotated.userId } as never);
  if (!user) throw new AuthError('User not found', 'USER_NOT_FOUND', 401);

  if (user.is_active === false) {
    throw new AuthError('Account is deactivated', 'ACCOUNT_INACTIVE', 403);
  }

  const role = normalizeRole((user.role as string) ?? 'farmer');
  if (isSupplierRole(role)) {
    await assertSupplierLicenseAllowsLogin(rotated.userId);
  }
  if (isFarmerRole(role)) {
    const supplierId = user.supplier_id ? String(user.supplier_id) : null;
    await assertFarmerSubscriptionAllowsLogin(rotated.userId, supplierId);
  }

  const accessToken = await createAccessToken({
    sub: rotated.userId,
    email: user.email as string,
    role: (user.role as string) ?? 'farmer',
    sid: rotated.sessionId,
  });

  return {
    access_token: accessToken,
    refresh_token: rotated.refreshToken,
    session_id: rotated.sessionId,
  };
}

export async function getUserFromAuthHeader(authHeader: string | null) {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const payload = await verifyToken(token);
  if (!payload || payload.type !== 'access') return null;

  const users = await getCollection('users');
  const user = await users.findOne({ _id: payload.sub as string } as never);
  if (!user || user.is_active === false) return null;

  const role = normalizeRole((user.role as string) ?? 'farmer');
  if (isSupplierRole(role)) {
    try {
      await assertSupplierLicenseAllowsLogin(String(user._id));
    } catch {
      return null;
    }
  }
  if (isFarmerRole(role)) {
    try {
      const supplierId = user.supplier_id ? String(user.supplier_id) : null;
      await assertFarmerSubscriptionAllowsLogin(String(user._id), supplierId);
    } catch {
      return null;
    }
  }

  return serializeUser(user as Record<string, unknown>);
}

export async function logoutUser(refreshToken?: string) {
  if (refreshToken) {
    await revokeRefreshSession(refreshToken);
  }
  return { message: 'Logged out' };
}

export async function getUserSessions(userId: string, currentSessionId?: string) {
  const sessions = await listUserSessions(userId);
  return sessions.map((s) => ({
    ...s,
    current: currentSessionId ? s.id === currentSessionId : false,
  }));
}

export async function revokeUserSession(userId: string, sessionId: string) {
  const ok = await revokeRefreshSessionById(sessionId, userId);
  if (!ok) throw new AuthError('Session not found', 'SESSION_NOT_FOUND', 404);
  return { revoked: true };
}

export { extractRequestMeta };
