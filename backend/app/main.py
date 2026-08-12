from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.common.db.mongodb import connect_to_mongodb, close_mongodb_connection
from app.conversation import routes as conversation_routes
from app.conversation import routes_webhook as webhook_routes
from app.farmers import routes as farmers_routes
from app.auth import routes as auth_routes
from app.locations import routes as locations_routes
from app.admin import routes as admin_routes
from app.scheduler.services.scheduler import start_scheduler, stop_scheduler
from app.common.middleware.rate_limit import RateLimitMiddleware
from app.common.middleware.validation import ValidationMiddleware
from app.common.middleware.security import SecurityMiddleware
from app.common.middleware.logging import LoggingMiddleware
from app.common.utils.logging import setup_logging, get_logger
from app.common.utils.sentry import init_sentry
from app.common.config import get_settings

# Setup structured logging
setup_logging()
logger = get_logger(__name__)
settings = get_settings()

# Initialize LangSmith for LLM observability
if settings.langsmith_tracing and settings.langsmith_api_key:
    import os
    os.environ["LANGCHAIN_TRACING_V2"] = "true"
    os.environ["LANGCHAIN_API_KEY"] = settings.langsmith_api_key
    os.environ["LANGCHAIN_PROJECT"] = settings.langsmith_project
    logger.info("LangSmith tracing enabled")
else:
    logger.info("LangSmith tracing disabled")

# Initialize Sentry for error tracking
init_sentry()
if settings.sentry_dsn:
    logger.info("Sentry error tracking enabled")
else:
    logger.info("Sentry error tracking disabled")

# Initialize FastAPI app
app = FastAPI(
    title="Krashaq API",
    description="Smart farming assistant with WhatsApp and Web integration",
    version="1.0.0"
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add rate limiting middleware
app.add_middleware(RateLimitMiddleware)

# Add input validation middleware
app.add_middleware(ValidationMiddleware)

# Add security headers middleware
app.add_middleware(SecurityMiddleware)

# Add logging middleware
app.add_middleware(LoggingMiddleware)

# Include routers
app.include_router(webhook_routes.router, tags=["WhatsApp Webhook"])
app.include_router(conversation_routes.router, prefix="/api", tags=["Chat"])
app.include_router(farmers_routes.router, prefix="/api", tags=["Farmers"])
app.include_router(auth_routes.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(locations_routes.router, prefix="/api/locations", tags=["Locations"])
app.include_router(admin_routes.router, prefix="/api/admin", tags=["Admin"])


@app.on_event("startup")
async def startup_event():
    """Connect to MongoDB and start the scheduler on application startup."""
    logger.info("Starting Krashaq API...")
    await connect_to_mongodb()
    logger.info("Connected to MongoDB")
    await start_scheduler()
    logger.info("Scheduler started successfully")
    logger.info("Krashaq API startup complete")


@app.on_event("shutdown")
async def shutdown_event():
    """Stop the scheduler and close MongoDB connection on application shutdown."""
    logger.info("Shutting down Krashaq API...")
    stop_scheduler()
    logger.info("Scheduler stopped")
    await close_mongodb_connection()
    logger.info("Disconnected from MongoDB")
    logger.info("Krashaq API shutdown complete")


@app.get("/")
def root():
    logger.info("Root endpoint accessed")
    return {
        "status": "running",
        "app": "Krashaq API",
        "version": "1.0.0",
        "endpoints": {
            "health": "/",
            "chat": "/api/chat",
            "weather": "/api/weather?city=Delhi",
            "farmers": "/api/farmers",
            "webhook": "/webhook",
            "send_whatsapp": "/send-whatsapp"
        }
    }


@app.get("/health")
def health_check():
    logger.debug("Health check endpoint accessed")
    return {"status": "healthy"}
