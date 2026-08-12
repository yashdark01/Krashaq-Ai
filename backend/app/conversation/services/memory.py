"""
Chat memory management for Krashaq LLM agent.
Stores conversation history in MongoDB with session-based threading.
"""

import json
import uuid
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any

from app.common.db.mongodb import get_collection


class ChatMemory:
    """Simple chat memory manager using MongoDB."""
    
    def __init__(self, session_id: str):
        self.session_id = session_id
    
    async def add_message(self, role: str, content: str, tools_used: Optional[List[str]] = None,
                   language: str = "en", llm_provider: str = "ollama") -> Dict:
        """
        Add a message to the conversation history.
        
        Args:
            role: 'user' or 'assistant'
            content: Message content
            tools_used: List of tool names used for this response
            language: Detected language of the conversation
            llm_provider: LLM provider used for the response
        
        Returns:
            Created message dictionary
        """
        messages_collection = get_collection("messages")
        
        # Extract phone from session_id if embedded (format: phone_timestamp or uuid)
        phone = None
        if "_" in self.session_id:
            parts = self.session_id.split("_")
            if len(parts) == 2 and parts[0].isdigit():
                phone = parts[0]
        
        message = {
            "session_id": self.session_id,
            "phone": phone,
            "message": content if role == "user" else "",
            "response": content if role == "assistant" else "",
            "language": language,
            "tools_used": tools_used or [],
            "llm_provider": llm_provider,
            "created_at": datetime.utcnow()
        }
        
        result = await messages_collection.insert_one(message)
        message["_id"] = result.inserted_id
        
        return message
    
    async def get_history(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get recent conversation history in LangChain message format.
        
        Args:
            limit: Number of recent messages to retrieve
        
        Returns:
            List of messages as dicts with 'role' and 'content'
        """
        messages_collection = get_collection("messages")
        
        messages = await messages_collection.find(
            {"session_id": self.session_id}
        ).sort("created_at", -1).limit(limit).to_list(length=None)
        
        # Reverse to get chronological order
        messages.reverse()
        
        history = []
        for msg in messages:
            if msg.get("message"):
                history.append({"role": "user", "content": msg.get("message")})
            if msg.get("response"):
                history.append({"role": "assistant", "content": msg.get("response")})
        
        return history
    
    async def get_formatted_history(self, limit: int = 10) -> str:
        """Get history formatted as a string for prompt context."""
        history = await self.get_history(limit)
        if not history:
            return ""
        
        lines = []
        for msg in history:
            role_label = "User" if msg["role"] == "user" else "Assistant"
            lines.append(f"{role_label}: {msg['content']}")
        
        return "\n".join(lines)
    
    async def clear_history(self):
        """Clear all messages for this session."""
        messages_collection = get_collection("messages")
        await messages_collection.delete_many({"session_id": self.session_id})


def create_session_id(phone: Optional[str] = None) -> str:
    """
    Create a unique session ID.
    
    Args:
        phone: Optional phone number to embed in session ID
    
    Returns:
        Unique session identifier
    """
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    
    if phone:
        return f"{phone}_{timestamp}"
    
    return f"{uuid.uuid4().hex[:12]}_{timestamp}"


def get_or_create_session(phone: Optional[str] = None, 
                         existing_session: Optional[str] = None) -> str:
    """
    Get existing session or create new one.
    
    Args:
        phone: Phone number for the user
        existing_session: Existing session ID if continuing conversation
    
    Returns:
        Session ID to use
    """
    if existing_session:
        return existing_session
    
    return create_session_id(phone)


async def cleanup_old_sessions(days: int = 30):
    """
    Remove messages from sessions older than specified days.
    
    Args:
        days: Number of days to keep (default 30)
    """
    messages_collection = get_collection("messages")
    cutoff_date = datetime.utcnow() - timedelta(days=days)
    
    result = await messages_collection.delete_many({
        "created_at": {"$lt": cutoff_date}
    })
    
    return result.deleted_count


async def get_session_stats() -> Dict[str, Any]:
    """Get statistics about stored sessions."""
    messages_collection = get_collection("messages")
    
    total_messages = await messages_collection.count_documents({})
    
    # Get unique session count
    sessions = await messages_collection.distinct("session_id")
    total_sessions = len(sessions)
    
    # Messages by provider
    provider_counts = {}
    pipeline = [
        {"$group": {"_id": "$llm_provider", "count": {"$sum": 1}}}
    ]
    results = await messages_collection.aggregate(pipeline).to_list(length=None)
    for result in results:
        provider_counts[result.get("_id") or "unknown"] = result.get("count", 0)
    
    return {
        "total_messages": total_messages,
        "total_sessions": total_sessions,
        "messages_by_provider": provider_counts
    }
