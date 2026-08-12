# Krashaq Monolithic Next.js App

Krashaq now runs as a **single Next.js application**. The browser talks to same-origin `/api/*` routes — no separate FastAPI server required for core features.

## Architecture

```
Browser  →  Next.js (frontend + API routes)
              ├── Native handlers: chat, weather, auth, farmers
              ├── lib/server/* services (MongoDB, Redis, LangChain, JWT)
              └── Legacy proxy: admin, LLM admin, messages, locations, 2FA…
```

## What runs natively (no Python)

| Feature | Route(s) | Service |
|---------|----------|---------|
| AI chat | `POST /api/chat` | LangChain + Gemini/Groq |
| Weather | `GET /api/weather?city=` | WeatherAPI + Redis cache |
| Email auth | `/api/auth/login/email`, signup, register, me, refresh, logout | MongoDB + JWT |
| Farmers CRUD | `/api/farmers/*` | MongoDB |

## What still uses legacy Python (optional)

Admin dashboard, user management, LLM session admin, WhatsApp messages, location hierarchy, 2FA, Google OAuth, and scheduler routes proxy to FastAPI when `LEGACY_PYTHON_URL` is set.

Without it, those endpoints return **501** with a migration hint.

## Setup

```bash
cd frontend
cp .env.example .env.local
# Copy values from backend/.env (MongoDB, API keys, JWT secret)
npm install
npm run dev
```

Production:

```bash
npm run build
npm start
```

Deploy to **Vercel** with env vars from [docs/ENVIRONMENT.md](../docs/ENVIRONMENT.md). Set root directory to `frontend`.

Full deployment guide: [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md)

## Migration from split stack

1. **Phase 1 (done):** Core API in Next.js — chat, weather, auth, farmers
2. **Phase 2:** Port admin + locations to TypeScript (or keep `LEGACY_PYTHON_URL`)
3. **Phase 3:** WhatsApp webhooks + scheduler (Vercel Cron or worker)

## Key files

- `lib/server/config.ts` — environment config
- `lib/server/services/` — business logic
- `lib/server/proxy/legacy-python.ts` — FastAPI bridge
- `lib/api/client.ts` — browser API client (same-origin by default)
- `contexts/AuthContext.tsx` — uses `/api/auth/*` relative paths

## Notes

- Uses the **same MongoDB** as the Python backend (string UUID `_id` fields).
- Python password hashes (bcrypt + legacy SHA256) are supported via `lib/server/auth/password.ts`.
- Redis is optional; in-memory cache is used if Redis is unavailable.
