# Environment Variables

All secrets belong in `.env.local` (development) or **Vercel Environment Variables** (production). Never commit real keys to git.

## Quick reference

### Core (required for production)

```env
MONGODB_URL=mongodb+srv://...
MONGODB_DB=krashaq_ai
JWT_SECRET_KEY=                    # openssl rand -hex 32
LLM_PROVIDER=groq
GROQ_API_KEY=
GROQ_MODEL=llama-3.3-70b-versatile
WEATHER_API_KEY=
```

### LLM providers (add any you use)

```env
LLM_FALLBACK_CHAIN=gemini,openai,anthropic

OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_API_KEY=
GEMINI_MODEL=gemini-1.5-flash
XAI_API_KEY=
DEEPSEEK_API_KEY=
MISTRAL_API_KEY=
OLLAMA_BASE_URL=http://127.0.0.1:11434   # local only
```

### Auth & OAuth

```env
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
NEXT_PUBLIC_GOOGLE_REDIRECT_URI=https://your-app.vercel.app/auth/callback
```

### Optional

```env
REDIS_URL=redis://...                  # Upstash for production cache
LEGACY_PYTHON_URL=                     # FastAPI bridge for admin/WhatsApp
```

## Variable details

| Variable | Default | Description |
|----------|---------|-------------|
| `LLM_PROVIDER` | `groq` | Primary LLM provider id |
| `LLM_FALLBACK_CHAIN` | `gemini,openai,anthropic` | Comma-separated fallback order |
| `MONGODB_URL` | `mongodb://localhost:27017` | MongoDB connection string |
| `MONGODB_DB` | `krashaq` | Database name |
| `JWT_SECRET_KEY` | dev placeholder | **Must change in production** |
| `WEATHER_API_KEY` | — | [WeatherAPI.com](https://www.weatherapi.com/) |
| `LEGACY_PYTHON_URL` | — | If set, unmigrated routes proxy to FastAPI |

## Files

| File | Purpose | Committed? |
|------|---------|------------|
| `frontend/.env.example` | Template | ✅ Yes |
| `frontend/.env.local` | Local dev secrets | ❌ No |
| Vercel dashboard | Production secrets | ❌ No |

## Generating secrets

```bash
# JWT secret
openssl rand -hex 32
```

## Provider API key links

- [Groq](https://console.groq.com/)
- [OpenAI](https://platform.openai.com/api-keys)
- [Anthropic](https://console.anthropic.com/)
- [Google AI Studio](https://aistudio.google.com/apikey)
- [xAI](https://console.x.ai/)
- [DeepSeek](https://platform.deepseek.com/)
- [Mistral](https://console.mistral.ai/)
