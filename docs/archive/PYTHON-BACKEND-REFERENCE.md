# Archived Python backend (removed)

The legacy FastAPI backend was **removed from the repo** in Aug 2026. The Next.js monolith in `src/` is the only runtime.

## Recover old Python code (if needed)

```bash
git checkout legacy/python-backend-v1 -- archive/backend
# or browse the tag on GitHub
```

Tag: **`legacy/python-backend-v1`** — last commit before archive/remove.

## What was in Python (not yet in monolith)

| Feature | Python location | Monolith status |
|---------|-----------------|-----------------|
| WhatsApp webhooks | `conversation/routes_webhook.py` | ❌ Not ported |
| Pinecone RAG | `common/db/pinecone_client.py` | 🟡 MongoDB hybrid RAG in `src/lib/server/rag/` |
| Full multi-agent orchestrator | `conversation/services/orchestrator_agent.py` | 🟡 Partial LangGraph in `src/lib/server/agents/` |
| STT / audio | `conversation/services/stt_service.py` | ❌ Not ported |

Use **`src/`** only for production. See [ARCHITECTURE.md](../ARCHITECTURE.md) and [PHASE.md](../PHASE.md).
