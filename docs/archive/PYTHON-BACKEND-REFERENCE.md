# Python backend reference (archived)

The FastAPI backend now lives at **`archive/backend/`** (formerly `backend/`).

## What was only in Python (not yet in monolith)

| Feature | Python path | Monolith status |
|---------|-------------|-----------------|
| WhatsApp webhooks | `app/conversation/routes_webhook.py` | Not ported |
| Pinecone vector RAG | `app/common/db/pinecone_client.py` | Mongo KB + keyword search in TS |
| Full multi-agent orchestrator | `app/conversation/services/orchestrator_agent.py` | Partial LangGraph in `frontend/lib/server/agents/` |
| Docker observability stack | `docker-compose.yml`, Loki/Promtail | Not used |

## Production path

Use **`frontend/`** only. See [ARCHITECTURE.md](../ARCHITECTURE.md) and [PHASE.md](../PHASE.md).
