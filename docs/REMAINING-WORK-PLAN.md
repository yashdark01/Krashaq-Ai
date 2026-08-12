# Krashaq — Remaining Work Plan

> Version 1.0 · Aug 2026  
> Status snapshot after Platform Phases A–H (core) + Chat 1–5 + partial Agentic AI  
> Build: ✅ passing · Tests: 35/35 ✅

---

## 0. Executive summary

**Done:** The Next.js monolith runs without the Python backend for auth, chat, farmers, admin, and most APIs. User-scoped chat, RBAC, email flows, MFA backend, role dashboards, ReAct agent, basic RAG, MCP stub, and Tavily web search are in place.

**Remaining:** Polish incomplete features, replace stubs with production implementations, finish the agentic stack (true LangGraph, multi-agent, evals), and harden for production.

**Recommended order:** Finish platform polish → LangGraph + UX → RAG upgrade → multi-agent → production hardening.

---

## 1. Completion matrix

| Track | Phase | Status | Notes |
|-------|-------|--------|-------|
| **Platform** | A — Validation + refresh | ✅ Done | Zod, rotation, `authenticatedFetch` |
| | B — RBAC + nav | ✅ Done | RoleGuard, scoped sidebar |
| | C — Supplier ↔ farmer | ✅ Done | `supplier_id`, scoped APIs |
| | D — Email | ✅ Done | Nodemailer, verify/reset routes |
| | E — MFA | 🟡 ~80% | Backend + login UI done; settings UI + email OTP missing |
| | F — Native routes | 🟡 ~90% | All proxy routes replaced; legacy proxy files still in repo |
| | G — Role dashboards | 🟡 ~70% | `RoleDashboard` on home; dedicated supplier page thin |
| | H — LangSmith admin | 🟡 ~50% | Trace metadata + stats API; no runs table/charts UI |
| **Chat** | Chat-1–5 | ✅ Done | Scope, sidebar UX, seed, search/star/export, tracing |
| **Agentic** | AI-1 ReAct + tools | 🟡 ~60% | ReAct loop works; not a LangGraph StateGraph |
| | AI-2 MCP + tool UX | 🟡 ~40% | Basic `/api/mcp`; not MCP SDK; tool chips partial |
| | AI-3 RAG | 🟡 ~30% | Mongo regex search + 3 seed docs; no vectors/embeddings |
| | AI-4 Multi-agent | ❌ Not started | Python orchestrator not ported |
| | AI-5 Skills | 🟡 ~40% | 1 skill + loader; no prompt registry |
| | AI-6 Memory + evals | ❌ Not started | No `user_memory`, no eval CI |
| | AI-7 Production | 🟡 ~20% | No checkpointer, rate limits, or cost caps |

**Legend:** ✅ Done · 🟡 Partial · ❌ Not started

---

## 2. Remaining phases (prioritized)

### Phase R1 — Platform polish (1 week)

**Goal:** Close gaps in E, G, H and remove dead code.

| # | Task | Priority | Effort |
|---|------|----------|--------|
| R1.1 | **MFA settings UI** — `/profile/settings`: enable/disable 2FA, QR display, backup codes download | P0 | 1–2 days |
| R1.2 | **MFA email on enable** — wire `mfa-enabled.html` template when 2FA confirmed | P1 | 0.5 day |
| R1.3 | **Email OTP fallback** — `POST /api/auth/2fa/send-email-otp` (Redis or Mongo TTL) | P2 | 1 day |
| R1.4 | **LangSmith admin UI** — KPI cards, provider/model breakdown, runs table + detail drawer | P0 | 2–3 days |
| R1.5 | **AnalyticsDashboard** — wire `/api/admin/analytics/llm` + merge with usage stats | P1 | 1 day |
| R1.6 | **Supplier dashboard page** — `/` or `/supplier` with farmer activity, quick actions | P1 | 1 day |
| R1.7 | **Admin ops stubs → real** — audit logs, moderation, scheduler (or hide from nav until ready) | P2 | 1–2 days |
| R1.8 | **Delete legacy proxy** — remove `lib/server/proxy/legacy-python.ts`, `admin-proxy.ts`, migrate scripts | P1 | 0.5 day |
| R1.9 | **Phone OTP** — Twilio/MSG91 integration OR remove phone fields from signup UI | P3 | 2 days / 0.5 day |

**Acceptance**

- [ ] Admin can enable 2FA end-to-end from settings
- [ ] `/admin/analytics` shows LangSmith KPIs when key configured
- [ ] No route returns 501 in normal flows
- [ ] `grep proxyToLegacyPython app/` returns zero matches (already true)

---

### Phase R2 — Agent core upgrade (1–2 weeks)

**Goal:** Replace manual ReAct loop with LangGraph; add intent routing and missing tools.

| # | Task | Priority | Effort |
|---|------|----------|--------|
| R2.1 | **LangGraph StateGraph** — `lib/server/agents/graph.ts` with prepare → agent → tools → continue | P0 | 2–3 days |
| R2.2 | **Mongo checkpointer** — `@langchain/langgraph-checkpoint-mongodb` for resumable streams | P1 | 1 day |
| R2.3 | **Intent router** — fast path (greeting) vs tools vs RAG vs complex | P0 | 1–2 days |
| R2.4 | **Port missing tools** — fertilizer, crop analysis, farmer context (from Python backend) | P0 | 2 days |
| R2.5 | **Remove regex pre-fetch** — let agent choose tools; keep KB hint optional | P1 | 0.5 day |
| R2.6 | **ToolCallChip UI** — collapsible tool input/output in chat stream | P1 | 1 day |
| R2.7 | **Integration tests** — mock LLM tool selection; E2E weather query | P1 | 1 day |

**Acceptance**

- [ ] “Weather in Bhopal” selects `fetch_weather` via LLM (not regex)
- [ ] Compound queries use 2+ tools in one turn
- [ ] Max iteration guard in graph (not ad-hoc loop)
- [ ] Chat UI shows tool name + duration during stream

---

### Phase R3 — RAG pipeline (1–2 weeks)

**Goal:** Ground scheme/crop/pest answers with citations; stop regex KB search.

| # | Task | Priority | Effort |
|---|------|----------|--------|
| R3.1 | **Content corpus** — `content/kb/` with crop calendars, pests, schemes (MP focus) | P0 | 2–3 days |
| R3.2 | **Embeddings + vector index** — MongoDB Atlas Vector Search (preferred) or Pinecone migrate | P0 | 2 days |
| R3.3 | **Ingest CLI** — `npm run kb:ingest` (chunk, embed, upsert) | P0 | 1 day |
| R3.4 | **Hybrid retrieval** — vector + BM25 + RRF + reranker | P1 | 2 days |
| R3.5 | **RAG LangGraph node** — `retrieve_and_grade` with relevance threshold | P0 | 1 day |
| R3.6 | **Citation UX** — SSE citations + message footer “Sources: …” | P1 | 1 day |
| R3.7 | **Anti-fabrication guard** — refuse ungrounded scheme amounts / helplines | P1 | 1 day |

**Acceptance**

- [ ] “PM-KISAN eligibility” returns cited KB answer
- [ ] Empty RAG → honest “consult KVK” response
- [ ] p95 retrieval < 800ms (cached embeddings)

---

### Phase R4 — MCP + skills (1 week)

**Goal:** Standards-compliant MCP; expandable skill library.

| # | Task | Priority | Effort |
|---|------|----------|--------|
| R4.1 | **MCP SDK route** — `@modelcontextprotocol/sdk` Streamable HTTP; tools/list, tools/call | P0 | 2 days |
| R4.2 | **MCP auth** — JWT on MCP requests; RBAC-scoped tools | P0 | 0.5 day |
| R4.3 | **Dogfood MCP** — agent loads tools via `@langchain/mcp-adapters` | P1 | 1 day |
| R4.4 | **Skills expansion** — pest-management, irrigation, scheme-navigation SKILL.md | P1 | 1–2 days |
| R4.5 | **Prompt registry** — versioned prompts in Mongo `prompt_versions` | P2 | 1 day |
| R4.6 | **`read_skill_section` tool** — progressive disclosure for deep skill files | P2 | 0.5 day |

**Acceptance**

- [ ] MCP Inspector lists and calls `fetch_weather` with valid token
- [ ] Single tool implementation (MCP wraps native, no duplicates)
- [ ] Skills auto-load by trigger keywords only

---

### Phase R5 — Multi-agent orchestration (2 weeks)

**Goal:** Port Python Orchestrator + Synthesis to LangGraph subgraphs.

| # | Task | Priority | Effort |
|---|------|----------|--------|
| R5.1 | **Agent registry** — weather, crop, policy, general, synthesizer manifests | P0 | 1 day |
| R5.2 | **Router node** — classify intent + complexity | P0 | 1–2 days |
| R5.3 | **Specialist subgraphs** — one LangGraph subgraph per domain | P0 | 3–4 days |
| R5.4 | **Synthesizer node** — merge multi-agent outputs; match user language | P0 | 1–2 days |
| R5.5 | **Parallel fan-out** — “weather + fertilizer for wheat” in one message | P1 | 1–2 days |
| R5.6 | **A2A handoff types** — structured `AgentHandoff` payload | P2 | 1 day |

**Acceptance**

- [ ] Multi-intent query handled in one user turn
- [ ] LangSmith trace shows per-agent spans
- [ ] Synthesizer output in Hindi when session language is `hi`

---

### Phase R6 — Memory, evals, guardrails (1–2 weeks)

**Goal:** Long-term user context; CI quality gates; safety.

| # | Task | Priority | Effort |
|---|------|----------|--------|
| R6.1 | **`user_memory` collection** — crops, location, farm size (with user confirm) | P1 | 2 days |
| R6.2 | **Post-session memory extract** — optional LLM fact extraction | P2 | 1 day |
| R6.3 | **LangSmith eval datasets** — tool-selection, rag-faithfulness, hindi, safety | P0 | 2–3 days |
| R6.4 | **`npm run eval:agents`** — CI gate on PR (faithfulness ≥ 90%) | P0 | 1 day |
| R6.5 | **Input/output guardrails** — injection in tool args; fake ₹ amounts post-check | P1 | 1–2 days |
| R6.6 | **Per-role token budgets** — farmer < supplier < admin | P2 | 1 day |

**Acceptance**

- [ ] Eval CI fails PR when tool-selection drops below threshold
- [ ] Adversarial “fake scheme” prompts refused >95%

---

### Phase R7 — Production hardening (1 week)

**Goal:** Operate safely at scale; deprecate Python backend entirely.

| # | Task | Priority | Effort |
|---|------|----------|--------|
| R7.1 | **Redis caching** — weather 20m, RAG 5m, LangSmith stats 60s | P1 | 1 day |
| R7.2 | **Tool timeouts + circuit breaker** — 10s per tool; weather API breaker | P1 | 1 day |
| R7.3 | **Rate limits** — per-user chat + API (Upstash or in-memory dev) | P0 | 1–2 days |
| R7.4 | **Cost tracking** — daily LLM cost per user in admin | P1 | 1 day |
| R7.5 | **Degrade modes** — no vector DB → tools-only; no LLM → FAQ templates | P2 | 1 day |
| R7.6 | **Load test** — 100 concurrent streams; document p95 latency | P2 | 1 day |
| R7.7 | **Remove Python backend** from deploy docs; feature flag cleanup | P1 | 0.5 day |

**Acceptance**

- [ ] Interrupted stream can resume via checkpointer (optional v1)
- [ ] Admin sees daily cost summary
- [ ] No dependency on `LEGACY_PYTHON_URL`

---

## 3. Optional / v2 (out of current scope)

| Item | Why defer |
|------|-----------|
| Google OAuth native (full) | Partial flow exists; email auth sufficient for MVP |
| SMS / phone MFA (Twilio) | Email + TOTP covers most users |
| External A2A federation | Internal multi-agent first |
| Voice / WhatsApp bridge | Separate product track |
| Fine-tuned domain LLM | RAG + skills first |
| Message branch / edit (ChatGPT-style) | Nice-to-have after core agent |
| Portfolio theme commit | Separate repo (`myportfolio`) |

---

## 4. Recommended execution timeline

```
Week 1–2   R1 Platform polish (MFA UI, LangSmith dashboard, supplier home)
Week 2–4   R2 LangGraph + tools + tool UX
Week 4–6   R3 RAG pipeline + citations
Week 6–7   R4 MCP SDK + skills expansion
Week 7–9   R5 Multi-agent orchestration
Week 9–10  R6 Evals + guardrails + memory
Week 10–11 R7 Production hardening
```

**Parallel tracks**

- R1.4 (LangSmith UI) can start immediately — no blocker
- R3.1 (KB content writing) can run in parallel with R2 engineering
- R6.3 (eval datasets) should start once R2 tools stabilize

---

## 5. Quick wins (do first)

1. **MFA settings page** — unlocks security story for demos
2. **LangSmith KPI section** on `/admin/analytics` — visible ROI for LLM spend
3. **ToolCallChip in chat** — makes agent feel “ChatGPT-class” immediately
4. **Delete legacy proxy files** — reduces confusion for contributors
5. **`npm run kb:ingest` + 10 real docs** — better answers without full vector pipeline (regex → structured chunks first)

---

## 6. Success metrics (remaining work)

| Metric | Current | Target |
|--------|---------|--------|
| Proxy routes in `app/api` | 0 | 0 (maintain) |
| MFA end-to-end (settings → login) | Partial | 100% |
| LangSmith admin UI sections | 0/4 | 4/4 |
| Tool selection via LLM (eval set) | Untested | >90% |
| RAG answers with citations | Rare | >80% scheme/crop queries |
| MCP SDK compliant | No | Yes |
| LangGraph StateGraph | No | Yes |
| Eval CI on PR | No | Yes |
| Python backend required | No | No (documented) |

---

## 7. Branch strategy

| Branch | Scope |
|--------|-------|
| `feat/platform-polish-r1` | MFA UI, LangSmith dashboard, supplier page |
| `feat/langgraph-r2` | StateGraph, router, missing tools |
| `feat/rag-r3` | Embeddings, ingest, hybrid retrieval |
| `feat/mcp-r4` | MCP SDK, skills |
| `feat/multi-agent-r5` | Orchestrator port |
| `feat/evals-r6` | Datasets, CI, guardrails |
| `feat/hardening-r7` | Rate limits, cache, cost |

Merge to `feat/nextjs-monolith` after each phase passes build + tests + phase acceptance checklist.

---

## 8. References

- [PLATFORM-PHASE-PLAN.md](./PLATFORM-PHASE-PLAN.md) — Phases A–H (original)
- [CHAT-PHASE-PLAN.md](./CHAT-PHASE-PLAN.md) — Chat 1–5 (complete)
- [AGENTIC-RAG-PHASE-PLAN.md](./AGENTIC-RAG-PHASE-PLAN.md) — AI-1–7 (detailed spec)
- Python reference: `backend/app/conversation/services/agent_router.py`

---

*Next step: Pick **R1** (platform polish) or **R2** (LangGraph) depending on whether demos need admin/MFA UI first or smarter agent behavior first.*
