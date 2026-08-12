"""Shared Redis connection manager."""
import redis.asyncio as redis
from app.common.config import settings

# Shared Redis connection pool
redis_pool = redis.ConnectionPool.from_url(
    settings.REDIS_URL,
    encoding="utf-8",
    decode_responses=True,
    max_connections=50,
)

# Async Redis client
async_redis = redis.Redis(connection_pool=redis_pool)


async def get_redis():
    """Get async Redis client."""
    return async_redis


async def close_redis():
    """Close Redis connection on shutdown."""
    await async_redis.close()
