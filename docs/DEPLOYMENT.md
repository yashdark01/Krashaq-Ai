# Deployment Guide — Manual (Vercel)

Deploy Krashaq **manually** from the repo root. No GitHub Actions auto-deploy required.

**Prerequisites:** [Vercel](https://vercel.com) account · [MongoDB Atlas](https://www.mongodb.com/atlas) · Groq API key

---

## Option 1 — Vercel Dashboard (easiest)

### Step 1 · MongoDB Atlas

1. Create M0 cluster (Mumbai / `ap-south-1`).
2. **Database Access** → user with read/write.
3. **Network Access** → allow `0.0.0.0/0`.
4. Copy connection string:
   ```
   mongodb+srv://USER:PASSWORD@cluster.mongodb.net/krashaq_ai
   ```

### Step 2 · Import project

1. Open [vercel.com/new](https://vercel.com/new).
2. Import **`yashdark01/Krashaq-Ai`** from GitHub.
3. Settings:
   - **Root Directory:** leave **empty** (repo root)
   - **Framework:** Next.js
   - **Build Command:** `npm run build`
   - **Install Command:** `npm ci`
4. Add **Environment Variables** (Production) — see [table below](#required-env-vars).
5. Click **Deploy**.

### Step 3 · After first deploy

1. Copy your URL (e.g. `https://krashaq-agritech.vercel.app`).
2. Update in Vercel env:
   - `NEXT_PUBLIC_GOOGLE_REDIRECT_URI` → `https://YOUR-URL/auth/callback`
3. **Redeploy** (Deployments → ⋯ → Redeploy).

---

## Option 2 — Vercel CLI (manual from terminal)

Run these from the **repo root** (where `package.json` is):

```bash
npm install
npm run build          # verify build locally first
npx vercel login
npx vercel link        # link to existing project or create new
```

Add production secrets (repeat for each variable):

```bash
npx vercel env add MONGODB_URL production
npx vercel env add JWT_SECRET_KEY production
npx vercel env add GROQ_API_KEY production
# ... see ENVIRONMENT.md for full list
```

Deploy:

```bash
npx vercel --prod
```

---

## Option 3 · Self-host (Node server)

From repo root:

```bash
npm ci
cp .env.example .env.local   # fill production values
npm run build
npm start                    # listens on :3000
```

Use PM2, Docker, or a VPS reverse proxy (nginx) in front of port 3000.

---

## Required env vars

| Variable                          | Required    | Example / notes                                   |
| --------------------------------- | ----------- | ------------------------------------------------- |
| `MONGODB_URL`                     | ✅          | Atlas connection string                           |
| `MONGODB_DB`                      | ✅          | `krashaq_ai`                                      |
| `JWT_SECRET_KEY`                  | ✅          | `openssl rand -hex 32`                            |
| `GROQ_API_KEY`                    | ✅          | From [console.groq.com](https://console.groq.com) |
| `LLM_PROVIDER`                    | ✅          | `groq`                                            |
| `WEATHER_API_KEY`                 | Recommended | [weatherapi.com](https://www.weatherapi.com/)     |
| `CRON_SECRET`                     | Recommended | Random string for `/api/cron/alerts`              |
| `USE_LANGGRAPH_AGENT`             | Optional    | `true`                                            |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID`    | OAuth       | Google Cloud Console                              |
| `NEXT_PUBLIC_GOOGLE_REDIRECT_URI` | OAuth       | `https://your-app.vercel.app/auth/callback`       |

Full list: [ENVIRONMENT.md](./ENVIRONMENT.md)

**Do not set** `NEXT_PUBLIC_API_URL` — app uses same-origin `/api/*`.

---

## Google OAuth (production)

1. [Google Cloud Console](https://console.cloud.google.com/) → OAuth 2.0 Client.
2. **Authorized JavaScript origins:** `https://your-app.vercel.app`
3. **Authorized redirect URIs:** `https://your-app.vercel.app/auth/callback`
4. Set `NEXT_PUBLIC_GOOGLE_CLIENT_ID` and redirect URI in Vercel env → Redeploy.

---

## Cron (alert delivery)

`vercel.json` registers hourly cron → `POST /api/cron/alerts`.

1. Set `CRON_SECRET` in Vercel env.
2. After deploy, check **Vercel → Project → Cron Jobs** for successful runs.

---

## Post-deploy checklist

- [ ] Homepage loads
- [ ] Sign up / login works
- [ ] Chat returns AI response
- [ ] Weather loads on dashboard
- [ ] Admin `/admin/suppliers` works
- [ ] Cron runs (Vercel cron logs)
- [ ] `JWT_SECRET_KEY` is not the dev default

---

## Troubleshooting

| Issue                 | Fix                                               |
| --------------------- | ------------------------------------------------- |
| Build fails           | Root directory must be repo root (not `frontend`) |
| Auth 500              | Check `MONGODB_URL`, Atlas IP whitelist           |
| Chat "not configured" | Set `GROQ_API_KEY`, redeploy                      |
| Cron 401              | Set `CRON_SECRET`                                 |
| Chat timeout          | `vercel.json` allows 60s for chat route           |

---

## Optional · GitHub Actions deploy

Auto-deploy is **off by default**. To deploy from GitHub Actions manually:

1. Add secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
2. GitHub → **Actions** → **Deploy to Vercel** → **Run workflow**

---

## Live URLs

- Production: https://krashaq-agritech.vercel.app
- GitHub: https://github.com/yashdark01/Krashaq-Ai
