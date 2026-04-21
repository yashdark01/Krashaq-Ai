# Krashaq Backend Documentation

## Overview

Krashaq Backend is a FastAPI-based REST API that powers the smart farming assistant platform. It provides AI-powered chat, weather data, irrigation advice, and WhatsApp integration for farmers.

## Technology Stack

- **Framework**: FastAPI
- **Database**: MongoDB (with PyMongo)
- **ORM**: PyMongo (direct MongoDB access)
- **Authentication**: JWT + Google OAuth 2.0
- **LLM Integration**: Ollama (primary), Google Gemini (fallback), OpenAI, Claude, Grok
- **Messaging**: Twilio WhatsApp API
- **Speech-to-Text**: faster-whisper (local STT)
- **Audio Processing**: ffmpeg (format conversion)
- **Caching**: Redis
- **Weather API**: WeatherAPI.com
- **Scheduler**: APScheduler for background jobs

## Project Structure

```
backend/
├── app/
│   ├── config/          # Configuration files
│   ├── db/              # Database connection and models
│   ├── middleware/      # Custom middleware
│   ├── routes/          # API endpoints
│   ├── schemas/         # Pydantic schemas
│   ├── services/        # Business logic
│   │   ├── base_agent.py         # Base agent class for multi-agent system
│   │   ├── agent_config.py       # Agent configuration management
│   │   ├── orchestrator_agent.py # Orchestrator for multi-agent coordination
│   │   ├── weather_agent.py      # Weather specialist agent
│   │   ├── crop_agent.py         # Crop specialist agent
│   │   ├── irrigation_agent.py   # Irrigation specialist agent
│   │   ├── fertilizer_agent.py   # Fertilizer specialist agent
│   │   ├── synthesis_agent.py    # Response synthesis agent
│   │   └── agent_router.py       # Multi-agent routing logic
│   ├── config.py        # Application settings
│   ├── db.py            # Legacy database (deprecated)
│   ├── main.py          # Application entry point
│   └── scheduler.py     # Background job scheduler
├── scripts/            # Utility scripts
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

### 2. Database Models (`db/`)

**Purpose**: MongoDB database schemas and connection management

**Collections**:

#### Users
- Stores web application users and farmers
- Fields: _id, email, name, password_hash, google_id, phone, location (state, district, tehsil, locality, pincode), 2FA settings, role, language, created_at, updated_at, last_login
- Supports both email/password and Google OAuth authentication
- Cascading location hierarchy: state → district → tehsil → locality → pincode
- Role-based access control (admin, farmer, viewer)
- Language preference (hi, en, etc.)

#### Messages
- Stores chat message history from WhatsApp and web
- Fields: _id, farmer_id, phone, message, response, language, created_at
- Supports multi-language (en, hi, hinglish)
- Tracks farmer association

#### RefreshTokens
- Stores JWT refresh tokens
- Fields: _id, user_id, token, expires_at, created_at, revoked
- Supports token revocation for logout

#### AuditLog
- Stores system audit logs
- Fields: _id, user_id, action, entity_type, entity_id, changes, timestamp
- Tracks all CRUD operations for security and compliance

**Database Connection**:
- MongoDB connection via PyMongo
- Connection pooling
- Automatic reconnection
- Database: krashaq

---

### 3. Configuration (`config.py`)

**Purpose**: Centralized configuration management

**Settings**:
- Weather API credentials (WeatherAPI.com)
- Twilio WhatsApp credentials
- MongoDB connection string
- LLM provider configuration (Ollama, Gemini, OpenAI, Claude, Grok)
- JWT authentication settings
- Google OAuth credentials
- Redis caching configuration

**Environment Variables**:
- `WEATHER_API_KEY` - WeatherAPI.com API key
- `TWILIO_ACCOUNT_SID` - Twilio account SID
- `TWILIO_AUTH_TOKEN` - Twilio auth token
- `TWILIO_WHATSAPP_NUMBER` - Twilio WhatsApp number
- `MONGODB_URL` - MongoDB connection string
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
- Export chat history
- Conversation analytics

---

#### 5.3 Webhook Routes (`routes/webhook.py`)

**Purpose**: WhatsApp two-way communication via Twilio

**Endpoints**:

- `POST /webhook` - WhatsApp webhook
  - Receives incoming WhatsApp messages (text and voice) from farmers
  - Uses query handler for intent detection and routing
  - AI-powered responses via LLM (Ollama with Gemini fallback)
  - Voice message transcription using faster-whisper
  - Audio format conversion using ffmpeg
  - Saves messages to database with message type (text/audio)
  - Supports farmer location lookup
  - Language-aware responses (Hindi/English based on user preference)

- `POST /send-whatsapp` - Send WhatsApp message
  - Sends proactive messages to farmers
  - Supports bulk messaging
  - Returns message status

**Features**:
- Intent detection (irrigation, weather, general queries)
- AI-powered general responses using LLM
- Voice message support with STT transcription
- Audio download with Twilio authentication
- Audio format conversion (mono 16kHz WAV)
- Duration check (max 30 seconds)
- Location context for accurate weather responses
- Language-aware responses (Hindi Devanagari script, English, Hinglish)
- Farmer registration and lookup
- Message logging with transcribed text
- Location-based responses
- Single message delivery (no duplicates)

**Intents Supported**:
- **Irrigation**: "paani", "sinchai", "water", "irrigation" - Irrigation advice
- **Weather**: "mausam", "weather", "barish", "rain" - Weather information
- **General**: Any other query - AI-powered response with location context

**Audio Processing Flow**:
1. Detect audio via NumMedia and MediaContentType0
2. Download audio from Twilio MediaUrl with authentication
3. Convert to mono 16kHz WAV using ffmpeg
4. Check duration (max 30 seconds)
5. Transcribe using faster-whisper (Hindi language)
6. Pass transcribed text to query handler
7. Send response via WhatsApp
8. Auto-cleanup temp files

**LLM Integration**:
- Primary: Ollama (local LLM)
- Fallback: Gemini (if Ollama unavailable)
- Language-specific prompts
- Location context injection

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

#### 5.6 Admin Routes (`routes/admin.py`)

**Purpose**: Administrative operations (admin-only)

**Endpoints**:

- `GET /api/admin/users` - List all users
- `DELETE /api/admin/users/{id}` - Delete user
- `GET /api/admin/audit-logs` - Get audit logs
- `POST /api/admin/config` - Update system configuration
- `POST /api/admin/jobs/{job_id}/pause` - Pause scheduled job
- `POST /api/admin/jobs/{job_id}/resume` - Resume scheduled job

**Features**:
- Role-based access control (admin only)
- Audit logging
- System configuration management
- Job control

---

#### 5.7 Scheduler (`scheduler.py`)

**Purpose**: Background job scheduling

**Features**:
- APScheduler integration
- Daily irrigation alerts
- Configurable job intervals
- Job lifecycle management (start, pause, resume, shutdown)

**Jobs**:
- `daily_irrigation_alerts` - Sends irrigation advice to farmers every 6 hours

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
- Multi-agent system integration (default routing to orchestrator)

**Agent Router (`services/agent_router.py`)**
- Routes queries to appropriate tools or agents
- Intent detection
- Tool selection
- Response aggregation
- Multi-agent vs single-agent routing
- Agent-specific metrics tracking

---

#### 6.4 Multi-Agent System

**Overview**
The multi-agent system enables specialized domain expertise through dedicated agents for weather, crop, irrigation, and fertilizer queries. An orchestrator agent coordinates the system by detecting intents and routing queries to appropriate specialists.

**Architecture Components**

**Base Agent (`services/base_agent.py`)**
- Abstract base class for all specialist agents
- Common LLM access methods
- Redis caching with configurable TTL
- Prompt generation utilities
- Response formatting
- Error handling and retry logic

**Agent Configuration (`services/agent_config.py`)**
- Centralized configuration for all agents
- Per-agent settings: model, temperature, max_tokens, reflection
- Tool configuration per agent
- Cache TTL configuration (e.g., weather: 300s, crop: 1800s)
- Agent enable/disable flags
- Dynamic configuration updates

**Orchestrator Agent (`services/orchestrator_agent.py`)**
- Multi-label intent classification using LLM with JSON output
- Fallback keyword-based classification for robustness
- Parallel or sequential invocation of specialist agents
- Coordinates multiple specialist responses
- Integrates with synthesis agent for response aggregation
- Metrics tracking for specialist invocations and synthesis operations

**Specialist Agents**

**Weather Agent (`services/weather_agent.py`)**
- Handles weather-related queries
- Integrates with WeatherAPI.com
- Caches weather data (300s TTL)
- Provides location-specific weather information
- Supports multi-language responses

**Crop Agent (`services/crop_agent.py`)**
- Handles crop-related queries
- Crop selection and variety recommendations
- Planting season guidance
- Crop-specific advice
- Caches crop data (1800s TTL)

**Irrigation Agent (`services/irrigation_agent.py`)**
- Handles irrigation-related queries
- Water requirement calculations
- Irrigation scheduling advice
- Soil moisture analysis
- Integrates with weather data for context
- Caches irrigation data (600s TTL)

**Fertilizer Agent (`services/fertilizer_agent.py`)**
- Handles fertilizer-related queries
- Nutrient management recommendations
- Fertilizer type selection
- Application timing guidance
- Soil analysis integration
- Caches fertilizer data (1800s TTL)

**Synthesis Agent (`services/synthesis_agent.py`)**
- Aggregates multiple specialist responses
- Generates cohesive, unified responses
- Handles conflicting information from specialists
- Maintains conversation context
- Uses LLM for intelligent synthesis

**Agent Router Integration**
The agent router (`services/agent_router.py`) provides:
- `process_with_multi_agent()` - Routes to orchestrator for multi-agent processing
- `process_with_single_agent()` - Fallback to single-agent system
- Automatic routing based on query complexity and enabled agents
- Graceful fallback if multi-agent system fails

**Metrics Tracking**
The metrics service (`services/metrics.py`) tracks:
- Multi-agent vs single-agent usage
- Specialist agent invocation counts
- Synthesis operation counts
- Per-agent performance metrics
- Error rates per agent

**Configuration**
Enable/disable agents in `agent_config.py`:
```python
get_agent_config("weather").get("enabled", True)
get_agent_config("crop").get("enabled", True)
get_agent_config("irrigation").get("enabled", True)
get_agent_config("fertilizer").get("enabled", True)
```

**Fallback Mechanism**
If the multi-agent system fails or no agents are enabled, the system automatically falls back to the single-agent LLM system for robustness.

**Performance Optimizations**
- Redis caching with agent-specific TTLs
- Parallel agent invocation where applicable
- Lazy loading of agent configurations
- Connection pooling for external APIs

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

**Query Handler Service (`services/query_handler.py`)**
- Intent detection for WhatsApp messages (irrigation, weather, general)
- Routes queries to appropriate response handlers
- AI-powered general responses using LLM
- Location context injection for accurate responses
- Language-aware response generation

**WhatsApp Sender Service (`services/whatsapp_sender.py`)**
- Sends WhatsApp messages via Twilio API
- Phone number formatting
- Error handling and logging
- Message status tracking

**Audio Utils Service (`services/audio_utils.py`)**
- Downloads audio from Twilio Media URLs with authentication
- Converts audio to mono 16kHz WAV format using ffmpeg
- Checks audio duration (max 30 seconds)
- Automatic temp file cleanup

**STT Service (`services/stt.py`)**
- Transcribes audio using faster-whisper (local STT)
- Hindi language support
- Combines transcription segments into text
- Global model loading for efficiency (base model, int8 compute type)

**Irrigation Decision Service (`services/irrigation_decision.py`)**
- Rule-based irrigation decision logic
- Weather-based irrigation recommendations
- Soil moisture consideration
- Decision reasoning generation

**Weather Service (`services/weather.py`)**
- Fetches weather data from OpenWeatherMap
- Formats weather for farmers
- Location-based queries
- Weather forecasting
- Redis caching for performance

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
