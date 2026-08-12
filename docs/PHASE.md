# Krashaq — Master Phase Tracker

> **Single source of truth** for everything built from project start → production.  
> Update checkboxes when a phase/task is truly done (code + UI visible + tested).  
> Last reviewed: 13 Aug 2026  
> **Last QA run:** `qa:roles` 111/111 pass · `qa:suppliers` 9/9 pass (localhost:3001)

**Legend:** ✅ Done · 🟡 Partial · ❌ Not started

**Related docs:** [PLATFORM-PHASE-PLAN.md](./PLATFORM-PHASE-PLAN.md) · [CHAT-PHASE-PLAN.md](./CHAT-PHASE-PLAN.md) · [AGENTIC-RAG-PHASE-PLAN.md](./AGENTIC-RAG-PHASE-PLAN.md) · [SUPPLIER-PLATFORM-PLAN.md](./SUPPLIER-PLATFORM-PLAN.md) · [REMAINING-WORK-PLAN.md](./REMAINING-WORK-PLAN.md)

**Verify commands:**
```bash
cd frontend
npm test -- --ci
npm run build
npm run qa:roles -- http://localhost:3001
npm run qa:suppliers -- http://localhost:3001
```

---

## Track 1 — Platform (Auth, RBAC, Email, MFA)

| Phase | Task | Status | UI / Route | Notes |
|-------|------|--------|------------|-------|
| **A** | Zod validation on auth/farmer APIs | ✅ | — | `lib/server/validation/` |
| **A** | JWT access + refresh + rotation | ✅ | — | `session-service.ts` |
| **A** | `authenticatedFetch` + proactive refresh | ✅ | — | `lib/api/authenticated-fetch.ts` |
| **B** | Role normalize (`supplier`, `pestisides-supplier`) | ✅ | — | `lib/auth/roles.ts` |
| **B** | `RoleGuard` + scoped sidebar nav | ✅ | Sidebar | `main-nav.ts` |
| **B** | Farmer blocked from supplier/admin routes | ✅ | `/farmers`, `/admin/*` | |
| **C** | `supplier_id` on farmers | ✅ | — | MongoDB `users` |
| **C** | Supplier-scoped farmer APIs | ✅ | `/api/farmers` | |
| **C** | Admin assign farmer → supplier | ✅ | API only | `POST .../assign` — UI on supplier detail |
| **D** | Nodemailer + email templates | ✅ | — | welcome, verify, reset, supplier welcome |
| **D** | Email verify + password reset routes | ✅ | `/auth/*` | |
| **E** | MFA backend (TOTP + backup codes) | ✅ | — | `mfa-service.ts` |
| **E** | MFA login step | ✅ | `/auth/login` | |
| **E** | MFA settings UI | ✅ | `/profile/settings` | enable/disable/regenerate |
| **E** | MFA email on enable | ❌ | — | template exists, not wired |
| **E** | Email OTP fallback | ❌ | — | |
| **F** | Native `/api/*` (no Python proxy in app routes) | ✅ | — | grep clean |
| **F** | Delete legacy proxy files | ❌ | — | files still in repo |
| **G** | Role dashboard on home | ✅ | `/` | `RoleDashboard.tsx` |
| **G** | Dedicated admin dashboard | 🟡 | `/admin` | live stats; needs polish |
| **H** | LangSmith trace metadata on chat | ✅ | — | env-gated |
| **H** | Admin LLM analytics KPIs + runs table | ✅ | `/admin/analytics` | |
| **H** | Full platform analytics merge | 🟡 | `/admin/analytics` | partial |

---

## Track 2 — Chat & Conversation

| Phase | Task | Status | UI / Route | Notes |
|-------|------|--------|------------|-------|
| **Chat-1** | User-scoped chat sessions | ✅ | `/chat` | |
| **Chat-1** | Auth on all message APIs | ✅ | — | |
| **Chat-2** | Sidebar session list + new chat | ✅ | Sidebar | |
| **Chat-2** | `db:reset` seed sessions | ✅ | — | |
| **Chat-3** | Search / star / export | ✅ | Chat UI | |
| **Chat-4** | Streaming SSE chat | ✅ | `/chat` | agent + legacy paths |
| **Chat-5** | LangSmith metadata on stream | ✅ | — | |

---

## Track 3 — Agentic AI & RAG

| Phase | Task | Status | UI / Route | Notes |
|-------|------|--------|------------|-------|
| **AI-1** | LangGraph StateGraph agent | ✅ | — | `lib/server/agents/graph.ts` |
| **AI-1** | Intent router (fast/rag/tools) | ✅ | — | |
| **AI-1** | Farming tools (weather, KB, etc.) | ✅ | Chat | `ToolCallChip` |
| **AI-1** | Real-time tool/token SSE | ✅ | Chat | `event-queue.ts` |
| **AI-2** | MCP stub API | 🟡 | `/api/mcp` | not full SDK |
| **AI-2** | Tool call chips in UI | ✅ | Chat | |
| **AI-3** | KB corpus + hybrid search | ✅ | — | `content/kb/` |
| **AI-3** | Citations in chat | ✅ | Chat | `CitationList` |
| **AI-3** | `kb:ingest` on db:reset | ✅ | — | |
| **AI-4** | Multi-agent orchestrator | ❌ | — | |
| **AI-5** | Skills / prompt registry | 🟡 | — | partial |
| **AI-6** | Eval CI + user memory | ❌ | — | |
| **AI-7** | Rate limits, Redis, cost caps | ❌ | — | |

---

## Track 4 — Supplier platform (B2B2C licensing)

| Phase | Task | Status | UI / Route | Notes |
|-------|------|--------|------------|-------|
| **S1.1** | Admin dashboard live stats | ✅ | `/admin` | suppliers, licenses, farmers |
| **S1.2** | `supplier_licenses` collection + service | ✅ | — | plans: trial/starter/growth/enterprise |
| **S1.3** | Onboard supplier + issue license | ✅ | `/admin/suppliers/new` | welcome email |
| **S1.4** | Supplier detail: suspend / reactivate | ✅ | `/admin/suppliers/[id]` | |
| **S1.5** | Supplier list with license + farmer count | ✅ | `/admin/suppliers` | |
| **S1.6** | Login gate (inactive / expired license) | ✅ | `/auth/login` | error message shown |
| **S1.7** | Admin users excludes suppliers | ✅ | `/admin/users` | link → suppliers |
| **S1.8** | Admin nav: Suppliers (not Farmers) | ✅ | Sidebar | |
| **S2.1** | Supplier hub dashboard | ✅ | `/supplier` | |
| **S2.2** | Farmer edit UI | ✅ | `/farmers`, `/supplier/farmers/[id]` | inline edit + detail |
| **S2.6** | Farmer subscription (supplier sells to farmer) | ✅ | `/farmer/subscription` | trial/basic/standard/premium |
| **S2.7** | Supplier subscription management | ✅ | `/supplier/subscriptions` | issue/renew/suspend |
| **S2.8** | Farmer login gated by subscription | ✅ | `/auth/login` | when linked to supplier |
| **S2.9** | Admin tracks supplier license + farmer sub stats | ✅ | `/admin/suppliers/[id]` | usage panel |
| **S2.10** | Supplier farmer analytics (like admin) | ✅ | `/supplier/analytics` | per-farmer chat usage |
| **S2.3** | Seat limit on create farmer | ✅ | `/farmers` | banner + disabled add |
| **S2.4** | Admin view farmers on supplier detail | ✅ | `/admin/suppliers/[id]` | list only |
| **S2.5** | Supplier license page | ✅ | `/supplier/license` | |
| **S3.1** | `farmer_alerts` collection + CRUD API | ✅ | — | |
| **S3.2** | Supplier alerts UI | ✅ | `/supplier/alerts` | create enable/disable |
| **S3.3** | Alert cron runner (delivery) | ✅ | `/admin/scheduler`, `/api/cron/alerts` | hourly Vercel cron + Run now |
| **S3.4** | Per-farmer alert target picker | ✅ | `/supplier/alerts` | checkbox multi-select |
| **S3.5** | In-app notification delivery | ✅ | Header bell, `/farmer/notifications` | |
| **S4** | Admin config panel ↔ API schema | ✅ | `/admin/config` | read-only env status |
| **S4** | Audit logs on supplier lifecycle | ✅ | `/admin/audit` | onboard/suspend/renew |
| **S5** | SMS / WhatsApp alert delivery | ❌ | — | in_app only; sms/whatsapp logged as skipped |

### Supplier E2E checklist (manual browser)

- [x] 1 · **Admin** — `/admin/suppliers` → Onboard → new row with plan + 0 farmers *(API verified)*
- [x] 2 · **Admin** — Open supplier → Manage → license card, farmer list, suspend/renew *(UI + API)*
- [x] 3 · **New supplier** — Login with issued credentials → lands on `/supplier` dashboard *(API verified)*
- [x] 4 · **Supplier** — `/farmers` → Add farmer → count + seat banner update *(UI + seat limit)*
- [x] 5 · **Supplier** — `/supplier/alerts` → New alert → list + toggle on/off *(API verified)*
- [x] 6 · **Supplier** — `/supplier/license` → plan, seats, expiry visible *(UI)*
- [x] 7 · **Admin** — Suspend supplier → badge shows Suspended *(API verified)*
- [x] 8 · **Supplier** — Login while suspended → blocked with error *(API verified)*
- [ ] 9 · **Admin** — Reactivate → supplier can log in again *(API exists; re-run after suspend test)*

Automated script covers steps 1–8: `npm run qa:suppliers -- http://localhost:3001`

---

## Track 5 — Admin ops & polish (R1)

| Phase | Task | Status | UI / Route | Notes |
|-------|------|--------|------------|-------|
| R1.1 | MFA settings UI | ✅ | `/profile/settings` | |
| R1.2 | MFA enable email | ❌ | — | |
| R1.4 | LangSmith runs UI | ✅ | `/admin/analytics` | |
| R1.5 | Analytics dashboard wired | 🟡 | `/admin/analytics` | |
| R1.6 | Supplier dashboard (not admin) | ✅ | `/supplier` | |
| R1.7 | Admin audit/scheduler real or hidden | ✅ | `/admin/scheduler` | alert runner + delivery log |
| R1.8 | Remove legacy Python proxy | ✅ | — | backend archived; proxy deleted |
| R1.9 | Phone OTP or remove from signup | ✅ | `/profile` | SMS OTP disabled; email login only |

---

## Track 6 — Production & infra

| Phase | Task | Status | Notes |
|-------|------|--------|-------|
| P1 | MongoDB Atlas production | 🟡 | local dev works |
| P2 | Vercel deploy monolith | 🟡 | documented |
| P3 | Redis / rate limiting | ❌ | |
| P4 | LangGraph Mongo checkpointer | ❌ | |
| P5 | Redux Toolkit / RTK Query (optional) | ❌ | discussed, not started |

---

## Recommended build order (what’s left)

```
1. Payments — Razorpay for supplier license + farmer subscription
2. S5 WhatsApp/SMS alert delivery (Twilio/MSG91)
3. R1.8 Remove legacy proxy
4. P1/P2 Production deploy hardening
```

---

## Phase completion summary

| Track | Done | Partial | Not started |
|-------|------|---------|-------------|
| Platform A–H | 18 | 4 | 4 |
| Chat 1–5 | 8 | 0 | 0 |
| Agentic AI | 8 | 2 | 4 |
| Supplier S1–S5 | 14 | 0 | 6 |
| Admin polish R1 | 4 | 2 | 3 |
| Production | 0 | 2 | 3 |

**Supplier license onboarding:** ✅ **End-to-end** (API + admin UI + supplier login + seat limits + alerts CRUD).  
**Not yet end-to-end:** alert *delivery*, farmer edit, payment/billing.

---

*When you finish a task, change its Status here and run the verify commands above.*
