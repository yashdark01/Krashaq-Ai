from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import csv
import io

from app.db.mongodb import get_collection
from app.services.llm_agent import LLMAgent
from app.services.weather import get_weather, format_weather_for_farmer
from app.services.irrigation import get_irrigation_advice
from app.services.memory import cleanup_old_sessions, get_session_stats
from app.services.langchain_memory import langchain_memory_service
from app.services.metrics import get_metrics_service
from app.config import get_settings

router = APIRouter()


class ChatRequest(BaseModel):
    message: str = Field(..., description="User's message")
    location: Optional[str] = Field(default="Delhi", description="User's location for weather queries")
    phone: Optional[str] = Field(default=None, description="User's phone number for session tracking")
    session_id: Optional[str] = Field(default=None, description="Existing session ID for conversation continuity")
    language: Optional[str] = Field(default=None, description="Preferred language (en, hi, hinglish)")
    user_id: Optional[str] = Field(default=None, description="User ID for authentication")
    reply_to: Optional[str] = Field(default=None, description="Message ID to reply to (threading)")


class EditMessageRequest(BaseModel):
    message_id: str = Field(..., description="Message ID to edit")
    new_content: str = Field(..., description="New message content")


class ChatResponse(BaseModel):
    reply: str = Field(..., description="AI assistant's response")
    session_id: str = Field(..., description="Session ID for conversation continuity")
    language: str = Field(default="en", description="Detected response language")
    tools_used: List[str] = Field(default=[], description="Tools invoked for this response")
    detected_crop: Optional[str] = Field(default=None, description="Crop detected in query")
    llm_provider: str = Field(default="ollama", description="LLM provider used")
    weather: Optional[Dict[str, Any]] = Field(default=None, description="Weather data if fetched")


@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    """
    Main chat endpoint that processes user messages and returns AI responses.
    Uses LangChain memory for conversation history.
    """
    try:
        # Generate session ID if not provided
        session_id = request.session_id or f"session_{hash(request.message)}"
        
        # Load conversation history from database if session exists
        if request.session_id:
            await langchain_memory_service.load_memory_from_database(session_id)
        
        # Add user message to memory
        langchain_memory_service.add_user_message(session_id, request.message)
        
        # Initialize LLM agent
        agent = LLMAgent()
        
        # Get conversation context from memory
        memory_context = langchain_memory_service.get_conversation_history(session_id)
        
        # Process the message with the agent (pass memory context)
        result = await agent.process_message(
            message=request.message,
            location=request.location,
            phone=request.phone,
            session_id=session_id,
            language=request.language,
            conversation_context=memory_context
        )
        
        # Add assistant response to memory
        langchain_memory_service.add_assistant_message(session_id, result["reply"])
        
        # Save messages to database with enhanced fields
        messages_collection = get_collection("messages")
        
        # Save user message
        user_message_doc = {
            "user_id": request.user_id,
            "session_id": session_id,
            "phone": request.phone,
            "message": request.message,
            "message_type": "user",
            "status": "sent",
            "language": request.language or "en",
            "reply_to": request.reply_to,
            "created_at": datetime.utcnow()
        }
        user_message_result = await messages_collection.insert_one(user_message_doc)
        
        # Save assistant response
        assistant_message_doc = {
            "user_id": request.user_id,
            "session_id": session_id,
            "phone": request.phone,
            "message": result["reply"],
            "message_type": "assistant",
            "status": "delivered",
            "language": result.get("language", "en"),
            "tools_used": result.get("tools_used", []),
            "llm_provider": result.get("llm_provider", "ollama"),
            "reply_to": str(user_message_result.inserted_id),
            "created_at": datetime.utcnow()
        }
        await messages_collection.insert_one(assistant_message_doc)
        
        return ChatResponse(
            reply=result["reply"],
            session_id=session_id,
            language=result.get("language", "en"),
            tools_used=result.get("tools_used", []),
            detected_crop=result.get("detected_crop"),
            llm_provider=result.get("llm_provider", "ollama"),
            weather=result.get("weather"),
            message_id=str(user_message_result.inserted_id)
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
    user_id: Optional[str] = None,
    page: int = 1,
    limit: int = 20
):
    """
    Get chat history with pagination. Filter by phone number, session ID, or user ID.
    """
    messages_collection = get_collection("messages")
    
    # Validate pagination parameters
    page = max(1, page)
    limit = min(100, max(1, limit))
    
    # Build query
    query = {"deleted": {"$ne": True}}
    if phone:
        query["phone"] = phone
    if session_id:
        query["session_id"] = session_id
    if user_id:
        query["user_id"] = user_id
    
    # Get total count
    total_count = await messages_collection.count_documents(query)
    
    # Calculate pagination metadata
    total_pages = (total_count + limit - 1) // limit
    skip = (page - 1) * limit
    
    # Get messages
    messages = await messages_collection.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(length=None)
    
    return {
        "messages": [
            {
                "id": m.get("_id"),
                "phone": m.get("phone"),
                "session_id": m.get("session_id"),
                "user_id": m.get("user_id"),
                "message": m.get("message"),
                "response": m.get("response"),
                "message_type": m.get("message_type"),
                "language": m.get("language"),
                "tools_used": m.get("tools_used"),
                "llm_provider": m.get("llm_provider"),
                "created_at": m.get("created_at").isoformat() if m.get("created_at") else None,
                "starred": m.get("starred", False),
                "edited": m.get("edited", False)
            }
            for m in messages
        ],
        "pagination": {
            "page": page,
            "limit": limit,
            "total_count": total_count,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1
        }
    }


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
async def get_session_statistics():
    """
    Get statistics about chat sessions.
    """
    # For now, return empty stats - can be implemented later with MongoDB
    return {
        "total_sessions": 0,
        "total_messages": 0,
        "active_sessions": 0
    }


@router.delete("/llm/sessions/{session_id}")
async def clear_session(session_id: str):
    """
    Clear chat history for a specific session.
    """
    # Delete messages with this session_id from MongoDB
    messages_collection = get_collection("messages")
    await messages_collection.delete_many({"session_id": session_id})
    
    return {"message": f"Session {session_id} cleared successfully"}


@router.post("/llm/sessions/cleanup")
async def cleanup_sessions(days: int = 30):
    """
    Remove old chat sessions (default: older than 30 days).
    """
    from datetime import datetime, timedelta
    
    messages_collection = get_collection("messages")
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    result = await messages_collection.delete_many({
        "created_at": {"$lt": cutoff_date}
    })
    
    return {
        "message": f"Cleaned up {result.deleted_count} old messages",
        "days_threshold": days
    }


@router.get("/llm/metrics")
async def get_llm_metrics():
    """
    Get LLM agent metrics including response quality, tool usage, and performance.
    """
    metrics = get_metrics_service()
    return metrics.get_metrics()


@router.post("/llm/metrics/reset")
async def reset_llm_metrics():
    """
    Reset all LLM metrics to zero.
    """
    metrics = get_metrics_service()
    metrics.reset_metrics()
    return {"message": "Metrics reset successfully"}


@router.put("/messages/{message_id}")
async def edit_message(request: EditMessageRequest):
    """
    Edit a message (only user messages can be edited).
    """
    messages_collection = get_collection("messages")
    
    # Get message
    message = await messages_collection.find_one({"_id": request.message_id})
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Only allow editing user messages
    if message.get("message_type") != "user":
        raise HTTPException(status_code=400, detail="Only user messages can be edited")
    
    # Update message
    await messages_collection.update_one(
        {"_id": request.message_id},
        {"$set": {
            "message": request.new_content,
            "edited": True,
            "edited_at": datetime.utcnow()
        }}
    )
    
    return {"message": "Message edited successfully"}


@router.delete("/messages/{message_id}")
async def delete_message(message_id: str):
    """
    Delete a message (soft delete).
    """
    messages_collection = get_collection("messages")
    
    # Get message
    message = await messages_collection.find_one({"_id": message_id})
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Soft delete
    await messages_collection.update_one(
        {"_id": message_id},
        {"$set": {
            "deleted": True,
            "deleted_at": datetime.utcnow()
        }}
    )
    
    return {"message": "Message deleted successfully"}


@router.get("/messages/{message_id}/thread")
async def get_message_thread(message_id: str, page: int = 1, limit: int = 20):
    """
    Get message thread (replies to this message) with pagination.
    """
    messages_collection = get_collection("messages")
    
    # Validate pagination parameters
    page = max(1, page)
    limit = min(100, max(1, limit))
    
    # Build query
    query = {"reply_to": message_id, "deleted": {"$ne": True}}
    
    # Get total count
    total_count = await messages_collection.count_documents(query)
    
    # Calculate pagination metadata
    total_pages = (total_count + limit - 1) // limit
    skip = (page - 1) * limit
    
    # Get messages
    replies = await messages_collection.find(query).sort("created_at", 1).skip(skip).limit(limit).to_list(length=None)
    
    return {
        "messages": [
            {
                "id": m.get("_id"),
                "message": m.get("message"),
                "message_type": m.get("message_type"),
                "created_at": m.get("created_at").isoformat() if m.get("created_at") else None
            }
            for m in replies
        ],
        "pagination": {
            "page": page,
            "limit": limit,
            "total_count": total_count,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1
        }
    }


@router.post("/messages/{message_id}/star")
async def star_message(message_id: str):
    """
    Star/favorite a message.
    """
    messages_collection = get_collection("messages")
    
    # Toggle star status
    message = await messages_collection.find_one({"_id": message_id})
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    is_starred = message.get("starred", False)
    
    await messages_collection.update_one(
        {"_id": message_id},
        {"$set": {"starred": not is_starred}}
    )
    
    return {"message": "Message starred successfully" if not is_starred else "Message unstarred successfully"}


@router.get("/messages/starred")
async def get_starred_messages(
    user_id: Optional[str] = None,
    page: int = 1,
    limit: int = 20
):
    """
    Get all starred messages for a user with pagination.
    """
    messages_collection = get_collection("messages")
    
    # Validate pagination parameters
    page = max(1, page)
    limit = min(100, max(1, limit))
    
    # Build query
    query = {"starred": True, "deleted": {"$ne": True}}
    if user_id:
        query["user_id"] = user_id
    
    # Get total count
    total_count = await messages_collection.count_documents(query)
    
    # Calculate pagination metadata
    total_pages = (total_count + limit - 1) // limit
    skip = (page - 1) * limit
    
    # Get messages
    messages = await messages_collection.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(length=None)
    
    return {
        "messages": [
            {
                "id": m.get("_id"),
                "message": m.get("message"),
                "message_type": m.get("message_type"),
                "created_at": m.get("created_at").isoformat() if m.get("created_at") else None
            }
            for m in messages
        ],
        "pagination": {
            "page": page,
            "limit": limit,
            "total_count": total_count,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1
        }
    }


@router.get("/messages/search")
async def search_messages(
    q: str,
    user_id: Optional[str] = None,
    session_id: Optional[str] = None,
    message_type: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    page: int = 1,
    limit: int = 20
):
    """
    Search messages with full-text search and filters.
    """
    messages_collection = get_collection("messages")
    
    # Validate pagination parameters
    page = max(1, page)
    limit = min(100, max(1, limit))
    
    # Build base query
    query = {
        "deleted": {"$ne": True},
        "$text": {"$search": q}
    }
    
    # Add filters
    if user_id:
        query["user_id"] = user_id
    if session_id:
        query["session_id"] = session_id
    if message_type:
        query["message_type"] = message_type
    
    # Add date range filter
    if date_from or date_to:
        date_query = {}
        if date_from:
            date_query["$gte"] = datetime.fromisoformat(date_from)
        if date_to:
            date_query["$lte"] = datetime.fromisoformat(date_to)
        if date_query:
            query["created_at"] = date_query
    
    # Get total count
    total_count = await messages_collection.count_documents(query)
    
    # Calculate pagination metadata
    total_pages = (total_count + limit - 1) // limit
    skip = (page - 1) * limit
    
    # Get messages with text score
    messages = await messages_collection.find(
        query,
        {"score": {"$meta": "textScore"}}
    ).sort([("score", {"$meta": "textScore"}), ("created_at", -1)]).skip(skip).limit(limit).to_list(length=None)
    
    return {
        "messages": [
            {
                "id": m.get("_id"),
                "message": m.get("message"),
                "message_type": m.get("message_type"),
                "language": m.get("language"),
                "created_at": m.get("created_at").isoformat() if m.get("created_at") else None,
                "score": m.get("score", 0)
            }
            for m in messages
        ],
        "pagination": {
            "page": page,
            "limit": limit,
            "total_count": total_count,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_prev": page > 1
        },
        "search_query": q
    }


@router.get("/messages/export")
async def export_messages(
    user_id: Optional[str] = None,
    session_id: Optional[str] = None,
    message_type: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    format: str = "json"
):
    """
    Export messages in JSON, CSV, or TXT format.
    """
    messages_collection = get_collection("messages")
    
    # Build query
    query = {"deleted": {"$ne": True}}
    if user_id:
        query["user_id"] = user_id
    if session_id:
        query["session_id"] = session_id
    if message_type:
        query["message_type"] = message_type
    
    # Add date range filter
    if date_from or date_to:
        date_query = {}
        if date_from:
            date_query["$gte"] = datetime.fromisoformat(date_from)
        if date_to:
            date_query["$lte"] = datetime.fromisoformat(date_to)
        if date_query:
            query["created_at"] = date_query
    
    # Get messages
    messages = await messages_collection.find(query).sort("created_at", 1).to_list(length=None)
    
    # Export based on format
    if format == "json":
        import json
        export_data = [
            {
                "id": str(m.get("_id")),
                "user_id": m.get("user_id"),
                "session_id": m.get("session_id"),
                "phone": m.get("phone"),
                "message": m.get("message"),
                "message_type": m.get("message_type"),
                "language": m.get("language"),
                "tools_used": m.get("tools_used"),
                "llm_provider": m.get("llm_provider"),
                "created_at": m.get("created_at").isoformat() if m.get("created_at") else None
            }
            for m in messages
        ]
        
        return Response(
            content=json.dumps(export_data, indent=2),
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=messages_export.json"}
        )
    
    elif format == "csv":
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow(["id", "user_id", "session_id", "phone", "message", "message_type", "language", "created_at"])
        
        # Write rows
        for m in messages:
            writer.writerow([
                str(m.get("_id")),
                m.get("user_id", ""),
                m.get("session_id", ""),
                m.get("phone", ""),
                m.get("message", ""),
                m.get("message_type", ""),
                m.get("language", ""),
                m.get("created_at").isoformat() if m.get("created_at") else ""
            ])
        
        output.seek(0)
        return Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=messages_export.csv"}
        )
    
    elif format == "txt":
        output = io.StringIO()
        output.write("Krashaq Chat History Export\n")
        output.write("=" * 50 + "\n\n")
        
        for m in messages:
            msg_type = m.get("message_type", "").upper()
            timestamp = m.get("created_at").isoformat() if m.get("created_at") else ""
            message = m.get("message", "")
            
            output.write(f"[{msg_type}] {timestamp}\n")
            output.write(f"{message}\n")
            output.write("-" * 50 + "\n\n")
        
        output.seek(0)
        return Response(
            content=output.getvalue(),
            media_type="text/plain",
            headers={"Content-Disposition": "attachment; filename=messages_export.txt"}
        )
    
    else:
        raise HTTPException(status_code=400, detail="Unsupported format. Use json, csv, or txt")


@router.post("/messages/{message_id}/retry")
async def retry_message(message_id: str):
    """
    Retry a failed message or regenerate assistant response.
    """
    messages_collection = get_collection("messages")
    
    # Get message
    message = await messages_collection.find_one({"_id": message_id})
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Only allow retrying assistant messages
    if message.get("message_type") != "assistant":
        raise HTTPException(status_code=400, detail="Only assistant messages can be retried")
    
    # Check retry limit
    retry_count = message.get("retry_count", 0)
    if retry_count >= 3:
        raise HTTPException(status_code=400, detail="Maximum retry limit (3) reached")
    
    # Get context from original user message
    user_message = await messages_collection.find_one({"_id": message.get("reply_to")})
    if not user_message:
        raise HTTPException(status_code=404, detail="Original user message not found")
    
    # Re-process the message
    try:
        agent = LLMAgent()
        result = await agent.process_message(
            message=user_message.get("message"),
            location="Delhi",  # Default location, could be stored in user_message
            phone=user_message.get("phone"),
            session_id=user_message.get("session_id"),
            language=user_message.get("language")
        )
        
        # Store retry history
        retry_history = message.get("retry_history", [])
        retry_history.append({
            "previous_response": message.get("message"),
            "retried_at": datetime.utcnow().isoformat()
        })
        
        # Update message with new response
        await messages_collection.update_one(
            {"_id": message_id},
            {"$set": {
                "message": result["reply"],
                "language": result.get("language", "en"),
                "tools_used": result.get("tools_used", []),
                "llm_provider": result.get("llm_provider", "ollama"),
                "retry_count": retry_count + 1,
                "retry_history": retry_history,
                "last_retried_at": datetime.utcnow(),
                "status": "delivered"
            }}
        )
        
        return {
            "message": "Message retried successfully",
            "new_response": result["reply"],
            "retry_count": retry_count + 1
        }
        
    except Exception as e:
        # Update message status to failed
        await messages_collection.update_one(
            {"_id": message_id},
            {"$set": {"status": "failed", "error": str(e)}}
        )
        raise HTTPException(status_code=500, detail=f"Retry failed: {str(e)}")
