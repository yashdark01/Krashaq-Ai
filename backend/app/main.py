from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.mongodb import connect_to_mongodb, close_mongodb_connection
from app.routes import webhook, chat, user, auth, locations, admin
from app.scheduler import start_scheduler, stop_scheduler

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

# Include routers
app.include_router(webhook.router, tags=["WhatsApp Webhook"])
app.include_router(chat.router, prefix="/api", tags=["Chat"])
app.include_router(user.router, prefix="/api", tags=["Farmers"])
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(locations.router, prefix="/api/locations", tags=["Locations"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])


@app.on_event("startup")
async def startup_event():
    """Connect to MongoDB and start the scheduler on application startup."""
    await connect_to_mongodb()
    await start_scheduler()


@app.on_event("shutdown")
async def shutdown_event():
    """Stop the scheduler and close MongoDB connection on application shutdown."""
    stop_scheduler()
    await close_mongodb_connection()


@app.get("/")
def root():
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
    return {"status": "healthy"}
