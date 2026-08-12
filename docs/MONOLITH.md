# Krashaq Monolithic Next.js App

Krashaq runs as a **single Next.js application** at the repo root with a `src/` layout. The browser talks to same-origin `/api/*` routes — no separate FastAPI server.

## Architecture

```
Browser  →  Next.js (src/app + API routes)
              ├── src/app/api/* — all REST handlers
              └── src/lib/server/* — MongoDB, JWT, LangGraph, services
```

## What runs in the monolith

| Feature                             | Route(s)                                                  |
| ----------------------------------- | --------------------------------------------------------- |
| AI chat (LangGraph + RAG)           | `POST /api/chat`, `/api/chat/stream`                      |
| Weather                             | `GET /api/weather`                                        |
| Auth + MFA                          | `/api/auth/*`                                             |
| Farmers + suppliers + subscriptions | `/api/farmers`, `/api/admin/suppliers`, `/api/supplier/*` |
| Farmer alerts + notifications       | `/api/supplier/alerts`, `/api/cron/alerts`                |
| Admin dashboard, analytics, config  | `/api/admin/*`                                            |

## Legacy Python backend

Removed from the repo (Aug 2026). To recover: `git checkout legacy/python-backend-v1 -- archive/backend`

## Setup

```bash
cp .env.example .env.local
npm install
npm run db:reset   # optional demo data
npm run dev
```

Deploy to **Vercel** with root directory **`.`** (repo root). See [DEPLOYMENT.md](./DEPLOYMENT.md).

## Key files

- `src/lib/server/config.ts` — environment config
- `src/lib/server/services/` — business logic
- `src/lib/server/agents/` — LangGraph agent
- `src/contexts/AuthContext.tsx` — auth client
- `content/kb/` — RAG markdown corpus

## Notes

- MongoDB with string UUID `_id` fields
- Redis optional (in-memory fallback)
- Run alerts locally: `npm run alerts:run`
