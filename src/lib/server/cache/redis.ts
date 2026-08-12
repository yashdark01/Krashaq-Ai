import Redis from 'ioredis';
import { getConfig } from '@/lib/server/config';

declare global {
  var _krashaqRedis: Redis | undefined;
}

const memoryCache = new Map<string, { value: string; expiresAt: number }>();

function getRedisClient(): Redis | null {
  if (global._krashaqRedis) return global._krashaqRedis;

  const { redisUrl } = getConfig();
  if (!redisUrl || redisUrl === 'memory') return null;

  try {
    global._krashaqRedis = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
    });
    return global._krashaqRedis;
  } catch {
    return null;
  }
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getRedisClient();
  if (redis) {
    try {
      if (redis.status !== 'ready') await redis.connect();
      const raw = await redis.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      /* fall through to memory */
    }
  }

  const item = memoryCache.get(key);
  if (!item) return null;
  if (Date.now() > item.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return JSON.parse(item.value) as T;
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 1200): Promise<void> {
  const serialized = JSON.stringify(value);
  const redis = getRedisClient();

  if (redis) {
    try {
      if (redis.status !== 'ready') await redis.connect();
      await redis.setex(key, ttlSeconds, serialized);
      return;
    } catch {
      /* fall through */
    }
  }

  memoryCache.set(key, {
    value: serialized,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

export async function cacheDelete(key: string): Promise<void> {
  const redis = getRedisClient();
  if (redis) {
    try {
      if (redis.status !== 'ready') await redis.connect();
      await redis.del(key);
    } catch {
      /* ignore */
    }
  }
  memoryCache.delete(key);
}
