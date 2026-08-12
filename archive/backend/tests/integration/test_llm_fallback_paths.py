import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_chat_path_returns_provider_used(async_client: AsyncClient, monkeypatch):
    monkeypatch.setenv("LLM_FALLBACK_CHAIN", "groq,gemini,xai,ollama")
    res = await async_client.post("/api/chat", json={"message": "hello", "location": "Delhi"})
    assert res.status_code == 200
    assert res.json()["llm_provider"] in {"groq", "gemini", "xai", "ollama"}


@pytest.mark.asyncio
async def test_webhook_general_path_uses_shared_resolver(async_client: AsyncClient):
    res = await async_client.post(
        "/webhook",
        data={"From": "whatsapp:+911111111111", "Body": "general farming help"}
    )
    assert res.status_code == 200
