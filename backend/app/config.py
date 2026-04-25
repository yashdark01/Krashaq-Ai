import os
from functools import lru_cache
from dotenv import load_dotenv

load_dotenv(override=True)


class Settings:
    def __init__(self):
        self.weather_api_key = os.getenv("WEATHER_API_KEY", "")
        self.twilio_account_sid = os.getenv("TWILIO_ACCOUNT_SID", "")
        self.twilio_auth_token = os.getenv("TWILIO_AUTH_TOKEN", "")
        self.twilio_whatsapp_number = os.getenv("TWILIO_WHATSAPP_NUMBER", "")
        self.database_url = os.getenv("DATABASE_URL", "sqlite:///./krashaq.db")
        
        # LLM Configuration
        self.llm_provider = os.getenv("LLM_PROVIDER", "ollama")  # ollama, gemini, openai, claude, grok
        self.llm_fallback_chain = os.getenv("LLM_FALLBACK_CHAIN", "groq,gemini,xai,ollama")
        self.llm_provider_timeout_seconds = int(os.getenv("LLM_PROVIDER_TIMEOUT_SECONDS", "12"))
        self.ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        self.ollama_model = os.getenv("OLLAMA_MODEL", "llama3.1:8b")
        
        # Cloud Provider API Keys
        self.google_api_key = os.getenv("GOOGLE_API_KEY", "")
        self.openai_api_key = os.getenv("OPENAI_API_KEY", "")
        self.anthropic_api_key = os.getenv("ANTHROPIC_API_KEY", "")
        self.xai_api_key = os.getenv("XAI_API_KEY", "")
        self.groq_api_key = os.getenv("GROQ_API_KEY", "")
        
        # Cloud Provider Models
        self.gemini_model = os.getenv("GEMINI_MODEL", "gemini-1.5-pro")
        self.openai_model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        self.claude_model = os.getenv("CLAUDE_MODEL", "claude-3-haiku-20240307")
        self.xai_model = os.getenv("XAI_MODEL", "xai-reasoner")
        self.groq_model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        
        # JWT Configuration
        self.jwt_secret_key = os.getenv("JWT_SECRET_KEY", "")
        self.jwt_algorithm = os.getenv("JWT_ALGORITHM", "HS256")
        self.access_token_expire_minutes = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
        self.refresh_token_expire_days = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
        
        # Google OAuth Configuration
        self.google_client_id = os.getenv("GOOGLE_CLIENT_ID", "")
        self.google_client_secret = os.getenv("GOOGLE_CLIENT_SECRET", "")
        self.google_redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:3000/auth/callback")
        
        # Frontend URL for redirects
        self.frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
        
        # Redis Configuration
        self.redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
        self.redis_cache_ttl = int(os.getenv("REDIS_CACHE_TTL", "1200"))  # 20 minutes in seconds
        
        # LangSmith Configuration
        self.langsmith_api_key = os.getenv("LANGCHAIN_API_KEY", "")
        self.langsmith_project = os.getenv("LANGCHAIN_PROJECT", "krashaq")
        self.langsmith_tracing = os.getenv("LANGCHAIN_TRACING_V2", "true").lower() == "true"
        
        # Sentry Configuration
        self.sentry_dsn = os.getenv("SENTRY_DSN", "")
        
        # Email Configuration
        self.email_provider = os.getenv("EMAIL_PROVIDER", "sendgrid")  # sendgrid or mailgun
        self.sendgrid_api_key = os.getenv("SENDGRID_API_KEY", "")
        self.mailgun_api_key = os.getenv("MAILGUN_API_KEY", "")
        self.email_from = os.getenv("EMAIL_FROM", "noreply@krashaq.com")


def get_settings() -> Settings:
    return Settings()
