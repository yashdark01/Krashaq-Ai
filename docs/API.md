# API Reference

Base URL (production): `https://krashaq-agritech.vercel.app`  
Base URL (local): `http://localhost:3000`

All routes are same-origin in the Next.js monolith unless `LEGACY_PYTHON_URL` is configured.

---

## Chat

### `POST /api/chat`

AI farming assistant with optional weather/irrigation context.

**Request body:**

```json
{
  "message": "Delhi ka mausam kaisa hai?",
  "location": "Delhi",
  "session_id": "optional-uuid",
  "phone": "+919876543210",
  "language": "hi",
  "provider": "groq",
  "model": "llama-3.3-70b-versatile"
}
```

**Response:**

```json
{
  "reply": "...",
  "session_id": "uuid",
  "language": "hi",
  "tools_used": ["fetch_weather"],
  "detected_crop": null,
  "llm_provider": "groq",
  "llm_model": "llama-3.3-70b-versatile",
  "weather": { "city": "Delhi", "temp": 32, "success": true }
}
```

---

## Weather

### `GET /api/weather?city=Delhi`

Returns current weather from WeatherAPI.com (cached ~20 min).

---

## Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register with email/password |
| POST | `/api/auth/login/email` | Email login |
| POST | `/api/auth/register` | Complete Google OAuth registration |
| GET | `/api/auth/me` | Current user (Bearer token) |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Revoke refresh token |

**Login response:**

```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "user": { "id": "...", "email": "...", "role": "farmer" }
}
```

---

## Farmers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/farmers?skip=0&limit=50` | List farmers |
| POST | `/api/farmers` | Create farmer |
| GET | `/api/farmers/{id}` | Get by ID |
| PUT | `/api/farmers/{id}` | Update |
| DELETE | `/api/farmers/{id}` | Delete |
| GET | `/api/farmers/phone/{phone}` | Lookup by phone |

---

## LLM

### `GET /api/llm/providers`

Lists all supported providers, models, and which are configured (have API keys).

---

## Admin / legacy (requires `LEGACY_PYTHON_URL`)

Returns **501** without legacy backend configured:

- `/api/admin/*` — dashboard, users, audit, config, scheduler
- `/api/messages/*` — message history
- `/api/locations/*` — state/district/tehsil hierarchy
- `/api/auth/2fa/*`, verify-email, forgot-password, etc.

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
