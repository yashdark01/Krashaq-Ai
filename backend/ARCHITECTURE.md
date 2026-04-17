# Krashaq Backend Architecture Documentation

## System Architecture Overview

Krashaq Backend follows a layered architecture pattern with clear separation of concerns. The system is built on FastAPI and follows RESTful API principles.

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer                             │
│         (Web App, WhatsApp, Mobile App)                      │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP/HTTPS
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                  API Gateway Layer                           │
│                   (FastAPI Application)                       │
│  - CORS Middleware                                          │
│  - Request Validation                                       │
│  - Error Handling                                           │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
┌───────▼──────┐ ┌───▼────┐ ┌──────▼──────┐
│  Routes      │ │ Routes │ │   Routes    │
│  - Auth      │ │ - Chat │ │ - Webhook   │
│  - User      │ │ - Loc  │ │ - etc.      │
└───────┬──────┘ └───┬────┘ └──────┬──────┘
        │            │             │
        └────────────┼─────────────┘
                     │
┌────────────────────▼───────────────────────────────────────┐
│                  Service Layer                              │
│  - Business Logic                                           │
│  - LLM Integration                                          │
│  - External API Calls                                        │
│  - Data Processing                                          │
└────────────────────┬───────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
┌───────▼──────┐ ┌──▼────┐ ┌─────▼──────┐
│  Services    │ │Cache  │ │  External  │
│  - Auth      │ │- Redis│ │  APIs      │
│  - LLM       │ │       │ │- Weather   │
│  - Weather   │ │       │ │- Twilio    │
│  - etc.      │ │       │ │- Google    │
└───────┬──────┘ └───────┘ └─────┬──────┘
        │                       │
        └───────────┬───────────┘
                    │
┌───────────────────▼───────────────────────────────────────┐
│                  Data Access Layer                         │
│  - ORM (SQLAlchemy)                                       │
│  - Database Sessions                                       │
│  - Query Building                                          │
└───────────────────┬───────────────────────────────────────┘
                    │
┌───────────────────▼───────────────────────────────────────┐
│                  Data Layer                                │
│  - SQLite (Dev) / PostgreSQL (Prod)                       │
│  - Redis (Cache)                                           │
└─────────────────────────────────────────────────────────────┘
```

## Architectural Patterns

### 1. Layered Architecture

The backend follows a strict layered architecture:

**Presentation Layer (Routes)**
- Handles HTTP requests/responses
- Request validation
- Response formatting
- Error handling

**Business Logic Layer (Services)**
- Contains core business logic
- Orchestrates data flow
- Integrates with external services
- No direct database access

**Data Access Layer (Models/DB)**
- Database operations
- ORM mapping
- Query execution
- Transaction management

### 2. Dependency Injection

FastAPI's dependency injection is used throughout:

```python
# Database session injection
def endpoint(db: Session = Depends(get_db)):
    pass

# Authentication injection
def protected_route(current_user: User = Depends(get_current_user)):
    pass

# Configuration injection
settings = get_settings()
```

### 3. Repository Pattern (Partial)

Database operations are abstracted through SQLAlchemy ORM:
- Models define schema
- Sessions manage connections
- Queries built through ORM

### 4. Service Pattern

Business logic is encapsulated in service classes:
- `LLMAgent` - AI processing
- `WeatherService` - Weather data
- `AuthService` - Authentication
- Each service is self-contained

### 5. Strategy Pattern

Multiple LLM providers supported through strategy pattern:
- `LLMProvider` - Abstract interface
- Concrete implementations for each provider
- Runtime provider selection

## Component Architecture

### 1. Application Entry Point (`main.py`)

**Responsibilities**:
- Initialize FastAPI application
- Configure middleware
- Register routers
- Create database tables
- Health check endpoint

**Dependencies**:
- Database engine
- All route modules
- Configuration

### 2. Configuration Module (`config.py`)

**Pattern**: Singleton with caching

**Responsibilities**:
- Load environment variables
- Provide type-safe configuration
- Cache configuration values
- Centralized settings management

**Design Decisions**:
- Uses `lru_cache` for singleton pattern
- Environment-based configuration
- Default values for development

### 3. Database Module (`db.py`)

**Pattern**: Factory pattern for sessions

**Responsibilities**:
- Create database engine
- Manage session lifecycle
- Provide dependency injection
- Handle connection pooling

**Design Decisions**:
- SQLite for development, PostgreSQL for production
- Autocommit disabled for transaction control
- Session per request pattern

### 4. Models Module (`models.py`)

**Pattern**: Active Record (via SQLAlchemy)

**Responsibilities**:
- Define database schema
- Map tables to Python classes
- Define relationships
- Provide ORM interface

**Models**:
- `Farmer` - WhatsApp users
- `Message` - Chat history
- `User` - Web application users
- `RefreshToken` - JWT refresh tokens

### 5. Routes Module

**Pattern**: Router pattern

**Responsibilities**:
- Define API endpoints
- Handle HTTP methods
- Validate requests
- Return responses
- Error handling

**Route Categories**:
- Authentication (`/api/auth/*`)
- Chat (`/api/chat`, `/api/weather`)
- User management (`/api/farmers`)
- Locations (`/api/locations/*`)
- WhatsApp (`/webhook`)

### 6. Services Module

**Pattern**: Service layer pattern

**Responsibilities**:
- Business logic implementation
- External API integration
- Data processing
- Orchestration

**Service Categories**:

**Authentication Services**:
- `jwt_service.py` - Token management
- `google_oauth.py` - OAuth integration
- `two_factor.py` - 2FA logic

**LLM Services**:
- `llm_provider.py` - Provider abstraction
- `llm_agent.py` - AI orchestration
- `agent_router.py` - Tool routing
- `langchain_memory.py` - Conversation memory
- `memory.py` - Session management
- `prompts.py` - Prompt templates

**Domain Services**:
- `weather.py` - Weather data
- `irrigation.py` - Irrigation advice
- `fertilizer.py` - Fertilizer recommendations

**Infrastructure Services**:
- `cache/redis_service.py` - Caching

### 7. Middleware Module

**Pattern**: Middleware chain

**Responsibilities**:
- Request interception
- Authentication
- Authorization
- Logging (future)

**Current Middleware**:
- CORS (built-in FastAPI)
- Auth middleware (custom)

## Data Flow Architecture

### Authentication Flow

```
Client Request
    │
    ▼
Auth Middleware
    │
    ├─ Validate JWT Token
    │   ├─ Extract token from header
    │   ├─ Verify signature
    │   ├─ Check expiration
    │   └─ Extract user info
    │
    ├─ Load User from DB
    │   └─ Query User model
    │
    └─ Inject User into Route
        │
        ▼
Route Handler
```

### Chat Request Flow

```
Client POST /api/chat
    │
    ▼
Chat Route Handler
    │
    ├─ Validate Request
    │   └─ Pydantic model validation
    │
    ├─ Load Session History
    │   └─ LangChain Memory Service
    │       └─ Query Message model
    │
    ├─ Add User Message to Memory
    │   └─ LangChain Memory Service
    │
    ├─ Initialize LLM Agent
    │   └─ LLMAgent Service
    │
    ├─ Process Message
    │   ├─ Agent Router
    │   │   ├─ Detect Intent
    │   │   ├─ Select Tools
    │   │   └─ Execute Tools
    │   │       ├─ Weather Service
    │   │       ├─ Irrigation Service
    │   │       └─ Other Services
    │   │
    │   ├─ LLM Provider
    │   │   ├─ Select Provider
    │   │   ├─ Call LLM API
    │   │   └─ Process Response
    │   │
    │   └─ Format Response
    │
    ├─ Add Response to Memory
    │   └─ LangChain Memory Service
    │
    ├─ Save to Database
    │   └─ Message model
    │
    └─ Return Response
        │
        ▼
Client
```

### WhatsApp Webhook Flow

```
Twilio Webhook POST /webhook
    │
    ▼
Webhook Route Handler
    │
    ├─ Validate Request (optional)
    │   └─ Twilio signature validation
    │
    ├─ Extract Message Data
    │   ├─ Phone number
    │   ├─ Message body
    │   └─ Metadata
    │
    ├─ Get/Create Farmer
    │   └─ Query Farmer model
    │
    ├─ Process Message
    │   ├─ Keyword detection
    │   ├─ Service calls
    │   │   ├─ Weather Service
    │   │   └─ Irrigation Service
    │   └─ Generate Response
    │
    ├─ Save to Database
    │   └─ Message model
    │
    ├─ Create Twilio Response
    │   └─ TwiML generation
    │
    └─ Return XML Response
        │
        ▼
Twilio
```

## Security Architecture

### Authentication

**JWT-Based Authentication**:
- Access tokens (short-lived: 30 minutes)
- Refresh tokens (long-lived: 7 days)
- Token rotation on refresh
- Revocation support

**OAuth 2.0 Integration**:
- Google OAuth flow
- Authorization code exchange
- Token management
- User profile retrieval

**2FA (Partial)**:
- TOTP-based (planned)
- SMS-based (planned)
- Backup codes (planned)

### Authorization

**Role-Based Access Control**:
- Roles: admin, farmer, viewer
- Route-level protection
- Middleware-based enforcement

### Security Measures

**Current**:
- Password hashing with bcrypt
- JWT token validation
- CORS configuration
- SQL injection prevention (ORM)

**Planned**:
- Rate limiting
- Request signing
- CSRF protection
- Security headers
- Input sanitization

## Scalability Architecture

### Current State

**Database**:
- SQLite for development
- Single instance
- No replication

**Caching**:
- Redis integration (partial)
- Response caching (planned)

**LLM**:
- Single provider at a time
- No load balancing
- No fallback mechanism

### Scalability Considerations

**Database**:
- Migrate to PostgreSQL
- Connection pooling
- Read replicas
- Database indexing

**Caching**:
- Redis cluster
- Cache warming
- Cache invalidation strategy
- Distributed caching

**LLM**:
- Provider fallback
- Load balancing
- Request queuing
- Response caching

**API**:
- Horizontal scaling
- Load balancer
- API gateway
- Rate limiting

## Integration Architecture

### External Integrations

**Weather API (OpenWeatherMap)**:
- REST API
- API key authentication
- Location-based queries
- Caching support

**Twilio WhatsApp**:
- Webhook-based
- Signature validation
- Two-way messaging
- Template messages (planned)

**Google OAuth**:
- OAuth 2.0 flow
- JWT tokens
- User profile API
- Token refresh

**LLM Providers**:
- REST APIs
- API key authentication
- Streaming support (planned)
- Fallback support

### Internal Integrations

**Frontend Integration**:
- REST API
- JWT authentication
- CORS enabled
- JSON responses

**WhatsApp Integration**:
- Webhook endpoint
- Message processing
- Response generation
- Database logging

## Error Handling Architecture

### Error Types

**HTTP Exceptions**:
- 400 - Bad Request
- 401 - Unauthorized
- 403 - Forbidden
- 404 - Not Found
- 500 - Internal Server Error

### Error Handling Strategy

**Route Level**:
- Try-catch blocks
- Validation errors
- Business logic errors

**Service Level**:
- Graceful degradation
- Fallback responses
- Error logging

**Global Level**:
- Exception handlers (planned)
- Error logging
- User-friendly messages

## Logging Architecture

### Current State
- Console logging
- Basic error messages
- No structured logging

### Planned Improvements
- Structured logging
- Log levels (DEBUG, INFO, WARNING, ERROR)
- Log aggregation
- Request tracing
- Performance logging

## Testing Architecture

### Test Types

**Unit Tests**:
- Service layer testing
- Utility function testing
- Model validation testing

**Integration Tests**:
- Route testing
- Database operations
- External API mocking

**End-to-End Tests**:
- Complete workflows
- Authentication flows
- Chat interactions

### Testing Tools
- pytest
- pytest-asyncio
- httpx (for testing FastAPI)
- factory_boy (for test data)

## Deployment Architecture

### Development Environment
- SQLite database
- Local file storage
- Debug mode enabled
- Hot reload

### Production Environment (Planned)
- PostgreSQL database
- Redis cache
- Cloud deployment (AWS/GCP)
- Load balancer
- CDN for static assets
- Monitoring and alerting

### Deployment Strategy
- Containerization (Docker)
- CI/CD pipeline
- Blue-green deployment
- Database migrations
- Configuration management

## Performance Architecture

### Current Optimizations
- Connection pooling (SQLAlchemy)
- Lazy loading
- Async support (partial)

### Planned Optimizations
- Response caching
- Database query optimization
- Indexing strategy
- Async I/O throughout
- Compression

## Monitoring Architecture

### Current State
- Basic health check endpoint
- Console logs

### Planned Monitoring
- Application metrics
- Performance monitoring
- Error tracking
- Uptime monitoring
- Log aggregation
- Alerting

## Technology Rationale

### FastAPI
- Modern Python framework
- Automatic API documentation
- Type hints support
- Async support
- High performance

### SQLAlchemy
- Mature ORM
- Database agnostic
- Relationship management
- Migration support

### SQLite (Dev)
- Zero configuration
- File-based
- Fast for development
- Easy to test

### PostgreSQL (Prod)
- Robust and reliable
- Advanced features
- Better performance
- Scalability

### Redis
- Fast in-memory cache
- Session storage
- Response caching
- Pub/Sub support

### LangChain
- LLM orchestration
- Memory management
- Tool integration
- Prompt management

## Future Architectural Improvements

### Short Term
- Complete 2FA implementation
- Add comprehensive error handling
- Implement structured logging
- Add rate limiting
- Improve caching strategy

### Medium Term
- Migrate to PostgreSQL
- Implement API gateway
- Add monitoring
- Improve testing coverage
- Implement CI/CD

### Long Term
- Microservices architecture
- Event-driven architecture
- GraphQL API
- Real-time features (WebSockets)
- Advanced analytics

## Documentation Standards

### Code Documentation
- Docstrings for all functions
- Type hints for all parameters
- Inline comments for complex logic
- Architecture decision records (ADRs)

### API Documentation
- OpenAPI/Swagger (automatic)
- Endpoint descriptions
- Request/response examples
- Error codes documentation

### Architecture Documentation
- System diagrams
- Component descriptions
- Data flow diagrams
- Deployment guides
