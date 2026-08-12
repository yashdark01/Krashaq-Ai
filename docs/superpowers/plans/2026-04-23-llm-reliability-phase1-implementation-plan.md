# LLM Reliability Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make cloud LLMs actually work in production paths with deterministic fallback (`grok -> gemini -> xai -> ollama`), plus critical security and observability fixes.

**Architecture:** Introduce a single shared provider resolver in backend that all chat/webhook/agent flows use, with per-provider health diagnostics, explicit timeout handling, and deterministic fallback. Keep OpenAI/Claude optional and available, but outside the primary chain. Add verification tooling and tests before doc sync.

**Tech Stack:** FastAPI, Python, LangChain providers, pytest, Next.js API routes, TypeScript

---

## Scope Check

The approved spec includes multiple independent subsystems. This plan intentionally covers **Sub-project 1 (highest priority)** only:

1. Security-critical LLM/runtime breaks
2. Fallback/runtime correctness
3. Diagnostics and verification
4. Minimal docs alignment needed for this slice

Follow-up plans should be created for:
- Auth lifecycle completion (2FA/email reset/delete)
- Data contract hardening and API schema consistency
- Frontend reliability/e2e expansion
- Broader observability/alerting platform

---

### Task 1: Establish Configuration Contract and Example Env

**Files:**
- Create: `backend/.env.example`
- Modify: `backend/app/config.py`
- Test: `backend/tests/unit/test_llm_config_contract.py`

- [ ] **Step 1: Write the failing test**

```python
from app.config import get_settings


def test_settings_exposes_primary_chain_fields(monkeypatch):
    monkeypatch.setenv("GROK_API_KEY", "grok-key")
    monkeypatch.setenv("GROK_MODEL", "grok-2-latest")
    monkeypatch.setenv("GOOGLE_API_KEY", "gemini-key")
    monkeypatch.setenv("GEMINI_MODEL", "gemini-1.5-pro")
    monkeypatch.setenv("XAI_API_KEY", "xai-key")
    monkeypatch.setenv("XAI_MODEL", "xai-reasoner")
    monkeypatch.setenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434")
    monkeypatch.setenv("OLLAMA_MODEL", "llama3.1:8b")

    settings = get_settings()
    assert settings.grok_api_key == "grok-key"
    assert settings.grok_model == "grok-2-latest"
    assert settings.gemini_model == "gemini-1.5-pro"
    assert settings.xai_model == "xai-reasoner"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pytest tests/unit/test_llm_config_contract.py -v`  
Expected: FAIL with missing settings attributes like `grok_api_key`/`xai_model`.

- [ ] **Step 3: Write minimal implementation**

```python
# backend/app/config.py
self.grok_api_key = os.getenv("GROK_API_KEY", "")
self.grok_model = os.getenv("GROK_MODEL", "grok-2-latest")
self.gemini_model = os.getenv("GEMINI_MODEL", "gemini-1.5-pro")
self.xai_model = os.getenv("XAI_MODEL", "xai-reasoner")

# keep optional providers available
self.openai_model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
self.claude_model = os.getenv("CLAUDE_MODEL", "claude-3-haiku-20240307")
```

```env
# backend/.env.example
LLM_PROVIDER=grok
LLM_FALLBACK_CHAIN=grok,gemini,xai,ollama
LLM_PROVIDER_TIMEOUT_SECONDS=12

GROK_API_KEY=your_grok_api_key_here
GROK_MODEL=grok-2-latest
GOOGLE_API_KEY=your_google_api_key_here
GEMINI_MODEL=gemini-1.5-pro
XAI_API_KEY=your_xai_api_key_here
XAI_MODEL=xai-reasoner
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.1:8b

OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
ANTHROPIC_API_KEY=your_anthropic_api_key_here
CLAUDE_MODEL=claude-3-haiku-20240307
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && pytest tests/unit/test_llm_config_contract.py -v`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/.env.example backend/app/config.py backend/tests/unit/test_llm_config_contract.py
git commit -m "feat: add explicit LLM configuration contract"
```

---

### Task 2: Implement Deterministic Fallback Resolver

**Files:**
- Modify: `backend/app/services/llm_provider.py`
- Create: `backend/tests/unit/test_llm_provider_chain.py`
- Test: `backend/tests/unit/test_llm_provider_chain.py`

- [ ] **Step 1: Write the failing test**

```python
from app.services.llm_provider import resolve_llm_with_chain


def test_resolver_uses_chain_order(monkeypatch):
    calls = []

    def fake_init(provider, temperature=0.7):
        calls.append(provider)
        if provider in {"grok", "gemini"}:
            raise RuntimeError("provider down")
        return f"ok:{provider}"

    llm, used, errors = resolve_llm_with_chain(
        chain=["grok", "gemini", "xai", "ollama"],
        init_fn=fake_init,
    )
    assert llm == "ok:xai"
    assert used == "xai"
    assert calls == ["grok", "gemini", "xai"]
    assert "grok" in errors and "gemini" in errors
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pytest tests/unit/test_llm_provider_chain.py::test_resolver_uses_chain_order -v`  
Expected: FAIL because `resolve_llm_with_chain` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```python
# backend/app/services/llm_provider.py
DEFAULT_CHAIN = ["grok", "gemini", "xai", "ollama"]


def resolve_llm_with_chain(chain=None, temperature=0.7, init_fn=None):
    init = init_fn or get_llm
    ordered = chain or DEFAULT_CHAIN
    errors = {}
    for provider in ordered:
        try:
            llm = init(provider, temperature=temperature)
            return llm, provider, errors
        except Exception as exc:
            errors[provider] = str(exc)
            continue
    raise RuntimeError(f"All providers failed: {errors}")
```

```python
# keep OpenAI/Claude as optional provider entries
PROVIDER_CONFIGS["xai"] = {
    "class_fn": _import_openai,
    "default_model": settings.xai_model,
    "required_key": "xai_api_key",
}
PROVIDER_CONFIGS["grok"] = {
    "class_fn": _import_openai,
    "default_model": settings.grok_model,
    "required_key": "grok_api_key",
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && pytest tests/unit/test_llm_provider_chain.py -v`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/llm_provider.py backend/tests/unit/test_llm_provider_chain.py
git commit -m "feat: add deterministic multi-provider fallback resolver"
```

---

### Task 3: Wire Resolver Into Chat, Agent, and Webhook Paths

**Files:**
- Modify: `backend/app/services/agent_router.py`
- Modify: `backend/app/services/query_handler.py`
- Modify: `backend/app/routes/chat.py`
- Modify: `backend/app/routes/webhook.py`
- Test: `backend/tests/integration/test_llm_fallback_paths.py`

- [ ] **Step 1: Write failing integration tests**

```python
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_chat_path_returns_provider_used(async_client: AsyncClient, monkeypatch):
    monkeypatch.setenv("LLM_FALLBACK_CHAIN", "grok,gemini,xai,ollama")
    res = await async_client.post("/api/chat", json={"message": "hello", "location": "Delhi"})
    assert res.status_code == 200
    assert res.json()["llm_provider"] in {"grok", "gemini", "xai", "ollama"}


@pytest.mark.asyncio
async def test_webhook_general_path_uses_shared_resolver(async_client: AsyncClient):
    res = await async_client.post("/webhook", data={"From": "whatsapp:+911111111111", "Body": "general farming help"})
    assert res.status_code == 200
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && pytest tests/integration/test_llm_fallback_paths.py -v`  
Expected: FAIL on missing `llm_provider` consistency and/or webhook path not using shared resolver.

- [ ] **Step 3: Write minimal implementation**

```python
# backend/app/services/query_handler.py
from app.services.llm_provider import resolve_llm_with_chain

llm, provider_used, provider_errors = resolve_llm_with_chain(temperature=0.7)
response = llm.invoke(prompt)
logger.info("provider_used=%s provider_errors=%s", provider_used, provider_errors)
```

```python
# backend/app/services/agent_router.py
llm, provider_used, provider_errors = resolve_llm_with_chain(temperature=0.7)
state["llm_provider"] = provider_used
```

```python
# backend/app/routes/chat.py
return ChatResponse(
    ...,
    llm_provider=result.get("llm_provider", "ollama"),
)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd backend && pytest tests/integration/test_llm_fallback_paths.py -v`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/agent_router.py backend/app/services/query_handler.py backend/app/routes/chat.py backend/app/routes/webhook.py backend/tests/integration/test_llm_fallback_paths.py
git commit -m "fix: unify fallback resolver across chat and webhook paths"
```

---

### Task 4: Add Provider Diagnostics Endpoint + Frontend Proxy Consistency

**Files:**
- Modify: `backend/app/routes/chat.py`
- Modify: `frontend/app/api/llm/providers/route.ts`
- Modify: `frontend/app/api/chat/route.ts`
- Test: `backend/tests/integration/test_llm_providers_endpoint.py`

- [ ] **Step 1: Write failing backend test**

```python
def test_llm_providers_reports_chain_and_status(client):
    res = client.get("/api/llm/providers")
    body = res.json()
    assert res.status_code == 200
    assert body["fallback_chain"] == ["grok", "gemini", "xai", "ollama"]
    assert "providers" in body
    assert all("is_configured" in p and "is_available" in p for p in body["providers"])
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pytest tests/integration/test_llm_providers_endpoint.py -v`  
Expected: FAIL on missing `fallback_chain` and status fields.

- [ ] **Step 3: Write minimal implementation**

```python
# backend/app/routes/chat.py
from app.services.llm_provider import get_provider_status_report

@router.get("/llm/providers")
async def get_llm_providers():
    return get_provider_status_report()
```

```typescript
// frontend/app/api/chat/route.ts
import { api } from '@/lib/api/client';
const response = await api.post('/api/chat', body, { skipAuth: true });
return NextResponse.json(response.data, { status: response.status });
```

- [ ] **Step 4: Run tests and type check**

Run: `cd backend && pytest tests/integration/test_llm_providers_endpoint.py -v`  
Expected: PASS.  

Run: `cd frontend && npm run lint && npx tsc --noEmit`  
Expected: PASS with no new errors.

- [ ] **Step 5: Commit**

```bash
git add backend/app/routes/chat.py frontend/app/api/llm/providers/route.ts frontend/app/api/chat/route.ts backend/tests/integration/test_llm_providers_endpoint.py
git commit -m "feat: expose provider diagnostics and normalize frontend API proxy"
```

---

### Task 5: Add Provider Verification Script

**Files:**
- Create: `backend/scripts/verify_llm_providers.py`
- Create: `backend/tests/unit/test_verify_llm_providers_script.py`
- Test: `backend/tests/unit/test_verify_llm_providers_script.py`

- [ ] **Step 1: Write failing test**

```python
from scripts.verify_llm_providers import summarize_result


def test_summarize_result_shape():
    result = summarize_result("grok", True, True, None, 123)
    assert result == {
        "provider": "grok",
        "configured": True,
        "init_ok": True,
        "invoke_ok": True,
        "error_reason": None,
        "latency_ms": 123,
    }
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pytest tests/unit/test_verify_llm_providers_script.py -v`  
Expected: FAIL because script/module is missing.

- [ ] **Step 3: Write minimal implementation**

```python
# backend/scripts/verify_llm_providers.py
import json
import time

from app.services.llm_provider import get_provider_status_report, resolve_llm_with_chain


def summarize_result(provider, configured, invoke_ok, error_reason, latency_ms):
    return {
        "provider": provider,
        "configured": configured,
        "init_ok": configured,
        "invoke_ok": invoke_ok,
        "error_reason": error_reason,
        "latency_ms": latency_ms,
    }
```

```python
def main():
    report = get_provider_status_report()
    results = []
    for provider in report["fallback_chain"]:
        configured = provider in report["available_providers"]
        started = time.perf_counter()
        try:
            llm, used, _errors = resolve_llm_with_chain(chain=[provider], temperature=0.0)
            response = llm.invoke("Reply with exactly: OK")
            content = response.content if hasattr(response, "content") else str(response)
            invoke_ok = "OK" in content
            error_reason = None if invoke_ok else "unexpected response payload"
        except Exception as exc:
            invoke_ok = False
            error_reason = str(exc)
        latency_ms = int((time.perf_counter() - started) * 1000)
        results.append(summarize_result(provider, configured, invoke_ok, error_reason, latency_ms))

    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run tests and script smoke-check**

Run: `cd backend && pytest tests/unit/test_verify_llm_providers_script.py -v`  
Expected: PASS.  

Run: `cd backend && python scripts/verify_llm_providers.py`  
Expected: JSON output with one object per provider.

- [ ] **Step 5: Commit**

```bash
git add backend/scripts/verify_llm_providers.py backend/tests/unit/test_verify_llm_providers_script.py
git commit -m "feat: add provider verification script for operational triage"
```

---

### Task 6: Re-enable Webhook Signature Validation Safely

**Files:**
- Modify: `backend/app/routes/webhook.py`
- Modify: `backend/app/config.py`
- Create: `backend/tests/integration/test_webhook_signature_validation.py`
- Test: `backend/tests/integration/test_webhook_signature_validation.py`

- [ ] **Step 1: Write failing test**

```python
import pytest


@pytest.mark.asyncio
async def test_webhook_rejects_invalid_signature(async_client):
    res = await async_client.post(
        "/webhook",
        headers={"X-Twilio-Signature": "invalid"},
        data={"From": "whatsapp:+911111111111", "Body": "hello"},
    )
    assert res.status_code == 403
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pytest tests/integration/test_webhook_signature_validation.py -v`  
Expected: FAIL (currently returns 200 due to disabled validation block).

- [ ] **Step 3: Write minimal implementation**

```python
# backend/app/config.py
self.enable_twilio_signature_validation = (
    os.getenv("ENABLE_TWILIO_SIGNATURE_VALIDATION", "true").lower() == "true"
)
```

```python
# backend/app/routes/webhook.py
if settings.enable_twilio_signature_validation:
    if not validate_twilio_request(request, form_data):
        raise HTTPException(status_code=403, detail="Invalid request signature")
```

- [ ] **Step 4: Run tests**

Run: `cd backend && pytest tests/integration/test_webhook_signature_validation.py -v`  
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/app/routes/webhook.py backend/app/config.py backend/tests/integration/test_webhook_signature_validation.py
git commit -m "fix: enforce Twilio signature validation with env guard"
```

---

### Task 7: Documentation Sync for This Phase

**Files:**
- Modify: `README.md`
- Modify: `backend/README.md`
- Modify: `backend/ARCHITECTURE.md`
- Modify: `frontend/README.md`
- Modify: `frontend/ARCHITECTURE.md`
- Test: `backend/scripts/verify_llm_providers.py` (manual doc-claim verification)

- [ ] **Step 1: Write failing doc-check notes**

```markdown
- Fallback chain in docs must match runtime: grok -> gemini -> xai -> ollama
- Must mention OpenAI/Claude are optional, not primary chain
- Must include backend/.env.example setup command
- Must include provider verification command
```

- [ ] **Step 2: Run verification before edits**

Run: `cd backend && python scripts/verify_llm_providers.py`  
Expected: output reveals currently configured provider availability and supports doc corrections.

- [ ] **Step 3: Update docs with exact runtime contract**

```markdown
Primary fallback chain: `grok -> gemini -> xai -> ollama`
Optional providers: `openai`, `claude`
Verify providers:
`cd backend && python scripts/verify_llm_providers.py`
Setup:
`cp backend/.env.example backend/.env`
```

- [ ] **Step 4: Sanity-check docs for contradictions**

Run: `rg "fallback|grok|gemini|xai|ollama|.env.example" README.md backend/README.md backend/ARCHITECTURE.md frontend/README.md frontend/ARCHITECTURE.md`  
Expected: consistent chain wording and setup instructions.

- [ ] **Step 5: Commit**

```bash
git add README.md backend/README.md backend/ARCHITECTURE.md frontend/README.md frontend/ARCHITECTURE.md
git commit -m "docs: align LLM runtime behavior and setup instructions"
```

---

## Final Verification Gate (Before Merge)

- [ ] Run backend unit tests:
  - `cd backend && pytest tests/unit/test_llm_config_contract.py tests/unit/test_llm_provider_chain.py tests/unit/test_verify_llm_providers_script.py -v`
- [ ] Run backend integration tests:
  - `cd backend && pytest tests/integration/test_llm_fallback_paths.py tests/integration/test_llm_providers_endpoint.py tests/integration/test_webhook_signature_validation.py -v`
- [ ] Run frontend checks:
  - `cd frontend && npm run lint && npx tsc --noEmit`
- [ ] Run provider verification script:
  - `cd backend && python scripts/verify_llm_providers.py`
- [ ] Confirm docs and env sample are aligned:
  - `rg "grok -> gemini -> xai -> ollama|.env.example|verify_llm_providers.py" README.md backend/README.md`

If all checks pass, open PR with test evidence and fallback behavior summary.
