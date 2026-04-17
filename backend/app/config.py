import os
from functools import lru_cache
from dotenv import load_dotenv

load_dotenv()


class Settings:
    def __init__(self):
        self.weather_api_key = os.getenv("WEATHER_API_KEY", "")
        self.twilio_account_sid = os.getenv("TWILIO_ACCOUNT_SID", "")
        self.twilio_auth_token = os.getenv("TWILIO_AUTH_TOKEN", "")
        self.twilio_whatsapp_number = os.getenv("TWILIO_WHATSAPP_NUMBER", "")
        self.database_url = os.getenv("DATABASE_URL", "sqlite:///./krashaq.db")
        
        # LLM Provider Settings
        self.llm_provider = os.getenv("LLM_PROVIDER", "ollama")  # ollama | gemini | openai | claude | grok
        self.ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
        self.ollama_model = os.getenv("OLLAMA_MODEL", "llama3.1:8b")
        
        # Cloud Provider API Keys
        self.google_api_key = os.getenv("GOOGLE_API_KEY", "")
        self.openai_api_key = os.getenv("OPENAI_API_KEY", "")
        self.anthropic_api_key = os.getenv("ANTHROPIC_API_KEY", "")
        self.xai_api_key = os.getenv("XAI_API_KEY", "")
        
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


@lru_cache()
def get_settings() -> Settings:
    return Settings()
