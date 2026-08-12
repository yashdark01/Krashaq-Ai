# One-time Vercel setup (run from repo root)

## 1. Login & link

```bash
cd frontend
npx vercel login
npx vercel link
```

When linking, choose:
- Scope: your Vercel account/team
- Link to existing project: **krashaq-agritech** (or create new)
- Root: confirm `frontend`

## 2. Add production env vars

```bash
npx vercel env add MONGODB_URL production
npx vercel env add JWT_SECRET_KEY production
npx vercel env add GROQ_API_KEY production
npx vercel env add WEATHER_API_KEY production
# ... repeat for each variable in .env.example
```

Or bulk-import via Vercel Dashboard → Settings → Environment Variables.

## 3. Deploy

```bash
npx vercel --prod
```

## 4. GitHub Actions (auto-deploy on push to main)

Add repository secrets:
- `VERCEL_TOKEN` — from https://vercel.com/account/tokens
- `VERCEL_ORG_ID` — Project Settings → General
- `VERCEL_PROJECT_ID` — Project Settings → General

Push to `main` triggers `.github/workflows/deploy-vercel.yml`.

See [docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md) for the full checklist.
