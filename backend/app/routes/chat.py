from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any

from app.db import get_db
from app.models import Message
from app.services.llm_agent import LLMAgent
from app.services.weather import get_weather, format_weather_for_farmer
from app.services.irrigation import get_irrigation_advice
from app.services.memory import cleanup_old_sessions, get_session_stats
from app.services.langchain_memory import langchain_memory_service
from app.config import get_settings

router = APIRouter()


class ChatRequest(BaseModel):
    message: str = Field(..., description="User's message")
    location: Optional[str] = Field(default="Delhi", description="User's location for weather queries")
    phone: Optional[str] = Field(default=None, description="User's phone number for session tracking")
    session_id: Optional[str] = Field(default=None, description="Existing session ID for conversation continuity")
    language: Optional[str] = Field(default=None, description="Preferred language (en, hi, hinglish)")


class ChatResponse(BaseModel):
    reply: str = Field(..., description="AI assistant's response")
    session_id: str = Field(..., description="Session ID for conversation continuity")
    language: str = Field(default="en", description="Detected response language")
    tools_used: List[str] = Field(default=[], description="Tools invoked for this response")
    detected_crop: Optional[str] = Field(default=None, description="Crop detected in query")
    llm_provider: str = Field(default="ollama", description="LLM provider used")
    weather: Optional[Dict[str, Any]] = Field(default=None, description="Weather data if fetched")


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest, db: Session = Depends(get_db)):
    """
    Main chat endpoint that processes user messages and returns AI responses.
    Uses LangChain memory for conversation history.
    """
    try:
        # Generate session ID if not provided
        session_id = request.session_id or f"session_{hash(request.message)}"
        
        # Load conversation history from database if session exists
        if request.session_id:
            langchain_memory_service.load_memory_from_database(session_id, db)
        
        # Add user message to memory
        langchain_memory_service.add_user_message(session_id, request.message)
        
        # Initialize LLM agent
        agent = LLMAgent()
        
        # Get conversation context from memory
        memory_context = langchain_memory_service.get_conversation_history(session_id)
        
        # Process the message with the agent (pass memory context)
        result = agent.process_message(
            message=request.message,
            location=request.location,
            phone=request.phone,
            session_id=session_id,
            language=request.language,
            conversation_context=memory_context
        )
        
        # Add assistant response to memory
        langchain_memory_service.add_assistant_message(session_id, result["reply"])
        
        return ChatResponse(
            reply=result["reply"],
            session_id=session_id,
            language=result.get("language", "en"),
            tools_used=result.get("tools_used", []),
            detected_crop=result.get("detected_crop"),
            llm_provider=result.get("llm_provider", "ollama"),
            weather=result.get("weather")
        )
        
    except Exception as e:
        # Fallback to legacy behavior on error
        location = request.location or "Delhi"
        weather = get_weather(location)
        weather_msg = format_weather_for_farmer(weather)
        
        reply = (
            f"🌾 Krashaq Advisory:\n\n"
            f"{weather_msg}\n\n"
            f"I'm experiencing some technical issues with AI features. "
            f"Please try again or contact support.\n\n"
            f"Error: {str(e)}"
        )
        
        return ChatResponse(
            reply=reply,
            session_id=request.session_id or "fallback",
            language="en",
            tools_used=[],
            llm_provider="fallback",
            weather=weather if weather.get("success") else None
        )


@router.get("/weather")
async def get_weather_endpoint(
    city: str = "Delhi",
    state: Optional[str] = None,
    district: Optional[str] = None,
    tehsil: Optional[str] = None,
    locality: Optional[str] = None
):
    """
    Get weather data for a location.
    Accepts multiple location options for accuracy: locality (highest priority), tehsil, district, state.
    Falls back to city if no specific location options provided.
    """
    # Use locality as primary, then tehsil, district, state, then city as fallback
    location = locality or tehsil or district or state or city
    
    weather = get_weather(location)
    if not weather.get("success"):
        raise HTTPException(status_code=500, detail=weather.get("error", "Failed to fetch weather"))
    
    # Include location hierarchy in response
    weather["location_hierarchy"] = {
        "locality": locality,
        "tehsil": tehsil,
        "district": district,
        "state": state,
        "city": city
    }
    
    return weather


@router.get("/messages")
async def get_messages(
    phone: Optional[str] = None,
    session_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Get chat history. Filter by phone number or session ID.
    """
    query = db.query(Message)
    
    if phone:
        query = query.filter(Message.phone == phone)
    if session_id:
        query = query.filter(Message.session_id == session_id)
    
    messages = query.order_by(Message.created_at.desc()).limit(100).all()
    
    return [
        {
            "id": m.id,
            "phone": m.phone,
            "session_id": m.session_id,
            "message": m.message,
            "response": m.response,
            "language": m.language,
            "tools_used": m.tools_used,
            "llm_provider": m.llm_provider,
            "created_at": m.created_at.isoformat() if m.created_at else None
        }
        for m in messages
    ]


@router.get("/llm/providers")
async def get_llm_providers():
    """
    Get available LLM providers and their configuration status.
    """
    from app.services.llm_provider import PROVIDER_CONFIGS, get_available_providers
    
    settings = get_settings()
    available = get_available_providers()
    
    providers = []
    for name, config in PROVIDER_CONFIGS.items():
        providers.append({
            "name": name,
            "default_model": config["default_model"],
            "is_available": name in available,
            "is_configured": config["required_key"] is None or bool(getattr(settings, config["required_key"], "")),
            "requires_api_key": config["required_key"] is not None,
            "is_current": settings.llm_provider == name
        })
    
    return {
        "current_provider": settings.llm_provider,
        "available_providers": available,
        "providers": providers
    }


@router.get("/llm/sessions/stats")
async def get_session_statistics(db: Session = Depends(get_db)):
    """
    Get statistics about chat sessions.
    """
    stats = get_session_stats(db)
    return stats


@router.delete("/llm/sessions/{session_id}")
async def clear_session(session_id: str, db: Session = Depends(get_db)):
    """
    Clear chat history for a specific session.
    """
    from app.services.memory import ChatMemory
    
    chat_memory = ChatMemory(session_id, db)
    chat_memory.clear_history()
    
    return {"message": f"Session {session_id} cleared successfully"}


@router.post("/llm/sessions/cleanup")
async def cleanup_sessions(days: int = 30, db: Session = Depends(get_db)):
    """
    Remove old chat sessions (default: older than 30 days).
    """
    deleted_count = cleanup_old_sessions(db, days)
    
    return {
        "message": f"Cleaned up {deleted_count} old messages",
        "days_threshold": days
    }
