import json
from typing import Optional, Any
import redis
from app.common.config import get_settings

settings = get_settings()


class RedisCacheService:
    """Service for caching data using Redis."""
    
    def __init__(self):
        self.redis_client = None
        self._connect()
    
    def _connect(self):
        """Establish connection to Redis."""
        try:
            self.redis_client = redis.from_url(
                settings.redis_url,
                decode_responses=True
            )
            # Test connection
            self.redis_client.ping()
            print("Redis connection established successfully")
        except Exception as e:
            print(f"Failed to connect to Redis: {e}")
            print("Redis caching will be disabled")
            self.redis_client = None
    
    def get(self, key: str) -> Optional[Any]:
        """
        Get data from cache.
        
        Args:
            key: Cache key
        
        Returns:
            Cached data if found, None otherwise
        """
        if not self.redis_client:
            return None
        
        try:
            data = self.redis_client.get(key)
            if data:
                return json.loads(data)
            return None
        except Exception as e:
            print(f"Error getting from cache: {e}")
            return None
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """
        Set data in cache.
        
        Args:
            key: Cache key
            value: Data to cache
            ttl: Time to live in seconds (defaults to configured TTL)
        
        Returns:
            True if successful, False otherwise
        """
        if not self.redis_client:
            return False
        
        try:
            ttl = ttl or settings.redis_cache_ttl
            serialized = json.dumps(value)
            return self.redis_client.setex(key, ttl, serialized)
        except Exception as e:
            print(f"Error setting cache: {e}")
            return False
    
    def delete(self, key: str) -> bool:
        """
        Delete data from cache.
        
        Args:
            key: Cache key to delete
        
        Returns:
            True if successful, False otherwise
        """
        if not self.redis_client:
            return False
        
        try:
            return self.redis_client.delete(key) > 0
        except Exception as e:
            print(f"Error deleting from cache: {e}")
            return False
    
    def exists(self, key: str) -> bool:
        """
        Check if key exists in cache.
        
        Args:
            key: Cache key
        
        Returns:
            True if key exists, False otherwise
        """
        if not self.redis_client:
            return False
        
        try:
            return self.redis_client.exists(key) > 0
        except Exception as e:
            print(f"Error checking cache existence: {e}")
            return False
    
    def clear_pattern(self, pattern: str) -> int:
        """
        Clear all keys matching a pattern.
        
        Args:
            pattern: Key pattern (e.g., "weather:*")
        
        Returns:
            Number of keys deleted
        """
        if not self.redis_client:
            return 0
        
        try:
            keys = self.redis_client.keys(pattern)
            if keys:
                return self.redis_client.delete(*keys)
            return 0
        except Exception as e:
            print(f"Error clearing cache pattern: {e}")
            return 0


# Singleton instance
redis_cache_service = RedisCacheService()
