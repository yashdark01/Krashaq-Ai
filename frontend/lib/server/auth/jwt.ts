import { SignJWT, jwtVerify } from 'jose';
import { getConfig } from '@/lib/server/config';

function getSecretKey() {
  return new TextEncoder().encode(getConfig().jwtSecret);
}

export async function createAccessToken(payload: Record<string, unknown>) {
  const { accessTokenExpireMinutes } = getConfig();
  return new SignJWT({ ...payload, type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(`${accessTokenExpireMinutes}m`)
    .sign(getSecretKey());
}

export async function createRefreshToken(payload: Record<string, unknown>) {
  const { refreshTokenExpireDays } = getConfig();
  return new SignJWT({ ...payload, type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(`${refreshTokenExpireDays}d`)
    .sign(getSecretKey());
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function createMfaToken(userId: string) {
  const expireMinutes = Number(process.env.MFA_TOKEN_EXPIRE_MINUTES ?? 5);
  return new SignJWT({ sub: userId, type: 'mfa' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(`${expireMinutes}m`)
    .sign(getSecretKey());
}

export async function verifyMfaToken(token: string) {
  const payload = await verifyToken(token);
  if (!payload || payload.type !== 'mfa') return null;
  return payload;
}
