# Krashaq — System Architecture

> **Krashaq** is an AI-powered agritech platform for Indian farmers: weather, irrigation advice, multilingual chat, and farmer management.

## High-level architecture (production)

```mermaid
flowchart TB
  subgraph Client
    Browser[Web Browser]
  end

  subgraph Vercel["Vercel — Next.js 16 Monolith"]
    Pages[App Router / UI]
    API[API Routes /api/*]
    SVC[lib/server/services]
    LLM[lib/server/llm]
    Pages --> API
    API --> SVC
    SVC --> LLM
  end

  subgraph Data
    Mongo[(MongoDB Atlas)]
    Redis[(Redis / Upstash — optional)]
  end

  subgraph External
    Groq[Groq API]
    OpenAI[OpenAI]
    Claude[Anthropic]
    Gemini[Google Gemini]
    Weather[WeatherAPI.com]
  end

  Browser --> Pages
  Browser --> API
  SVC --> Mongo
  SVC --> Redis
  LLM --> Groq
  LLM --> OpenAI
  LLM --> Claude
  LLM --> Gemini
  SVC --> Weather
```

## Monolith vs legacy backend

| Layer                                   | Status            | Location                                                                         |
| --------------------------------------- | ----------------- | -------------------------------------------------------------------------------- |
| UI (dashboard, chat, auth pages)        | ✅ Production     | `src/app/`                                                                       |
| Chat, weather, auth, farmers API        | ✅ Native Next.js | `src/app/api/` + `src/lib/server/`                                               |
| Multi-provider LLM                      | ✅ Native         | `src/lib/server/llm/`                                                            |
| Admin, suppliers, subscriptions, alerts | ✅ Native         | `src/app/api/`                                                                   |
| WhatsApp webhooks                       | ❌ Not ported     | See [archive/PYTHON-BACKEND-REFERENCE.md](./archive/PYTHON-BACKEND-REFERENCE.md) |

The **production path** is the Next.js monolith on Vercel. Legacy Python was removed; recover from git tag `legacy/python-backend-v1` if needed.

## Frontend structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/                # Serverless API (monolith backend)
│   ├── auth/               # Login, signup, OAuth callback
│   ├── admin/              # Admin dashboard pages
│   └── page.tsx            # Farmer dashboard
├── modules/                # Feature modules
├── lib/server/             # Server-only: DB, auth, LLM, services
├── contexts/               # AuthContext, ToastContext
└── components/ui/          # shadcn/ui primitives
content/kb/                 # RAG corpus (repo root)
scripts/                    # db:reset, kb:ingest, QA
```

## LLM architecture

1. User selects **provider + model** in chat UI (`ModelSelector`).
2. `POST /api/chat` → `processChat()` → `resolveLLM()` with fallback chain.
3. Supported providers: Groq (default), OpenAI, Anthropic, Gemini, xAI, DeepSeek, Mistral, Ollama.
4. Tool context (weather, irrigation) injected as system messages before LLM invoke.

Config: `LLM_PROVIDER`, `LLM_FALLBACK_CHAIN`, per-provider API keys — see [ENVIRONMENT.md](./ENVIRONMENT.md).

## Authentication

- Email/password: bcrypt hashes in MongoDB `users` collection.
- JWT access (30m) + refresh (7d) tokens via `jose`.
- Google OAuth: requires legacy backend or future port (`/api/auth/google/*`).

## Data model (MongoDB)

| Collection       | Purpose                            |
| ---------------- | ---------------------------------- |
| `users`          | Farmers, admins, suppliers         |
| `refresh_tokens` | JWT refresh token rotation         |
| `chat_sessions`  | Conversation history by session_id |

## Security considerations

- Secrets only in environment variables (never committed).
- API routes are serverless — no client-side DB access.
- Admin routes require `role: admin` (when fully ported).
- Rate limiting: add Vercel Firewall / Upstash Ratelimit for production scale.

## Deployment target

- **Platform:** Vercel (region `bom1` — Mumbai)
- **Root directory:** `frontend`
- **Database:** MongoDB Atlas (required for serverless)
- **Cache:** Upstash Redis (optional)

See [DEPLOYMENT.md](./DEPLOYMENT.md) for step-by-step instructions.
