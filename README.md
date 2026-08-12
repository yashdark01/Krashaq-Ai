# Krashaq

**AI-powered smart farming platform for Indian farmers** — multilingual chat with RAG, weather, irrigation, supplier licensing, and farmer subscriptions.

[![CI](https://github.com/yashdark01/Krashaq-Ai/actions/workflows/ci.yml/badge.svg)](https://github.com/yashdark01/Krashaq-Ai/actions/workflows/ci.yml)
[![Deploy](https://github.com/yashdark01/Krashaq-Ai/actions/workflows/deploy-vercel.yml/badge.svg)](https://github.com/yashdark01/Krashaq-Ai/actions/workflows/deploy-vercel.yml)
[![Live Demo](https://img.shields.io/badge/demo-krashaq--agritech.vercel.app-00C7B7?style=flat&logo=vercel)](https://krashaq-agritech.vercel.app)

---

## What it does

| Role         | Capabilities                                                           |
| ------------ | ---------------------------------------------------------------------- |
| **Farmer**   | AI chat (Hindi/English/Hinglish), weather, notifications, subscription |
| **Supplier** | Manage farmers, issue subscriptions, alerts, usage analytics           |
| **Admin**    | Onboard suppliers, licenses, LLM analytics, scheduler, audit           |

## Tech stack

Next.js 16 · TypeScript · MongoDB · LangGraph · Tailwind · shadcn/ui · Vercel (Mumbai)

## Quick start

```bash
git clone git@github.com:yashdark01/Krashaq-Ai.git
cd Krashaq-Ai
cp .env.example .env.local
# Edit .env.local — see docs/ENVIRONMENT.md
npm install
npm run db:reset    # optional: demo users + KB corpus
npm run dev
```

Open **http://localhost:3000**

**Demo logins** (after `db:reset`):

| Role     | Email                | Password       |
| -------- | -------------------- | -------------- |
| Admin    | admin@krashaq.dev    | Admin@12345    |
| Supplier | supplier@krashaq.dev | Supplier@12345 |
| Farmer   | farmer@krashaq.dev   | Farmer@12345   |

## Project structure

```
Krashaq-Ai/
├── src/
│   ├── app/              # Pages + API routes (App Router)
│   ├── lib/server/       # MongoDB, JWT, LLM, RAG, agents
│   ├── modules/          # Feature UI (admin, chat, supplier…)
│   ├── components/       # shadcn/ui primitives
│   ├── contexts/         # React contexts
│   └── types/
├── content/kb/           # RAG markdown corpus
├── scripts/              # db:reset, kb:ingest, QA, alerts
├── __tests__/            # Jest unit tests
└── docs/                 # Documentation
```

## Scripts

```bash
npm run dev            # Dev server (localhost:3000)
npm run build          # Production build
npm run test           # Jest tests
npm run db:reset       # Seed demo data
npm run kb:ingest      # Ingest content/kb → MongoDB
npm run alerts:run     # Run alert delivery locally
npm run qa:roles       # Role audit (server must be running)
npm run qa:suppliers   # Supplier E2E audit
```

## Deploy

1. Import repo on [Vercel](https://vercel.com/new)
2. **Root directory:** `.` (repo root — not a subfolder)
3. Add env vars from [docs/ENVIRONMENT.md](./docs/ENVIRONMENT.md)
4. Deploy

Full guide: [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)

## Documentation

| Doc                                            | Description         |
| ---------------------------------------------- | ------------------- |
| [docs/README.md](./docs/README.md)             | Documentation index |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | System design       |
| [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)     | Vercel + CI/CD      |
| [docs/ENVIRONMENT.md](./docs/ENVIRONMENT.md)   | Env variables       |
| [docs/API.md](./docs/API.md)                   | REST API reference  |
| [docs/PHASE.md](./docs/PHASE.md)               | Feature tracker     |
| [docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md) | Dev workflow        |

## License

MIT © [Yash Patidar](https://github.com/yashdark01)
