"""Shared HTTP client with retry logic."""
import httpx
from tenacity import retry, stop_after_attempt, wait_exponential
from app.common.config import settings

# Shared async HTTP client
async_client = httpx.AsyncClient(
    timeout=30.0,
    limits=httpx.Limits(max_connections=100, max_keepalive_connections=20),
)

# Shared sync HTTP client
sync_client = httpx.Client(
    timeout=30.0,
    limits=httpx.Limits(max_connections=100, max_keepalive_connections=20),
)


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
async def fetch_with_retry(url: str, method: str = "GET", **kwargs):
    """Fetch with retry logic."""
    response = await async_client.request(method, url, **kwargs)
    response.raise_for_status()
    return response


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
def fetch_with_retry_sync(url: str, method: str = "GET", **kwargs):
    """Fetch with retry logic (sync)."""
    response = sync_client.request(method, url, **kwargs)
    response.raise_for_status()
    return response


async def close_http_clients():
    """Close HTTP clients on shutdown."""
    await async_client.aclose()
    sync_client.close()
