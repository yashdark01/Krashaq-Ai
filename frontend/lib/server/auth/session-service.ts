import { randomUUID } from 'crypto';
import { getCollection } from '@/lib/server/db/mongodb';
import { createRefreshToken, verifyToken } from '@/lib/server/auth/jwt';
import { getConfig } from '@/lib/server/config';

export interface SessionMeta {
  userAgent?: string;
  ip?: string;
}

export interface AuthSession {
  id: string;
  user_id: string;
  created_at: Date;
  expires_at: Date;
  revoked: boolean;
  user_agent?: string;
  ip?: string;
  last_used_at?: Date;
}

export async function createRefreshSession(
  userId: string,
  meta?: SessionMeta
): Promise<{ refreshToken: string; sessionId: string; expiresAt: Date }> {
  const sessionId = randomUUID();
  const refreshToken = await createRefreshToken({ sub: userId, sid: sessionId });

  const { refreshTokenExpireDays } = getConfig();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + refreshTokenExpireDays);

  const refreshTokens = await getCollection('refresh_tokens');
  await refreshTokens.insertOne({
    _id: sessionId,
    user_id: userId,
    token: refreshToken,
    expires_at: expiresAt,
    created_at: new Date(),
    last_used_at: new Date(),
    revoked: false,
    user_agent: meta?.userAgent,
    ip: meta?.ip,
  } as never);

  return { refreshToken, sessionId, expiresAt };
}

export async function findValidRefreshSession(token: string) {
  const refreshTokens = await getCollection('refresh_tokens');
  const stored = await refreshTokens.findOne({ token, revoked: false });
  if (!stored) return null;

  const expiresAt = stored.expires_at as Date;
  if (expiresAt && new Date(expiresAt) < new Date()) {
    await refreshTokens.updateOne({ token }, { $set: { revoked: true } });
    return null;
  }

  return stored as unknown as AuthSession & { token: string; user_id: string };
}

export async function revokeRefreshSession(token: string) {
  const refreshTokens = await getCollection('refresh_tokens');
  await refreshTokens.updateOne({ token }, { $set: { revoked: true, revoked_at: new Date() } });
}

export async function revokeRefreshSessionById(sessionId: string, userId: string) {
  const refreshTokens = await getCollection('refresh_tokens');
  const result = await refreshTokens.updateOne(
    { _id: sessionId, user_id: userId, revoked: false } as never,
    { $set: { revoked: true, revoked_at: new Date() } }
  );
  return result.modifiedCount > 0;
}

export async function rotateRefreshSession(
  oldToken: string,
  meta?: SessionMeta
): Promise<{ refreshToken: string; userId: string; sessionId: string } | null> {
  const payload = await verifyToken(oldToken);
  if (!payload || payload.type !== 'refresh') return null;

  const stored = await findValidRefreshSession(oldToken);
  if (!stored) return null;

  const userId = stored.user_id as string;

  await revokeRefreshSession(oldToken);

  const { refreshToken, sessionId } = await createRefreshSession(userId, meta);

  return { refreshToken, userId, sessionId };
}

export async function listUserSessions(userId: string) {
  const refreshTokens = await getCollection('refresh_tokens');
  const sessions = await refreshTokens
    .find({ user_id: userId, revoked: false, expires_at: { $gt: new Date() } })
    .sort({ created_at: -1 })
    .limit(50)
    .toArray();

  return sessions.map((s) => ({
    id: String(s._id),
    created_at: s.created_at,
    expires_at: s.expires_at,
    last_used_at: s.last_used_at ?? s.created_at,
    user_agent: s.user_agent ?? null,
    ip: s.ip ?? null,
    current: false,
  }));
}

export function extractRequestMeta(request: Request): SessionMeta {
  return {
    userAgent: request.headers.get('user-agent') ?? undefined,
    ip:
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      request.headers.get('x-real-ip') ??
      undefined,
  };
}
