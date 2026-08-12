# Krashaq Repository Cleanup Plan

> **Status: COMPLETED (Aug 2026).** Historical reference — all phases executed.  
> **Current layout:** repo root + `src/` (see [RESTRUCTURE-PLAN.md](./RESTRUCTURE-PLAN.md)).  
> **Created:** 13 Aug 2026

---

## 1. Executive summary (final)

| Area                  | Verdict  | Action taken                               |
| --------------------- | -------- | ------------------------------------------ |
| **`frontend/`**       | Removed  | Migrated to repo root + `src/`             |
| **`backend/`**        | Archived | Moved to `archive/backend/`                |
| **`docs/`**           | Kept     | Consolidated; `PHASE.md` is master tracker |
| **Root SVG/DOCX**     | Moved    | Now in `docs/assets/`                      |
| **Legacy proxy code** | Deleted  | Monolith is sole runtime                   |
| **Migration scripts** | Deleted  | One-time tools removed                     |

**Production deploys from repo root** (Vercel root directory = `.`).

---

## 2. How we detect “is it used?” (reference)

Run these checks **before any delete**:

```bash
cd /path/to/Krashaq-Ai

# 1. Runtime imports (frontend)
rg "proxyToLegacyPython|LEGACY_PYTHON|admin-proxy|backend/" frontend/app frontend/lib frontend/modules --glob '!**/*.md'

# 2. CI / deploy references
rg "backend" .github frontend/vercel.json README.md docs/DEPLOYMENT.md

# 3. npm scripts pointing at files
cat frontend/package.json | jq '.scripts'

# 4. Git tracked vs untracked
git ls-files backend | wc -l
git status --short | wc -l

# 5. Build still passes after change
cd frontend && npm test -- --ci && npm run build
```

**Rule:** If `rg` finds zero imports in `app/` + `lib/server/` + `modules/`, and CI doesn’t need it, it is safe to remove from the **runtime** tree.

---

## 3. Current repo map

```
Krashaq-Ai/
├── frontend/              ← ONLY production app (Next.js 16 monolith)
│   ├── app/               Pages + /api/* routes (81+ route files)
│   ├── lib/server/        MongoDB, auth, LLM, services
│   ├── modules/           UI by feature
│   └── scripts/           Dev/QA tools (some untracked — see §5)
├── backend/               ← Legacy Python FastAPI (131 tracked files)
├── docs/                  Plans + architecture (partially untracked)
├── .github/workflows/     CI: frontend required, backend optional (continue-on-error)
├── *.svg, *.docx          Root architecture diagrams (not used by app)
├── package-lock.json      Empty stub at repo root (not needed)
└── .pytest_cache/         Local artifact at repo root (should not be committed)
```

---

## 4. Is `backend/` still used?

### Runtime: **NO** (for normal operation)

| Check                                                | Result                                                |
| ---------------------------------------------------- | ----------------------------------------------------- |
| Any `app/api/*` route imports `proxyToLegacyPython`? | **No** — all native Next.js handlers                  |
| `admin-proxy.ts` used anywhere?                      | **No** — file exists but **zero imports**             |
| `LEGACY_PYTHON_URL` required for dev?                | **No** — only if you manually bridge old API          |
| Vercel deploy uses backend?                          | **No** — `frontend/` only                             |
| CI backend job                                       | Runs pytest with `continue-on-error: true` (optional) |

### What backend still contains (reference value only)

| Feature                                   | In monolith?      | Only in Python?                              |
| ----------------------------------------- | ----------------- | -------------------------------------------- |
| Auth, farmers, chat, weather              | ✅                | —                                            |
| Admin dashboard, suppliers, subscriptions | ✅                | —                                            |
| LangGraph / multi-agent (advanced)        | 🟡 partial in TS  | Full version in `backend/app/conversation/`  |
| WhatsApp webhooks                         | ❌                | `backend/app/conversation/routes_webhook.py` |
| Pinecone RAG                              | 🟡 Mongo KB in TS | Pinecone in Python                           |
| Docker / Loki / Promtail                  | —                 | `backend/docker-compose*.yml`                |

**Conclusion:** `backend/` is **not needed to run the app today**, but is useful as **reference** until WhatsApp and any advanced agents are ported.

### Recommended backend disposition

| Option                       | Pros                               | Cons                                  |
| ---------------------------- | ---------------------------------- | ------------------------------------- |
| **A. Archive** (recommended) | Safe; history preserved            | Slightly larger repo or use git tag   |
| **B. Keep + label**          | Easy reference for agents/WhatsApp | Confusing for new devs                |
| **C. Delete from main**      | Cleanest tree                      | Lose reference; need branch/tag first |

**Recommended:** Option A — move to `archive/backend/` **or** tag `legacy/python-v1` on git, then remove folder from `main`.

---

## 5. Frontend — keep vs remove

### ✅ Keep (actively used)

| Path                                     | Why                  |
| ---------------------------------------- | -------------------- |
| `frontend/app/`                          | All pages + API      |
| `frontend/lib/server/`                   | Business logic       |
| `frontend/modules/`                      | UI components        |
| `frontend/content/kb/`                   | RAG corpus           |
| `frontend/scripts/reset-and-seed.mjs`    | `npm run db:reset`   |
| `frontend/scripts/kb-ingest.mjs`         | `npm run kb:ingest`  |
| `frontend/scripts/qa-*.mjs`              | Role/supplier QA     |
| `frontend/scripts/alert-runner.mjs`      | `npm run alerts:run` |
| `frontend/scripts/test-chat-scoping.mjs` | Chat scope tests     |

### ❌ Safe to remove (Phase 3 — dead code)

| Path                                           | Why safe                                        |
| ---------------------------------------------- | ----------------------------------------------- |
| `frontend/lib/server/proxy/legacy-python.ts`   | Zero `app/api` imports; returns 501 without env |
| `frontend/lib/server/auth/admin-proxy.ts`      | Untracked; zero imports                         |
| `frontend/scripts/migrate-routes-to-proxy.mjs` | One-time migration tool                         |
| `frontend/scripts/fix-proxy-params.mjs`        | One-time migration tool                         |
| `frontend/scripts/fix-async-params.mjs`        | One-time migration tool                         |
| `LEGACY_PYTHON_URL` in `.env.example`          | Optional; remove after proxy deleted            |

Also remove from `lib/server/config.ts`: `legacyPythonUrl` field (after proxy deleted).

### 🟡 Commit first (currently untracked but required)

Many supplier platform + notification files show as `??` in git — **commit before cleanup** or you risk losing work:

- `frontend/app/admin/suppliers/**`
- `frontend/app/supplier/**`, `frontend/app/farmer/**`
- `frontend/lib/server/services/*subscription*`, `*usage*`, `*alert-delivery*`
- `frontend/scripts/reset-and-seed.mjs`, `qa-*.mjs`, `alert-runner.mjs`
- `docs/PHASE.md`, `docs/SUPPLIER-PLATFORM-PLAN.md`, etc.

---

## 6. Root-level clutter

| Item                                       | Used by app? | Action                                               |
| ------------------------------------------ | ------------ | ---------------------------------------------------- |
| `agent_orchestration_structure.svg`        | No           | Move → `docs/assets/` or delete                      |
| `farmer_insights_architecture.svg`         | No           | Move → `docs/assets/` or delete                      |
| `kisandrishti_full_architecture.svg`       | No           | Move → `docs/assets/` or delete                      |
| `KisanDrishti_Technical_Architecture.docx` | No           | Move → `docs/assets/` or delete                      |
| `package-lock.json` (root, empty)          | No           | Delete                                               |
| `.pytest_cache/` (repo root)               | No           | Delete locally; add root `.gitignore`                |
| `.vscode/`                                 | IDE only     | Keep locally; add to root `.gitignore` if not shared |

---

## 7. Docs consolidation

| File                                                 | Role                                                     |
| ---------------------------------------------------- | -------------------------------------------------------- |
| **`docs/PHASE.md`**                                  | ✅ Single master tracker — keep                          |
| `docs/SUPPLIER-PLATFORM-PLAN.md`                     | Keep (architecture)                                      |
| `docs/REMAINING-WORK-PLAN.md`                        | 🟡 Partially outdated — merge into PHASE.md then archive |
| `docs/PLATFORM-PHASE-PLAN.md`, `CHAT-*`, `AGENTIC-*` | Keep as deep-dive or move to `docs/plans/`               |
| `docs/superpowers/*`                                 | Old implementation plans — move to `docs/archive/`       |
| `frontend/MONOLITH.md`                               | Update after backend removal (still mentions proxy)      |
| `docs/ARCHITECTURE.md`                               | Update table (admin is native now, not legacy proxy)     |

---

## 8. Phased execution (safe order)

### Phase 0 — Stabilize (do first) ⚠️

- [x] Commit all working `frontend/` + `docs/` changes
- [x] Run `npm test`, `npm run build`, `qa:roles`, `qa:suppliers`
- [x] Tag current state: `git tag legacy/python-backend-v1` + `pre-cleanup-2026-08` on pre-archive HEAD

**Do not delete anything before Phase 0.**

---

### Phase 1 — Local artifacts only (zero risk)

- [x] Delete `backend/htmlcov/`, `backend/.pytest_cache/` (already gitignored)
- [x] Delete repo root `.pytest_cache/`
- [x] Add root `.gitignore`
- [x] Delete empty root `package-lock.json`

**Verify:** `cd frontend && npm run build`

---

### Phase 2 — Remove dead frontend proxy layer

- [x] Delete `frontend/lib/server/proxy/legacy-python.ts`
- [x] Delete `frontend/lib/server/auth/admin-proxy.ts`
- [x] Delete migration scripts: `migrate-routes-to-proxy.mjs`, `fix-proxy-params.mjs`, `fix-async-params.mjs`
- [x] Remove `legacyPythonUrl` from `lib/server/config.ts`
- [x] Remove `# LEGACY_PYTHON_URL` from `frontend/.env.example`
- [x] Update `frontend/MONOLITH.md` + `docs/ARCHITECTURE.md`

**Verify:** `rg proxyToLegacyPython frontend` → no matches; build + tests pass

---

### Phase 3 — Backend decision

**Option A — Archive (recommended):** ✅ Done

```bash
git tag legacy/python-backend-v1   # pointer before removal
mkdir -p archive
git mv backend archive/backend
# Update README, docs/ARCHITECTURE.md, ci.yml (remove backend job)
```

**Option B — Keep as reference:**

- [ ] Add `backend/README.md` banner: “NOT USED IN PRODUCTION — reference only”
- [ ] Remove backend job from `.github/workflows/ci.yml` (or keep continue-on-error)

**Before delete/archive, extract if needed:**

- [ ] Copy WhatsApp webhook logic notes to `docs/archive/WHATSAPP-PYTHON-REFERENCE.md`
- [ ] Copy agent_router overview to `docs/archive/PYTHON-AGENTS-REFERENCE.md`

**Verify:** Production deploy still works; no `LEGACY_PYTHON_URL` in Vercel env

---

### Phase 4 — Root assets & docs folder ✅

- [x] Create `docs/assets/` and move SVG/DOCX
- [x] Move `docs/superpowers/` → `docs/archive/superpowers/`
- [x] Update root `README.md` project structure section
- [ ] Create `docs/plans/` — optional future consolidation

---

### Phase 5 — Final structure (current)

```
Krashaq-Ai/
├── src/                      # Next.js app source
│   ├── app/                  # Pages + API routes
│   ├── lib/server/           # Services, agents, RAG
│   └── modules/              # Feature UI
├── content/kb/               # RAG corpus
├── scripts/                  # npm script CLIs
├── __tests__/                # Jest tests
├── docs/
│   ├── PHASE.md              # Master tracker
│   ├── assets/               # Diagrams
│   └── archive/              # superpowers, Python notes
├── archive/backend/          # Legacy Python
├── package.json              # npm root
└── README.md
```

---

## 9. What NOT to delete

| Item                                          | Reason                   |
| --------------------------------------------- | ------------------------ |
| `.next/`                                      | Build cache — gitignored |
| `node_modules/`                               | Dependencies             |
| `content/kb/`                                 | RAG corpus               |
| `docs/PHASE.md`                               | Master phase tracker     |
| Any file referenced in `package.json` scripts | Breaks npm commands      |

---

## 10. Verification checklist

```bash
npm ci
npm test -- --ci
npm run build
npm run qa:roles -- http://localhost:3001
npm run qa:suppliers -- http://localhost:3001

rg "proxyToLegacyPython|LEGACY_PYTHON" src/   # expect: 0
```

---

## 11. Quick answers (final)

**Is `archive/backend/` used?**  
No for running the app. Reference only.

**Will deleting backend break Vercel?**  
No — Vercel deploys repo root.

**Current production path?**  
Repo root → `src/app/api/*` + `src/lib/server/*`.
