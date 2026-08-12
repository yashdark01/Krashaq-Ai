import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_llm_providers_endpoint_returns_chain(async_client: AsyncClient):
    res = await async_client.get("/api/llm/providers")
    assert res.status_code == 200
    data = res.json()
    assert "fallback_chain" in data
    assert "providers" in data
    assert isinstance(data["fallback_chain"], list)
    assert "groq" in data["fallback_chain"]


@pytest.mark.asyncio
async def test_llm_providers_endpoint_includes_configured_status(async_client: AsyncClient):
    res = await async_client.get("/api/llm/providers")
    assert res.status_code == 200
    data = res.json()
    providers = data["providers"]
    for provider in providers:
        assert "name" in provider
        assert "is_configured" in provider
        assert "is_available" in provider
