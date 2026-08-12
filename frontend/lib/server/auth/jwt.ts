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
