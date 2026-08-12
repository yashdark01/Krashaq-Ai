from app.services.llm_provider import resolve_llm_with_chain


def test_resolver_uses_chain_order(monkeypatch):
    calls = []

    def fake_init(provider, temperature=0.7):
        calls.append(provider)
        if provider in {"grok", "gemini"}:
            raise RuntimeError("provider down")
        return f"ok:{provider}"

    llm, used, errors = resolve_llm_with_chain(
        chain=["grok", "gemini", "xai", "ollama"],
        init_fn=fake_init,
    )
    assert llm == "ok:xai"
    assert used == "xai"
    assert calls == ["grok", "gemini", "xai"]
    assert "grok" in errors and "gemini" in errors
