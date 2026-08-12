# Krashaq

**AI-powered smart farming assistant for Indian farmers** — weather, irrigation advice, multilingual chat, and farmer management.

[![CI](https://github.com/yashdark01/Krashaq-Ai/actions/workflows/ci.yml/badge.svg)](https://github.com/yashdark01/Krashaq-Ai/actions/workflows/ci.yml)
[![Deploy](https://github.com/yashdark01/Krashaq-Ai/actions/workflows/deploy-vercel.yml/badge.svg)](https://github.com/yashdark01/Krashaq-Ai/actions/workflows/deploy-vercel.yml)
[![Live Demo](https://img.shields.io/badge/demo-krashaq--agritech.vercel.app-00C7B7?style=flat&logo=vercel)](https://krashaq-agritech.vercel.app)

---

## Features

- **Multilingual AI chat** — Hindi, English, Hinglish (Groq, OpenAI, Claude, Gemini, and more)
- **Live weather & irrigation advice** — WeatherAPI.com + rule-based recommendations
- **Farmer dashboard** — location-aware insights and chat
- **Email authentication** — JWT with refresh tokens
- **Admin dashboard** — users, analytics, audit logs (legacy bridge or full port)
- **Model picker** — switch LLM provider/model from the chat UI

## Tech stack

| Layer | Technology |
|-------|------------|
| App | Next.js 16, TypeScript, Tailwind CSS, shadcn/ui |
| API | Next.js Route Handlers (monolith) |
| Database | MongoDB Atlas |
| Cache | Redis / Upstash (optional) |
| LLM | LangChain — Groq, OpenAI, Anthropic, Gemini, xAI, DeepSeek, Mistral, Ollama |
| Deploy | Vercel (Mumbai region) |
| CI/CD | GitHub Actions |
| Legacy | FastAPI + LangGraph (optional, migration in progress) |

## Quick start

```bash
git clone git@github.com:yashdark01/Krashaq-Ai.git
cd Krashaq-Ai/frontend
cp .env.example .env.local
# Edit .env.local — see docs/ENVIRONMENT.md
npm install
npm run dev
```

Open **http://localhost:3000**

> Requires MongoDB running locally or a MongoDB Atlas connection string.

## Production deploy (Vercel)

1. Import repo on [Vercel](https://vercel.com/new) — **root directory: `frontend`**
2. Add env vars from [docs/ENVIRONMENT.md](./docs/ENVIRONMENT.md)
3. Deploy

Full guide: **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)**

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](./docs/ARCHITECTURE.md) | System design, monolith vs legacy |
| [Deployment](./docs/DEPLOYMENT.md) | Vercel, MongoDB Atlas, CI/CD secrets |
| [Environment](./docs/ENVIRONMENT.md) | All env variables |
| [API Reference](./docs/API.md) | REST endpoints |
| [Contributing](./docs/CONTRIBUTING.md) | Dev workflow, PR checklist |
| [Monolith notes](./frontend/MONOLITH.md) | Migration status |

## Project structure

```
Krashaq-Ai/
├── frontend/          # ← Production app (Next.js monolith)
│   ├── app/           # Pages + API routes
│   ├── lib/server/    # MongoDB, JWT, LLM, services
│   └── modules/       # Feature UI components
├── backend/           # Legacy FastAPI (optional)
├── docs/              # Documentation
└── .github/workflows/ # CI + Vercel deploy
```

## API overview

| Endpoint | Description |
|----------|-------------|
| `POST /api/chat` | AI chat with weather/irrigation tools |
| `GET /api/weather?city=` | Current weather |
| `POST /api/auth/signup` | Register |
| `POST /api/auth/login/email` | Login |
| `GET /api/llm/providers` | Available LLM providers/models |
| `GET/POST /api/farmers` | Farmer CRUD |

See [docs/API.md](./docs/API.md) for full reference.

## Scripts (frontend)

```bash
npm run dev          # Development server
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint
npm run test:ci      # Jest unit tests
```

## License

MIT © [Yash Patidar](https://github.com/yashdark01)

## Links

- **Live:** https://krashaq-agritech.vercel.app
- **GitHub:** https://github.com/yashdark01/Krashaq-Ai
