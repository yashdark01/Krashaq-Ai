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

## 9) Rollout Plan

1. Establish config contract and provider registry alignment.
2. Implement resolver chain and provider skip/fallback logic.
3. Integrate chain into all runtime paths.
4. Add diagnostics and structured logging.
5. Add verification script and tests.
6. Update backend/frontend/root documentation to match behavior.
7. Validate acceptance criteria in local environment.

## 10) Risks and Mitigations

- **Risk:** Slow provider responses increase overall latency.  
  **Mitigation:** strict per-provider timeout and bounded chain.

- **Risk:** Partial credentials cause silent degradation.  
  **Mitigation:** explicit configured/unconfigured flags and endpoint visibility.

- **Risk:** Divergence across code paths (chat vs webhook).  
  **Mitigation:** shared resolver function and cross-path integration tests.

## 11) Out-of-Scope Follow-ups

Potential future iteration topics (not in this design scope):

- dynamic provider ranking based on real-time health/latency/cost
- adaptive model selection by query complexity
- richer circuit-breaker patterns per provider

---

This document defines the approved design baseline for the next implementation planning step.
