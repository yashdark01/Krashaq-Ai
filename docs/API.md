# API Reference

Base URL (production): `https://krashaq-agritech.vercel.app`  
Base URL (local): `http://localhost:3000`

All routes are same-origin in the Next.js monolith at `src/app/api/`.

**Auth:** Most routes require `Authorization: Bearer <access_token>`.

---

## Chat

### `POST /api/chat`

Non-streaming AI farming assistant.

### `POST /api/chat/stream`

SSE streaming chat with tool events, citations, and tokens.

**Request body (both):**

```json
{
  "message": "Delhi ka mausam kaisa hai?",
  "location": "Delhi",
  "session_id": "optional-uuid",
  "language": "hi",
  "provider": "groq",
  "model": "llama-3.3-70b-versatile"
}
```

---

## Weather

### `GET /api/weather?city=Delhi`

Current weather via WeatherAPI.com (cached).

---

## Auth

| Method | Path                    | Description          |
| ------ | ----------------------- | -------------------- |
| POST   | `/api/auth/signup`      | Register             |
| POST   | `/api/auth/login/email` | Email login          |
| POST   | `/api/auth/refresh`     | Refresh access token |
| GET    | `/api/auth/me`          | Current user         |
| POST   | `/api/auth/logout`      | Logout               |

MFA routes under `/api/auth/mfa/*`.

---

## Farmers

| Method           | Path                | Description           |
| ---------------- | ------------------- | --------------------- |
| GET/POST         | `/api/farmers`      | List / create farmers |
| GET/PATCH/DELETE | `/api/farmers/[id]` | CRUD                  |

Supplier-scoped when logged in as supplier.

---

## Admin

| Method    | Path                        | Description             |
| --------- | --------------------------- | ----------------------- |
| GET       | `/api/admin/dashboard`      | Live stats              |
| GET/POST  | `/api/admin/suppliers`      | Supplier list / onboard |
| GET/PATCH | `/api/admin/suppliers/[id]` | Detail, suspend, renew  |
| GET       | `/api/admin/analytics/llm`  | LangSmith KPIs          |
| GET       | `/api/admin/config`         | Env config status       |
| POST      | `/api/admin/alerts/run`     | Manual alert run        |

---

## Supplier

| Method   | Path                                      | Description         |
| -------- | ----------------------------------------- | ------------------- |
| GET      | `/api/supplier/dashboard`                 | Supplier hub stats  |
| GET/POST | `/api/supplier/alerts`                    | Farmer alerts CRUD  |
| POST     | `/api/supplier/alerts/[id]/run`           | Run single alert    |
| GET      | `/api/supplier/analytics`                 | Farmer usage        |
| GET/POST | `/api/supplier/farmers/[id]/subscription` | Farmer subscription |

---

## Farmer

| Method | Path                        | Description          |
| ------ | --------------------------- | -------------------- |
| GET    | `/api/farmer/subscription`  | Own subscription     |
| GET    | `/api/farmer/notifications` | In-app notifications |

---

## Cron

### `POST /api/cron/alerts`

Hourly alert delivery (Vercel cron). Requires `Authorization: Bearer $CRON_SECRET`.

---

## LLM

### `GET /api/llm/providers`

Lists supported providers, models, and configured status.

---

## Error format

```json
{ "detail": "Error message" }
```

or

```json
{ "error": "Failed to ..." }
```

## Authentication header

```
Authorization: Bearer <access_token>
```
