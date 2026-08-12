"""
Redis caching service for Krashaq LLM agent.
Provides caching for tool results to reduce latency and API calls.
"""

import json
import hashlib
from typing import Optional, Any
from functools import wraps
import redis
from app.common.config import get_settings


class CacheService:
    """Redis-based caching service for tool results."""
    
    def __init__(self):
        """Initialize Redis connection."""
        settings = get_settings()
        try:
            self.redis_client = redis.Redis(
                host=settings.redis_host if hasattr(settings, 'redis_host') else 'localhost',
                port=settings.redis_port if hasattr(settings, 'redis_port') else 6379,
                db=0,
                decode_responses=True,
                socket_connect_timeout=5
            )
            # Test connection
            self.redis_client.ping()
            self.enabled = True
        except Exception as e:
            print(f"Cache service disabled: Redis connection failed - {e}")
            self.enabled = False
    
    def _generate_key(self, tool_name: str, **kwargs) -> str:
        """Generate a cache key based on tool name and parameters."""
        # Create a deterministic key from parameters
        params_str = json.dumps(kwargs, sort_keys=True)
        params_hash = hashlib.md5(params_str.encode()).hexdigest()
        return f"tool:{tool_name}:{params_hash}"
    
    def get(self, tool_name: str, **kwargs) -> Optional[Any]:
        """
        Get cached result for a tool call.
        
        Args:
            tool_name: Name of the tool
            **kwargs: Tool parameters
        
        Returns:
            Cached result if exists and valid, None otherwise
        """
        if not self.enabled:
            return None
        
        try:
            key = self._generate_key(tool_name, **kwargs)
            cached = self.redis_client.get(key)
            if cached:
                return json.loads(cached)
        except Exception as e:
            print(f"Cache get error: {e}")
        
        return None
    
    def set(self, tool_name: str, result: Any, ttl: int = 300, **kwargs) -> bool:
        """
        Cache a tool result.
        
        Args:
            tool_name: Name of the tool
            result: Result to cache
            ttl: Time to live in seconds (default: 300 = 5 minutes)
            **kwargs: Tool parameters
        
        Returns:
            True if cached successfully, False otherwise
        """
        if not self.enabled:
            return False
        
        try:
            key = self._generate_key(tool_name, **kwargs)
            self.redis_client.setex(key, ttl, json.dumps(result))
            return True
        except Exception as e:
            print(f"Cache set error: {e}")
            return False
    
    def delete(self, tool_name: str, **kwargs) -> bool:
        """
        Delete a cached result.
        
        Args:
            tool_name: Name of the tool
            **kwargs: Tool parameters
        
        Returns:
            True if deleted successfully, False otherwise
        """
        if not self.enabled:
            return False
        
        try:
            key = self._generate_key(tool_name, **kwargs)
            self.redis_client.delete(key)
            return True
        except Exception as e:
            print(f"Cache delete error: {e}")
            return False
    
    def clear_pattern(self, pattern: str) -> bool:
        """
        Clear all keys matching a pattern.
        
        Args:
            pattern: Redis key pattern (e.g., "tool:weather:*")
        
        Returns:
            True if cleared successfully, False otherwise
        """
        if not self.enabled:
            return False
        
        try:
            keys = self.redis_client.keys(pattern)
            if keys:
                self.redis_client.delete(*keys)
            return True
        except Exception as e:
            print(f"Cache clear pattern error: {e}")
            return False


# Global cache instance
_cache_service = None

def get_cache_service() -> CacheService:
    """Get or create cache service instance."""
    global _cache_service
    if _cache_service is None:
        _cache_service = CacheService()
    return _cache_service


def cached_tool(ttl: int = 300):
    """
    Decorator to cache tool results.
    
    Args:
        ttl: Time to live in seconds (default: 300 = 5 minutes)
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            cache = get_cache_service()
            tool_name = func.__name__
            
            # Try to get from cache
            cached_result = cache.get(tool_name, **kwargs)
            if cached_result is not None:
                return cached_result
            
            # Execute function
            result = func(*args, **kwargs)
            
            # Cache result
            cache.set(tool_name, result, ttl=ttl, **kwargs)
            
            return result
        return wrapper
    return decorator
