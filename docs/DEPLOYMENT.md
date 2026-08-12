# Deployment Guide — Vercel Production

This guide covers deploying the **Krashaq Next.js monolith** to Vercel.

## Prerequisites

- [GitHub](https://github.com) repo: `yashdark01/Krashaq-Ai`
- [Vercel](https://vercel.com) account
- [MongoDB Atlas](https://www.mongodb.com/atlas) cluster (free tier works)
- API keys: Groq (required), WeatherAPI (recommended)

## 1. MongoDB Atlas

1. Create a free M0 cluster (region: Mumbai / AWS ap-south-1).
2. Database Access → create user with read/write.
3. Network Access → allow `0.0.0.0/0` (or Vercel IP ranges for stricter setup).
4. Connect → copy connection string:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/krashaq_ai
   ```

## 2. Vercel project setup

### Option A — Vercel Dashboard (recommended)

1. [Import project](https://vercel.com/new) from GitHub `Krashaq-Ai`.
2. **Root Directory:** `frontend`
3. **Framework Preset:** Next.js
4. Add environment variables (see [ENVIRONMENT.md](./ENVIRONMENT.md) or `.env.production` template below).
5. Deploy.

### Option B — Vercel CLI

```bash
cd frontend
npx vercel login
npx vercel link
npx vercel env pull .env.vercel.local
# Add missing secrets via: npx vercel env add GROQ_API_KEY production
npx vercel --prod
```

## 3. Required environment variables (Vercel)

Set these in **Project → Settings → Environment Variables** for **Production**:

| Variable | Required | Notes |
|----------|----------|-------|
| `MONGODB_URL` | ✅ | Atlas connection string |
| `MONGODB_DB` | ✅ | e.g. `krashaq_ai` |
| `JWT_SECRET_KEY` | ✅ | `openssl rand -hex 32` |
| `GROQ_API_KEY` | ✅ | Default LLM |
| `LLM_PROVIDER` | ✅ | `groq` |
| `WEATHER_API_KEY` | Recommended | WeatherAPI.com |
| `GROQ_MODEL` | Optional | Default `llama-3.3-70b-versatile` |
| `LLM_FALLBACK_CHAIN` | Optional | e.g. `gemini,openai,anthropic` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | For OAuth | Google Cloud Console |
| `NEXT_PUBLIC_GOOGLE_REDIRECT_URI` | For OAuth | `https://your-app.vercel.app/auth/callback` |

**Do not set** `NEXT_PUBLIC_API_URL` in monolith mode — the app uses same-origin `/api/*`.

## 4. Google OAuth (production)

1. [Google Cloud Console](https://console.cloud.google.com/) → OAuth 2.0 Client.
2. Authorized JavaScript origins: `https://your-app.vercel.app`
3. Authorized redirect URIs: `https://your-app.vercel.app/auth/callback`
4. Set `NEXT_PUBLIC_GOOGLE_CLIENT_ID` and redirect URI in Vercel env.

> Google OAuth completion flow may still require `LEGACY_PYTHON_URL` until fully ported.

## 5. CI/CD — GitHub Actions deploy

Add these **GitHub repository secrets**:

| Secret | Source |
|--------|--------|
| `VERCEL_TOKEN` | Vercel → Settings → Tokens |
| `VERCEL_ORG_ID` | Vercel project settings → General |
| `VERCEL_PROJECT_ID` | Vercel project settings → General |

Push to `main` triggers `.github/workflows/deploy-vercel.yml`.

Create a GitHub **environment** named `production` for approval gates (optional).

## 6. Post-deploy checklist

- [ ] Homepage loads at production URL
- [ ] Sign up / login works (MongoDB connected)
- [ ] Chat returns AI response (Groq key valid)
- [ ] Weather card loads (WeatherAPI key)
- [ ] Model selector shows configured providers
- [ ] JWT secret is unique (not dev default)

## 7. Custom domain

Vercel → Project → Domains → add `krashaq.com` (or your domain).

Update:
- `NEXT_PUBLIC_GOOGLE_REDIRECT_URI`
- Google OAuth authorized URLs

## 8. Optional: Redis (Upstash)

1. Create [Upstash Redis](https://upstash.com/) database.
2. Set `REDIS_URL` in Vercel env.
3. Improves weather response caching across serverless instances.

## 9. Optional: Legacy Python backend

For admin/WhatsApp features not yet ported:

```
LEGACY_PYTHON_URL=https://your-python-api.railway.app
```

Deploy FastAPI separately (Railway, Render, Fly.io) with same MongoDB.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Chat returns "not configured" | Check `GROQ_API_KEY` in Vercel env, redeploy |
| Auth 500 errors | Verify `MONGODB_URL`, Atlas IP whitelist |
| Build fails on Vercel | Ensure root directory is `frontend` |
| Admin 501 errors | Expected without `LEGACY_PYTHON_URL` |
| Function timeout on chat | `vercel.json` sets 60s for `/api/chat` |

## Live URLs

- Production: https://krashaq-agritech.vercel.app (update after deploy)
- GitHub: https://github.com/yashdark01/Krashaq-Ai
