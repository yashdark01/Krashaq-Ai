# Deployment Guide — Vercel Production

Deploy the **Krashaq Next.js monolith** from the **repository root** (`src/` layout).

## Prerequisites

- GitHub repo: `yashdark01/Krashaq-Ai`
- [Vercel](https://vercel.com) account
- [MongoDB Atlas](https://www.mongodb.com/atlas) cluster
- API keys: Groq (required), WeatherAPI (recommended)

## 1. MongoDB Atlas

1. Create a free M0 cluster (region: Mumbai / AWS ap-south-1).
2. Database Access → create user with read/write.
3. Network Access → allow `0.0.0.0/0` (or Vercel IP ranges).
4. Copy connection string:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/krashaq_ai
   ```

## 2. Vercel project setup

### Option A — Vercel Dashboard (recommended)

1. [Import project](https://vercel.com/new) from GitHub `Krashaq-Ai`.
2. **Root Directory:** `.` (leave empty — repo root)
3. **Framework Preset:** Next.js
4. Add environment variables (see [ENVIRONMENT.md](./ENVIRONMENT.md)).
5. Deploy.

### Option B — Vercel CLI

```bash
npx vercel login
npx vercel link
npx vercel env pull .env.vercel.local
npx vercel --prod
```

## 3. Required environment variables

Set in **Project → Settings → Environment Variables** (Production):

| Variable                          | Required    | Notes                                       |
| --------------------------------- | ----------- | ------------------------------------------- |
| `MONGODB_URL`                     | ✅          | Atlas connection string                     |
| `MONGODB_DB`                      | ✅          | e.g. `krashaq_ai`                           |
| `JWT_SECRET_KEY`                  | ✅          | `openssl rand -hex 32`                      |
| `GROQ_API_KEY`                    | ✅          | Default LLM                                 |
| `LLM_PROVIDER`                    | ✅          | `groq`                                      |
| `WEATHER_API_KEY`                 | Recommended | WeatherAPI.com                              |
| `CRON_SECRET`                     | Recommended | Auth for `/api/cron/alerts`                 |
| `USE_LANGGRAPH_AGENT`             | Optional    | `true` for LangGraph agent                  |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID`    | For OAuth   | Google Cloud Console                        |
| `NEXT_PUBLIC_GOOGLE_REDIRECT_URI` | For OAuth   | `https://your-app.vercel.app/auth/callback` |

**Do not set** `NEXT_PUBLIC_API_URL` — the app uses same-origin `/api/*`.

## 4. Google OAuth (production)

1. [Google Cloud Console](https://console.cloud.google.com/) → OAuth 2.0 Client.
2. Authorized JavaScript origins: `https://your-app.vercel.app`
3. Authorized redirect URIs: `https://your-app.vercel.app/auth/callback`
4. Set env vars in Vercel.

## 5. CI/CD — GitHub Actions

Repository secrets:

| Secret              | Source                     |
| ------------------- | -------------------------- |
| `VERCEL_TOKEN`      | Vercel → Settings → Tokens |
| `VERCEL_ORG_ID`     | Project Settings → General |
| `VERCEL_PROJECT_ID` | Project Settings → General |

Push to `main` triggers `.github/workflows/deploy-vercel.yml`.

## 6. Post-deploy checklist

- [ ] Homepage loads
- [ ] Sign up / login (MongoDB connected)
- [ ] Chat streams AI response (Groq key valid)
- [ ] Weather card loads
- [ ] Admin `/admin/suppliers` accessible
- [ ] Cron: `/api/cron/alerts` runs hourly (check Vercel cron logs)
- [ ] JWT secret is unique (not dev default)

## 7. Custom domain

Vercel → Project → Domains → add your domain.

Update `NEXT_PUBLIC_GOOGLE_REDIRECT_URI` and Google OAuth authorized URLs.

## 8. Optional: Redis (Upstash)

1. Create [Upstash Redis](https://upstash.com/) database.
2. Set `REDIS_URL` in Vercel env.
3. Improves weather caching across serverless instances.

## Troubleshooting

| Issue                         | Fix                                               |
| ----------------------------- | ------------------------------------------------- |
| Chat returns "not configured" | Check `GROQ_API_KEY`, redeploy                    |
| Auth 500 errors               | Verify `MONGODB_URL`, Atlas IP whitelist          |
| Build fails                   | Root directory must be repo root (not `frontend`) |
| Function timeout on chat      | `vercel.json` sets 60s for chat route             |
| Cron 401                      | Set `CRON_SECRET` in Vercel env                   |

## Live URLs

- Production: https://krashaq-agritech.vercel.app
- GitHub: https://github.com/yashdark01/Krashaq-Ai
