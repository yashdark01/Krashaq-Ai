# Krashaq LLM Reliability and Fallback Design

Date: 2026-04-23  
Status: Approved for planning  
Owner: Krashaq AI Team

## 1) Context and Problem Statement

Krashaq currently advertises multi-provider LLM support across backend and frontend documentation, but runtime behavior is inconsistent:

- Cloud providers are not reliably operational in real flows.
- Fallback behavior does not fully match documented behavior.
- Provider configuration and diagnostics are not sufficient to explain failures quickly.
- New contributor setup is brittle due to missing or inconsistent environment-file expectations.

Business impact:

- Users experience unpredictable AI behavior.
- Only local Ollama is consistently working.
- Operational triage for cloud LLM failures is slow and ambiguous.

## 2) Goals

1. Make cloud LLMs operational and verifiable in real runtime flows.
2. Implement deterministic fallback chain:
   - `grok -> gemini -> xai -> ollama`
3. Keep OpenAI and Claude available as optional providers, outside the primary fallback chain.
4. Provide transparent diagnostics so failures are explainable quickly.
5. Align documentation with real runtime behavior.

## 3) Non-Goals

- Introducing dynamic health-scored provider reordering in this phase.
- Re-architecting broader multi-agent topology beyond provider resolution reliability.
- Replacing existing chat product behavior unrelated to LLM provider resolution.

## 4) Design Decisions

### 4.1 Provider Registry Model

Create/maintain explicit provider registry entries with independent config contracts:

- `grok` (xAI API, Grok model config)
- `gemini` (Google Gemini API)
- `xai` (xAI API, non-Grok model config)
- `ollama` (local)
- `openai` (optional)
- `claude` (optional)

Even though `grok` and `xai` may share the same base endpoint family, they remain distinct provider entries with separate env/model settings.

### 4.2 Primary Fallback Policy

Global fallback order for automatic resolution:

1. `grok`
2. `gemini`
3. `xai`
4. `ollama`

Behavior per request:

- Skip providers missing required credentials/config.
- Attempt providers in order.
- On provider-level failure (auth, model, timeout, transient API error), continue to next provider.
- Return first successful response.
- If all fail, return safe fallback response and structured internal diagnostics.

### 4.3 Optional Provider Availability

OpenAI and Claude remain supported as optional explicit providers:

- Can be selected by config/admin workflows where applicable.
- Are not part of the default fallback chain in this design phase.

### 4.4 Runtime Touchpoints

Provider resolution and fallback behavior must be consistent in:

- backend provider factory/resolver
- chat API flow
- webhook general-response flow
- single-agent and multi-agent orchestration paths
- frontend provider status surface/proxy

## 5) Configuration Contract

### 5.1 Required Variables for Core Chain

- `GROK_API_KEY`
- `GROK_MODEL`
- `GOOGLE_API_KEY`
- `GEMINI_MODEL`
- `XAI_API_KEY`
- `XAI_MODEL`
- `OLLAMA_BASE_URL`
- `OLLAMA_MODEL`

### 5.2 Optional Variables

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `ANTHROPIC_API_KEY`
- `CLAUDE_MODEL`

### 5.3 Env File Baseline

- Ensure `backend/.env.example` exists and is complete.
- Keep placeholders only in templates.
- Do not store live secrets in repository-tracked files.

## 6) Diagnostics and Observability

### 6.1 Provider Status Endpoint Requirements

Expose status for each provider:

- provider name
- configured (key/model present)
- available (initialization health)
- last error category (if failed)
- current fallback order
- currently active/default provider where relevant

### 6.2 Structured Fallback Logging

For each request that hops providers, log:

- attempted provider
- failure category
- elapsed time
- next provider selected
- final provider used (if success)

### 6.3 Timeout and Failure Boundaries

Each provider call must have bounded timeout to avoid blocking the entire chain.

## 7) Verification Strategy

### 7.1 Provider Verification Script

Add a backend verification script that checks each provider with a tiny prompt and timeout.

Output fields per provider:

- `configured`
- `init_ok`
- `invoke_ok`
- `error_reason`
- `latency_ms`

This script is the primary operational truth source for “why cloud LLMs are not working.”

### 7.2 Automated Tests

Unit tests for resolver:

- missing key -> provider skipped
- provider error -> next provider used
- all fail -> safe controlled fallback
- chain order respected exactly

Integration tests for:

- chat endpoint fallback order
- webhook general response fallback order

### 7.3 Acceptance Criteria

Release is acceptable only if:

1. Each configured provider initializes and can be invoked in isolation.
2. Forced-failure simulation advances through chain correctly:
   - `grok -> gemini -> xai -> ollama`
3. End-user request returns successful response when at least one provider is healthy.
4. Diagnostics endpoint reflects real provider status and recent failures.

## 8) Breaking Gaps and Remediation Scope

### 8.1 Critical Gaps Addressed

- Runtime fallback mismatch vs documentation.
- Missing or incomplete env template path for setup.
- Inadequate provider diagnostics for triage.
- Inconsistent behavior between chat and webhook response paths.

### 8.2 Security and Reliability Hygiene

- Remove reliance on secret-bearing files for documentation examples.
- Rotate any exposed credentials immediately.
- Ensure local development remains viable through Ollama terminal fallback.

## 9) System-Wide Gap and Break Inventory (Pre-Plan Baseline)

This section expands scope from LLM reliability to whole-system break risks observed in architecture/docs/core runtime paths.

### 9.1 Security Gaps

- Live credentials present in local environment artifacts must be treated as exposed and rotated.
- Webhook request signature validation is currently disabled in runtime flow, creating spoofing risk.
- Frontend token strategy still relies on local storage path; increased XSS blast radius if compromised.
- CSRF/security-header protections are documented as future work in several places and not uniformly enforced.

### 9.2 Auth and Account-Lifecycle Gaps

- 2FA is documented as partial; UI and backend completeness are not aligned.
- Email verification, password reset, and account deletion flows are uneven across docs and implementation state.
- Session management and revocation guarantees are not clearly validated end to end.

### 9.3 LLM and Conversational Reliability Gaps

- Multi-provider support claim is broader than observed runtime fallback behavior.
- Provider readiness checks are key-presence-heavy and not true invoke-health checks.
- Provider behavior is inconsistent across chat and webhook paths.
- Reflection/fallback behavior exists but lacks strict acceptance testing for regression prevention.

### 9.4 Data and Persistence Gaps

- Some route logic appears to assume ID handling patterns that may diverge from Mongo `_id` object semantics unless normalized.
- Message/search/export features are broad, but schema-index expectations and query guarantees are not fully documented as operational requirements.
- Migration and data-evolution approach is script-based but not yet a standardized migration discipline.

### 9.5 API Contract and Route Consistency Gaps

- Documentation and runtime endpoint behavior can drift without a contract-validation step.
- Frontend API proxy patterns are inconsistent (centralized client vs hardcoded backend URL path in places).
- Error envelope shapes are not fully standardized across all API routes, increasing frontend handling complexity.

### 9.6 Frontend Reliability and UX Gaps

- Several advanced features are present in docs as planned/partial without explicit feature-flag or readiness signaling.
- Admin and analytics surfaces depend on backend maturity; partial backend availability can degrade UX paths.
- Comprehensive integration/e2e coverage is limited compared with feature surface.

### 9.7 Observability and Operations Gaps

- Logging and metrics maturity is mixed across modules; no single operational dashboard contract for critical flows.
- Provider fallback, webhook validation, and scheduler behavior need explicit alerting thresholds.
- Failure triage remains reactive without a single health/diagnostics aggregation source.

### 9.8 Testing and Quality Gaps

- Unit and integration coverage does not yet uniformly enforce critical path guarantees (auth, webhook security, fallback chain, admin ops).
- Cross-path contract tests (frontend route proxy -> backend route -> persistence) are limited.
- Regression-safe acceptance suite for production-like behavior is incomplete.

### 9.9 Documentation Integrity Gaps

- Root/backend/frontend architecture docs contain claims that may outpace tested runtime behavior.
- Setup docs assume artifacts (example env templates and exact setup flow) that must be present and validated.
- No strict docs-to-runtime verification gate currently prevents drift.

### 9.10 Prioritized Gap Classes for Planning

The implementation plan must prioritize in this order:

1. Security-critical breaks (credential hygiene, webhook validation, auth-hardening essentials)
2. Runtime correctness breaks (LLM fallback chain, route-contract consistency)
3. Operational visibility breaks (diagnostics, metrics, logs, alertability)
4. Quality gates (automated tests and acceptance criteria)
5. Documentation synchronization and onboarding reliability

## 10) Rollout Plan

1. Establish config contract and provider registry alignment.
2. Implement resolver chain and provider skip/fallback logic.
3. Integrate chain into all runtime paths.
4. Add diagnostics and structured logging.
5. Add verification script and tests.
6. Update backend/frontend/root documentation to match behavior.
7. Validate acceptance criteria in local environment.

## 11) Risks and Mitigations

- **Risk:** Slow provider responses increase overall latency.  
  **Mitigation:** strict per-provider timeout and bounded chain.

- **Risk:** Partial credentials cause silent degradation.  
  **Mitigation:** explicit configured/unconfigured flags and endpoint visibility.

- **Risk:** Divergence across code paths (chat vs webhook).  
  **Mitigation:** shared resolver function and cross-path integration tests.

## 12) Out-of-Scope Follow-ups

Potential future iteration topics (not in this design scope):

- dynamic provider ranking based on real-time health/latency/cost
- adaptive model selection by query complexity
- richer circuit-breaker patterns per provider

---

This document defines the approved design baseline for the next implementation planning step.
