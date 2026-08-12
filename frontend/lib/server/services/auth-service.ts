import { randomUUID } from 'crypto';
import { getCollection } from '@/lib/server/db/mongodb';
import { hashPassword, verifyPassword } from '@/lib/server/auth/password';
import { createAccessToken, createRefreshToken, verifyToken } from '@/lib/server/auth/jwt';
import { getConfig } from '@/lib/server/config';

function userIdFromDoc(user: { _id?: unknown }): string {
  return String(user._id);
}

function serializeUser(user: Record<string, unknown>) {
  const location = (user.location as Record<string, string> | undefined) ?? {};
  return {
    id: user._id,
    email: user.email,
    name: user.name,
    default_location: location.locality ?? null,
    role: user.role ?? 'farmer',
    state: location.state ?? null,
    district: location.district ?? null,
    tehsil: location.tehsil ?? null,
    locality: location.locality ?? null,
    pincode: location.pincode ?? null,
    language: user.language ?? 'hi',
    email_verified: user.email_verified ?? false,
  };
}

export async function signupUser(data: {
  email: string;
  name: string;
  password: string;
  phone?: string;
  state?: string;
  district?: string;
  tehsil?: string;
  locality?: string;
  pincode?: string;
}) {
  const users = await getCollection('users');
  const existing = await users.findOne({ email: data.email });
  if (existing) throw new Error('User with this email already exists');

  const userId = randomUUID();
  const passwordHash = await hashPassword(data.password);

  const user = {
    _id: userId,
    email: data.email,
    name: data.name,
    password_hash: passwordHash,
    phone: data.phone,
    location: {
      state: data.state,
      district: data.district,
      tehsil: data.tehsil,
      locality: data.locality,
      pincode: data.pincode,
    },
    role: 'farmer',
    language: 'hi',
    is_active: true,
    email_verified: false,
    two_factor_enabled: false,
    phone_verified: false,
    created_at: new Date(),
    updated_at: new Date(),
  };

  await users.insertOne(user as never);
  return issueAuthTokens(userId, user.email as string, user.role as string, user);
}

export async function loginWithEmail(email: string, password: string) {
  const users = await getCollection('users');
  const user = await users.findOne({ email });
  if (!user?.password_hash) throw new Error('Invalid email or password');

  const valid = await verifyPassword(password, user.password_hash as string);
  if (!valid) throw new Error('Invalid email or password');

  return issueAuthTokens(
    userIdFromDoc(user),
    user.email as string,
    (user.role as string) ?? 'farmer',
    user as Record<string, unknown>
  );
}

async function issueAuthTokens(
  userId: string,
  email: string,
  role: string,
  user: Record<string, unknown>
) {
  const accessToken = await createAccessToken({ sub: userId, email, role });
  const refreshToken = await createRefreshToken({ sub: userId });

  const refreshTokens = await getCollection('refresh_tokens');
  const { refreshTokenExpireDays } = getConfig();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + refreshTokenExpireDays);

  await refreshTokens.insertOne({
    user_id: userId,
    token: refreshToken,
    expires_at: expiresAt,
    created_at: new Date(),
    revoked: false,
  } as never);

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    user: serializeUser(user),
    requires_2fa: false,
  };
}

export async function refreshAccessToken(refreshToken: string) {
  const payload = await verifyToken(refreshToken);
  if (!payload || payload.type !== 'refresh') throw new Error('Invalid refresh token');

  const refreshTokens = await getCollection('refresh_tokens');
  const stored = await refreshTokens.findOne({ token: refreshToken, revoked: false });
  if (!stored) throw new Error('Refresh token revoked');

  const users = await getCollection('users');
  const user = await users.findOne({ _id: payload.sub as string } as never);
  if (!user) throw new Error('User not found');

  const accessToken = await createAccessToken({
    sub: userIdFromDoc(user),
    email: user.email as string,
    role: (user.role as string) ?? 'farmer',
  });

  return { access_token: accessToken, refresh_token: refreshToken };
}

export async function getUserFromAuthHeader(authHeader: string | null) {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const payload = await verifyToken(token);
  if (!payload || payload.type !== 'access') return null;

  const users = await getCollection('users');
  const user = await users.findOne({ _id: payload.sub as string } as never);
  if (!user) return null;
  return serializeUser(user as Record<string, unknown>);
}

export async function logoutUser(refreshToken?: string) {
  if (!refreshToken) return { message: 'Logged out' };
  const refreshTokens = await getCollection('refresh_tokens');
  await refreshTokens.updateOne({ token: refreshToken }, { $set: { revoked: true } });
  return { message: 'Logged out' };
}

export { serializeUser };
