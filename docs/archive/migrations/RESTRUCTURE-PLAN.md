# Krashaq — Repo restructure plan (`frontend/` → root + `src/`)

> **Goal:** Remove the `frontend/` nesting. Single Next.js app at repo root with standard `src/` layout.  
> **Status:** ✅ Completed Aug 2026  
> **Risk:** Medium — many path references in CI, Vercel, docs (all updated)

---

## 1. Why

| Before                       | After                         |
| ---------------------------- | ----------------------------- |
| `Krashaq-Ai/frontend/app/`   | `Krashaq-Ai/src/app/`         |
| Vercel root = `frontend`     | Vercel root = `.` (repo root) |
| `cd frontend && npm run dev` | `npm run dev` from repo root  |
| Docs say "go to frontend"    | One app, one `package.json`   |

---

## 2. Target layout

```
Krashaq-Ai/
├── src/                      # All application source
│   ├── app/                  # Next.js App Router (pages + API)
│   ├── components/           # shadcn/ui primitives
│   ├── contexts/             # React contexts
│   ├── data/                 # Static data
│   ├── lib/                  # Shared + server (services, agents, RAG)
│   ├── modules/              # Feature UI (admin, chat, supplier…)
│   └── types/                # TypeScript types
├── content/kb/               # RAG markdown corpus (not in src — data)
├── scripts/                  # db:reset, kb:ingest, qa, alerts
├── __tests__/                # Jest tests (mirror src paths)
├── archive/backend/          # Legacy Python (reference)
├── docs/                     # Documentation
├── package.json              # Single npm root
├── next.config.js
├── tsconfig.json
├── tailwind.config.ts
├── vercel.json
├── jest.config.js
└── .env.example
```

**Stays outside `src/` (Next.js convention):**

- `content/` — corpus ingested by scripts (`process.cwd()/content/kb`)
- `scripts/` — Node CLI scripts invoked by npm
- `__tests__/` — Jest root (maps `@/` → `src/`)
- Config files at repo root

---

## 3. Path alias changes

```json
// tsconfig.json
"paths": {
  "@/*": ["./src/*"],
  "@/components/ErrorBoundary": ["./src/modules/common/components/ErrorBoundary"],
  ...
}
```

**No import changes needed in source files** — `@/lib/...` still works via updated tsconfig.

---

## 4. Config file updates

| File                      | Change                                                        |
| ------------------------- | ------------------------------------------------------------- |
| `tsconfig.json`           | `@/*` → `./src/*`; include paths                              |
| `tailwind.config.ts`      | `./src/app/**`, `./src/modules/**`, etc.                      |
| `jest.config.js`          | `moduleNameMapper`: `@/` → `<rootDir>/src/`; coverage paths   |
| `vercel.json`             | `src/app/api/**` for function paths                           |
| `.gitignore`              | `.next/`, `node_modules/` at root (remove `frontend/` prefix) |
| `.github/workflows/*.yml` | Remove `working-directory: frontend`                          |
| `docs/*`, `README.md`     | Replace `frontend/` references                                |

---

## 5. Vercel migration (manual after merge)

1. Project Settings → **Root Directory**: change `frontend` → **empty** (repo root)
2. Redeploy — build command stays `npm run build`
3. Env vars unchanged (same keys)

---

## 6. Execution phases

### Phase A — Move files (git mv)

- [x] `frontend/{app,lib,modules,components,contexts,data,types}` → `src/`
- [x] `frontend/{content,scripts,__tests__}` → repo root
- [x] `frontend/{package.json,configs}` → repo root
- [x] `frontend/MONOLITH.md` → `docs/MONOLITH.md`
- [x] Remove empty `frontend/`

### Phase B — Update configs

- [x] tsconfig, tailwind, jest, vercel
- [x] CI workflows
- [x] Root `.gitignore`, `README.md`, key docs

### Phase C — Verify

- [x] `npm ci && npm test && npm run build`
- [ ] `npm run qa:roles` (optional, needs dev server)

### Phase D — Post-merge

- [x] Update Vercel root directory (manual in dashboard)
- [ ] Tag: `git tag pre-src-restructure` (optional rollback pointer)

---

## 7. Rollback

```bash
git checkout pre-src-restructure -- .
# Or revert the restructure commit
```

---

## 8. What does NOT move

| Path                 | Reason                                   |
| -------------------- | ---------------------------------------- |
| `archive/backend/`   | Already archived                         |
| `docs/`              | Documentation                            |
| Root SVG/DOCX assets | Design artifacts (Phase 4 cleanup later) |

---

_After this restructure, all dev commands run from repo root._
