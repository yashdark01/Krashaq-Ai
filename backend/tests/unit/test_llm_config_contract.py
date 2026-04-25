from app.config import get_settings


def test_settings_exposes_primary_chain_fields(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "groq-key")
    monkeypatch.setenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    monkeypatch.setenv("GOOGLE_API_KEY", "gemini-key")
    monkeypatch.setenv("GEMINI_MODEL", "gemini-1.5-pro")
    monkeypatch.setenv("XAI_API_KEY", "xai-key")
    monkeypatch.setenv("XAI_MODEL", "xai-reasoner")
    monkeypatch.setenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
    monkeypatch.setenv("OLLAMA_MODEL", "llama3.1:8b")

    settings = get_settings()
    assert settings.groq_api_key == "groq-key"
    assert settings.groq_model == "llama-3.3-70b-versatile"
    assert settings.gemini_model == "gemini-1.5-pro"
    assert settings.xai_model == "xai-reasoner"
