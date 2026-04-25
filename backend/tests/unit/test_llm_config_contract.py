from app.config import get_settings


def test_settings_exposes_primary_chain_fields(monkeypatch):
    monkeypatch.setenv("GROK_API_KEY", "grok-key")
    monkeypatch.setenv("GROK_MODEL", "grok-2-latest")
    monkeypatch.setenv("GOOGLE_API_KEY", "gemini-key")
    monkeypatch.setenv("GEMINI_MODEL", "gemini-1.5-pro")
    monkeypatch.setenv("XAI_API_KEY", "xai-key")
    monkeypatch.setenv("XAI_MODEL", "xai-reasoner")
    monkeypatch.setenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
    monkeypatch.setenv("OLLAMA_MODEL", "llama3.1:8b")

    settings = get_settings()
    assert settings.grok_api_key == "grok-key"
    assert settings.grok_model == "grok-2-latest"
    assert settings.gemini_model == "gemini-1.5-pro"
    assert settings.xai_model == "xai-reasoner"
