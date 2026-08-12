# Archived Python backend (legacy)

Moved from `/backend` on **13 Aug 2026**. The Next.js monolith in `frontend/` is the only production runtime.

- **Not deployed** — Vercel uses `frontend/` only
- **Reference only** — WhatsApp webhooks, Pinecone RAG, Python multi-agent code

See [docs/archive/PYTHON-BACKEND-REFERENCE.md](../../docs/archive/PYTHON-BACKEND-REFERENCE.md).

```bash
cd archive/backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```
