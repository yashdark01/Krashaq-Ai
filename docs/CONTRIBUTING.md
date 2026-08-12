# Contributing to Krashaq

Thank you for contributing. This project follows standard open-source practices.

## Development setup

```bash
git clone git@github.com:yashdark01/Krashaq-Ai.git
cd Krashaq-Ai/frontend
cp .env.example .env.local
# Fill in MONGODB_URL, GROQ_API_KEY, JWT_SECRET_KEY, WEATHER_API_KEY
npm install
npm run dev
```

Open http://localhost:3000

## Branch strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready; auto-deploys to Vercel |
| `develop` | Integration branch |
| `feat/*` | New features |
| `fix/*` | Bug fixes |

## Before opening a PR

```bash
cd frontend
npm run lint
npm run format:fix    # if format check fails
npm run test:ci
npm run build
```

## Code style

- TypeScript strict mode
- ESLint + Prettier (run `npm run lint:fix` and `npm run format:fix`)
- Server logic in `lib/server/` — never import from client components
- API routes stay thin; business logic in services

## Commit messages

Use clear, imperative subjects:

```
feat(chat): add DeepSeek provider support
fix(auth): handle expired refresh tokens
docs: update Vercel deployment guide
ci: add production deploy workflow
```

## Project layout for new features

1. **API route** → `frontend/app/api/<feature>/route.ts`
2. **Service** → `frontend/lib/server/services/<feature>.ts`
3. **UI** → `frontend/modules/<domain>/components/`
4. **Types** → `frontend/types/`

## Security

- Never commit `.env`, `.env.local`, or API keys
- Never log tokens or passwords
- Rotate keys if accidentally exposed

## Questions

Open a GitHub issue or contact the maintainer.
