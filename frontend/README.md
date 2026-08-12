# Krashaq Frontend

Next.js 16 monolith — UI + API in one deployable application.

## Quick start

```bash
npm install
cp .env.example .env.local
npm run dev
```

## Docs

Documentation lives at the repo root:

- [Architecture](../docs/ARCHITECTURE.md)
- [Deployment (Vercel)](../docs/DEPLOYMENT.md)
- [Environment variables](../docs/ENVIRONMENT.md)
- [API reference](../docs/API.md)
- [Contributing](../docs/CONTRIBUTING.md)
- [Monolith migration notes](./MONOLITH.md)

## Vercel

Set **Root Directory** to `frontend` when importing the GitHub repo.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server on :3000 |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npm run test:ci` | Unit tests |
