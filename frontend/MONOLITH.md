# Krashaq Monolithic Next.js App

Krashaq runs as a **single Next.js application**. The browser talks to same-origin `/api/*` routes — no separate FastAPI server.

## Architecture

```
Browser  →  Next.js (frontend + API routes)
              ├── app/api/* — all REST handlers
              └── lib/server/* — MongoDB, JWT, LangGraph, services
```

## What runs in the monolith

| Feature | Route(s) |
|---------|----------|
| AI chat (LangGraph + RAG) | `POST /api/chat`, `/api/chat/stream` |
| Weather | `GET /api/weather` |
| Auth + MFA | `/api/auth/*` |
| Farmers + suppliers + subscriptions | `/api/farmers`, `/api/admin/suppliers`, `/api/supplier/*` |
| Farmer alerts + notifications | `/api/supplier/alerts`, `/api/cron/alerts` |
| Admin dashboard, analytics, config | `/api/admin/*` |

## Legacy Python backend

The old FastAPI app is archived at **`archive/backend/`** (reference only). It is not used in production.

## Setup

```bash
cd frontend
cp .env.example .env.local
npm install
npm run db:reset   # optional demo data
npm run dev
```

Deploy to **Vercel** with root directory `frontend`. See [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md).

## Key files

- `lib/server/config.ts` — environment config
- `lib/server/services/` — business logic
- `lib/server/agents/` — LangGraph agent
- `contexts/AuthContext.tsx` — auth client

## Notes

- MongoDB with string UUID `_id` fields
- Redis optional (in-memory fallback)
- Run alerts locally: `npm run alerts:run`
