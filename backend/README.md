# Krashaq Backend Documentation

## Overview

Krashaq Backend is a FastAPI-based REST API that powers the smart farming assistant platform. It provides AI-powered chat, weather data, irrigation advice, and WhatsApp integration for farmers.

## Technology Stack

- **Framework**: FastAPI
- **Database**: SQLite (with support for PostgreSQL/MySQL)
- **ORM**: SQLAlchemy
- **Authentication**: JWT + Google OAuth 2.0
- **LLM Integration**: Ollama, Google Gemini, OpenAI, Claude, Grok
- **Messaging**: Twilio WhatsApp API
- **Caching**: Redis
- **Weather API**: OpenWeatherMap

## Project Structure

```
backend/
├── app/
│   ├── config/          # Configuration files
│   ├── middleware/      # Custom middleware
│   ├── models.py        # Database models
│   ├── routes/          # API endpoints
│   ├── services/        # Business logic
│   ├── db.py            # Database configuration
│   ├── config.py        # Application settings
│   └── main.py          # Application entry point
├── requirements.txt     # Python dependencies
└── .env.example        # Environment variables template
```

## Core Modules

### 1. Main Application (`main.py`)

**Purpose**: Entry point and application initialization

**Features**:
- FastAPI app initialization with CORS configuration
- Database table creation on startup
- Router registration for all API endpoints
- Health check endpoint

**Endpoints**:
- `GET /` - Root endpoint with API information
- `GET /health` - Health check

**Configuration**:
- CORS enabled for frontend (localhost:3000)
- Auto-creates database tables on startup

---

### 2. Database Models (`models.py`)

**Purpose**: Define database schema

**Models**:

#### Farmer
- Stores farmer information for WhatsApp integration
- Fields: id, name, phone, location, created_at
- Phone number is unique and indexed

#### Message
- Stores chat message history
- Fields: id, farmer_id, phone, session_id, message, response, language, tools_used, llm_provider, created_at
- Supports multi-language (en, hi, hinglish)
- Tracks which LLM provider was used

#### User
- Stores web application users
- Fields: id, email, name, password_hash, google_id, phone, location details, 2FA settings, role, created_at, updated_at, last_login
- Supports both email/password and Google OAuth authentication
- Cascading location hierarchy: state → district → tehsil → locality → pincode
- Role-based access control (admin, farmer, viewer)

#### RefreshToken
- Stores JWT refresh tokens
- Fields: id, user_id, token, expires_at, created_at, revoked
- Supports token revocation for logout

**Remaining Features**:
- Add user preferences model
- Add notification settings model
- Add farm/crop data model

---

### 3. Configuration (`config.py`)

**Purpose**: Centralized configuration management

**Settings**:
- Weather API credentials
- Twilio WhatsApp credentials
- Database connection string
- LLM provider configuration (Ollama, Gemini, OpenAI, Claude, Grok)
- JWT authentication settings
- Google OAuth credentials
- Redis caching configuration

**Environment Variables**:
- `WEATHER_API_KEY` - OpenWeatherMap API key
- `TWILIO_ACCOUNT_SID` - Twilio account SID
- `TWILIO_AUTH_TOKEN` - Twilio auth token
- `TWILIO_WHATSAPP_NUMBER` - Twilio WhatsApp number
- `DATABASE_URL` - Database connection string
- `LLM_PROVIDER` - Default LLM provider (ollama, gemini, openai, claude, grok)
- `OLLAMA_BASE_URL` - Ollama server URL
- `OLLAMA_MODEL` - Default Ollama model
- `GOOGLE_API_KEY` - Google API key for Gemini
- `OPENAI_API_KEY` - OpenAI API key
- `ANTHROPIC_API_KEY` - Anthropic API key for Claude
- `XAI_API_KEY` - X.AI API key for Grok
- `JWT_SECRET_KEY` - JWT signing secret
- `JWT_ALGORITHM` - JWT algorithm (default: HS256)
- `ACCESS_TOKEN_EXPIRE_MINUTES` - Access token lifetime
- `REFRESH_TOKEN_EXPIRE_DAYS` - Refresh token lifetime
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `GOOGLE_REDIRECT_URI` - Google OAuth redirect URI
- `FRONTEND_URL` - Frontend URL for redirects
- `REDIS_URL` - Redis connection string
- `REDIS_CACHE_TTL` - Cache TTL in seconds

---

### 4. Database (`db.py`)

**Purpose**: Database connection and session management

**Features**:
- SQLAlchemy engine configuration
- Session factory for database transactions
- Dependency injection for FastAPI routes
- Support for SQLite and PostgreSQL

**Usage**:
```python
from app.db import get_db

@router.get("/endpoint")
def endpoint(db: Session = Depends(get_db)):
    # Use db for database operations
    pass
```

---

### 5. Routes

#### 5.1 Authentication Routes (`routes/auth.py`)

**Purpose**: User authentication and authorization

**Endpoints**:

- `POST /api/auth/google/login` - Google OAuth login
  - Exchanges authorization code for tokens
  - Returns user info for registration/login

- `POST /api/auth/signup` - Email/password signup
  - Creates new user with email and password
  - Returns access and refresh tokens
  - Supports location hierarchy registration

- `POST /api/auth/register` - Complete registration (for Google OAuth)
  - Completes user registration with location details
  - No password required for OAuth users

- `POST /api/auth/login/email` - Email/password login
  - Authenticates user with email and password
  - Returns access and refresh tokens
  - Updates last login timestamp

- `POST /api/auth/verify-2fa` - Verify 2FA code
  - **Status**: Partially implemented
  - Requires full 2FA implementation

- `POST /api/auth/refresh` - Refresh access token
  - Uses refresh token to get new access token
  - Revokes old refresh token
  - Issues new refresh token

- `POST /api/auth/logout` - Logout
  - Revokes refresh token

- `GET /api/auth/me` - Get current user
  - Returns authenticated user profile

- `PUT /api/auth/me` - Update profile
  - Updates user profile information
  - Supports updating location hierarchy

- `PUT /api/auth/me/password` - Update password
  - Updates user password
  - Requires current password verification

**Features**:
- JWT-based authentication
- Refresh token rotation
- Google OAuth 2.0 integration
- Location hierarchy support
- Password hashing with bcrypt

**Remaining Features**:
- Complete 2FA implementation with TOTP
- Phone verification
- Email verification
- Password reset flow
- Account deletion

---

#### 5.2 Chat Routes (`routes/chat.py`)

**Purpose**: AI-powered chat interface

**Endpoints**:

- `POST /api/chat` - Main chat endpoint
  - Processes user messages with AI
  - Uses LangChain memory for conversation context
  - Supports multiple LLM providers
  - Returns AI response with metadata
  - Tracks tools used and language

- `GET /api/weather` - Get weather data
  - Fetches weather for a location
  - Supports location hierarchy (locality > tehsil > district > state > city)
  - Returns formatted weather data

- `GET /api/messages` - Get chat history
  - Retrieves message history by phone or session_id
  - Returns last 100 messages

- `GET /api/llm/providers` - Get available LLM providers
  - Lists all configured LLM providers
  - Shows availability status
  - Indicates current provider

- `GET /api/llm/sessions/stats` - Get session statistics
  - Returns statistics about chat sessions

- `DELETE /api/llm/sessions/{session_id}` - Clear session
  - Clears chat history for a session

- `POST /api/llm/sessions/cleanup` - Cleanup old sessions
  - Removes messages older than specified days
  - Default: 30 days

**Features**:
- Multi-provider LLM support (Ollama, Gemini, OpenAI, Claude, Grok)
- LangChain memory integration
- Session-based conversations
- Multi-language support (English, Hindi, Hinglish)
- Tool invocation tracking
- Weather data integration
- Irrigation advice integration

**Remaining Features**:
- Streaming responses
- File/image upload support
- Voice message support
- Export chat history
- Conversation analytics

---

#### 5.3 Webhook Routes (`routes/webhook.py`)

**Purpose**: WhatsApp integration via Twilio

**Endpoints**:

- `POST /webhook` - WhatsApp webhook
  - Receives incoming WhatsApp messages
  - Processes keywords (weather, irrigation, help)
  - Returns AI-generated responses
  - Saves messages to database
  - Supports farmer location lookup

- `POST /send-whatsapp` - Send WhatsApp message
  - Sends proactive messages to farmers
  - Supports bulk messaging
  - Returns message status

**Features**:
- Twilio webhook validation
- Keyword-based responses
- Farmer registration
- Message logging
- Location-based responses

**Keywords Supported**:
- "weather", "mausam", "temperature", "temp" - Weather information
- "irrigate", "water", "paani", "seinch", "watering" - Irrigation advice
- "help", "madad", "sahayata" - Help message

**Remaining Features**:
- Full AI integration (currently keyword-based)
- Image recognition
- Voice message support
- Scheduled messages
- Message templates
- Analytics dashboard

---

#### 5.4 Location Routes (`routes/locations.py`)

**Purpose**: Location hierarchy data management

**Endpoints**:

- `GET /api/locations/states` - Get all states
  - Returns list of all Indian states

- `GET /api/locations/districts` - Get districts by state
  - Returns districts for a given state
  - Includes district metadata (code, headquarters, tehsil count)

- `GET /api/locations/tehsils` - Get tehsils by district
  - Returns tehsils for a given district
  - Includes tehsil metadata (headquarters, pincode, locality count)

- `GET /api/locations/localities` - Get localities by tehsil
  - Returns localities for a given tehsil
  - Includes locality type and pincode

**Features**:
- Cascading location hierarchy
- Comprehensive Indian location data
- Metadata support (headquarters, pincodes)
- Type-based locality classification

**Data Source**: `config/locations.json`

---

#### 5.5 User Routes (`routes/user.py`)

**Purpose**: User and farmer management

**Endpoints**:

- `GET /api/farmers` - Get all farmers
  - Returns list of registered farmers

- `POST /api/farmers` - Create farmer
  - Registers new farmer

- `GET /api/farmers/{id}` - Get farmer by ID
  - Returns farmer details

- `PUT /api/farmers/{id}` - Update farmer
  - Updates farmer information

- `DELETE /api/farmers/{id}` - Delete farmer
  - Removes farmer from database

**Features**:
- CRUD operations for farmers
- Phone-based lookup
- Location-based filtering

**Remaining Features**:
- Farmer analytics
- Crop tracking
- Farm size data
- Historical data

---

### 6. Services

#### 6.1 Authentication Services (`services/auth/`)

**JWT Service (`jwt_service.py`)**
- Creates access tokens
- Creates refresh tokens
- Verifies tokens
- Token payload management

**Google OAuth Service (`google_oauth.py`)**
- Exchanges authorization code for tokens
- Fetches user info from Google
- Token management

**Two-Factor Auth Service (`two_factor.py`)**
- **Status**: Partially implemented
- TOTP secret generation
- Code verification
- QR code generation

**Remaining Features**:
- Complete 2FA implementation
- Email verification service
- Phone verification service
- Password reset service

---

#### 6.2 Cache Service (`services/cache/redis_service.py`)

**Purpose**: Redis-based caching

**Features**:
- Get/set cache operations
- Cache expiration (TTL)
- Cache invalidation
- Session caching

**Usage**:
- Caching LLM responses
- Caching weather data
- Session management

**Remaining Features**:
- Cache warming
- Cache statistics
- Distributed caching

---

#### 6.3 LLM Services

**LLM Provider (`services/llm_provider.py`)**
- Multi-provider support (Ollama, Gemini, OpenAI, Claude, Grok)
- Provider configuration
- Provider availability checking
- Model selection

**LLM Agent (`services/llm_agent.py`)**
- Main AI agent orchestration
- Message processing
- Tool invocation
- Response generation

**Agent Router (`services/agent_router.py`)**
- Routes queries to appropriate tools
- Intent detection
- Tool selection
- Response aggregation

**Memory Service (`services/memory.py`)**
- Session-based memory
- Conversation history
- Memory cleanup
- Session statistics

**LangChain Memory (`services/langchain_memory.py`)**
- LangChain integration
- Conversation buffer memory
- Database persistence
- Context retrieval

**Prompts Service (`services/prompts.py`)**
- System prompts
- Tool-specific prompts
- Language-specific prompts
- Prompt templates

**Remaining Features**:
- Custom model fine-tuning
- RAG implementation
- Vector database integration
- Advanced memory management

---

#### 6.4 Domain Services

**Weather Service (`services/weather.py`)**
- Fetches weather data from OpenWeatherMap
- Formats weather for farmers
- Location-based queries
- Weather forecasting

**Irrigation Service (`services/irrigation.py`)**
- Provides irrigation advice based on weather
- Water requirement calculations
- Crop-specific recommendations
- Seasonal guidance

**Fertilizer Service (`services/fertilizer.py`)**
- Fertilizer recommendations
- Soil analysis integration
- Crop-specific advice
- Nutrient management

**Remaining Features**:
- Pest detection service
- Disease diagnosis service
- Market price service
- Crop yield prediction

---

### 7. Middleware

#### Auth Middleware (`middleware/auth.py`)

**Purpose**: Authentication and authorization

**Features**:
- JWT token verification
- User extraction from token
- Protected route decoration
- Role-based access control

**Usage**:
```python
from app.middleware.auth import get_current_user

@router.get("/protected")
def protected_route(current_user: User = Depends(get_current_user)):
    return {"user": current_user}
```

**Remaining Features**:
- Rate limiting
- Request logging
- Error handling middleware

---

### 8. Configuration Data

#### Locations (`config/locations.json`)

**Purpose**: Indian location hierarchy data

**Structure**:
- States
  - Districts
    - Tehsils
      - Localities (with type and pincode)

**Coverage**: Comprehensive Indian administrative divisions

---

## API Documentation

### Base URL
- Development: `http://localhost:8000`
- Production: (configured via environment)

### Authentication
Most endpoints require JWT authentication. Include the access token in the Authorization header:
```
Authorization: Bearer <access_token>
```

### Endpoints Summary

#### Authentication
- `POST /api/auth/google/login` - Google OAuth login
- `POST /api/auth/signup` - Email signup
- `POST /api/auth/register` - Complete registration
- `POST /api/auth/login/email` - Email login
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/me` - Update profile
- `PUT /api/auth/me/password` - Update password

#### Chat
- `POST /api/chat` - Send message
- `GET /api/weather` - Get weather
- `GET /api/messages` - Get message history
- `GET /api/llm/providers` - Get LLM providers
- `GET /api/llm/sessions/stats` - Session statistics
- `DELETE /api/llm/sessions/{id}` - Clear session
- `POST /api/llm/sessions/cleanup` - Cleanup sessions

#### Locations
- `GET /api/locations/states` - Get states
- `GET /api/locations/districts` - Get districts
- `GET /api/locations/tehsils` - Get tehsils
- `GET /api/locations/localities` - Get localities

#### Farmers
- `GET /api/farmers` - Get farmers
- `POST /api/farmers` - Create farmer
- `GET /api/farmers/{id}` - Get farmer
- `PUT /api/farmers/{id}` - Update farmer
- `DELETE /api/farmers/{id}` - Delete farmer

#### WhatsApp
- `POST /webhook` - WhatsApp webhook
- `POST /send-whatsapp` - Send message

---

## Development Guide

### Setup

1. Create virtual environment:
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment:
```bash
cp .env.example .env
# Edit .env with your credentials
```

4. Run the server:
```bash
uvicorn app.main:app --reload
```

### Adding New Endpoints

1. Create a new route file in `app/routes/`
2. Define your router and endpoints
3. Register the router in `main.py`

### Adding New Services

1. Create a new service file in `app/services/`
2. Implement business logic
4. Import and use in routes

### Database Migrations

Currently using SQLAlchemy with auto-create. For production, consider using Alembic for migrations.

---

## Testing

### Running Tests
```bash
pytest app/
```

### Test Coverage
- Unit tests for services
- Integration tests for routes
- End-to-end tests for workflows

---

## Deployment

### Environment Variables
Ensure all required environment variables are set in production.

### Database
Consider using PostgreSQL for production instead of SQLite.

### Security
- Use strong JWT secrets
- Enable HTTPS
- Configure CORS properly
- Enable rate limiting
- Use environment-specific secrets

---

## Future Enhancements

### Short Term
- Complete 2FA implementation
- Add email verification
- Implement password reset
- Add rate limiting
- Improve error handling

### Medium Term
- Add file upload support
- Implement streaming responses
- Add voice message support
- Create admin dashboard
- Add analytics and reporting

### Long Term
- Implement RAG with vector database
- Add custom model fine-tuning
- Create mobile app APIs
- Add multi-tenant support
- Implement advanced analytics

---

## Support

For issues and questions, please refer to the main project README or contact the development team.
