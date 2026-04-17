"""
Chat memory management for Krashaq LLM agent.
Stores conversation history in SQLite with session-based threading.
"""

import json
import uuid
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Message


class ChatMemory:
    """Simple chat memory manager using existing SQLite database."""
    
    def __init__(self, session_id: str, db: Session):
        self.session_id = session_id
        self.db = db
    
    def add_message(self, role: str, content: str, tools_used: Optional[List[str]] = None,
                   language: str = "en", llm_provider: str = "ollama") -> Message:
        """
        Add a message to the conversation history.
        
        Args:
            role: 'user' or 'assistant'
            content: Message content
            tools_used: List of tool names used for this response
            language: Detected language of the conversation
            llm_provider: LLM provider used for the response
        
        Returns:
            Created Message object
        """
        # Extract phone from session_id if embedded (format: phone_timestamp or uuid)
        phone = None
        if "_" in self.session_id:
            parts = self.session_id.split("_")
            if len(parts) == 2 and parts[0].isdigit():
                phone = parts[0]
        
        message = Message(
            session_id=self.session_id,
            phone=phone,
            message=content if role == "user" else "",
            response=content if role == "assistant" else "",
            language=language,
            tools_used=json.dumps(tools_used) if tools_used else None,
            llm_provider=llm_provider
        )
        
        self.db.add(message)
        self.db.commit()
        return message
    
    def get_history(self, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get recent conversation history in LangChain message format.
        
        Args:
            limit: Number of recent messages to retrieve
        
        Returns:
            List of messages as dicts with 'role' and 'content'
        """
        messages = (
            self.db.query(Message)
            .filter(Message.session_id == self.session_id)
            .order_by(Message.created_at.desc())
            .limit(limit)
            .all()
        )
        
        # Reverse to get chronological order
        messages.reverse()
        
        history = []
        for msg in messages:
            if msg.message:
                history.append({"role": "user", "content": msg.message})
            if msg.response:
                history.append({"role": "assistant", "content": msg.response})
        
        return history
    
    def get_formatted_history(self, limit: int = 10) -> str:
        """Get history formatted as a string for prompt context."""
        history = self.get_history(limit)
        if not history:
            return ""
        
        lines = []
        for msg in history:
            role_label = "User" if msg["role"] == "user" else "Assistant"
            lines.append(f"{role_label}: {msg['content']}")
        
        return "\n".join(lines)
    
    def clear_history(self):
        """Clear all messages for this session."""
        self.db.query(Message).filter(Message.session_id == self.session_id).delete()
        self.db.commit()


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


def cleanup_old_sessions(db: Session, days: int = 30):
    """
    Remove messages from sessions older than specified days.
    
    Args:
        db: Database session
        days: Number of days to keep (default 30)
    """
    cutoff_date = datetime.now() - timedelta(days=days)
    
    deleted = (
        db.query(Message)
        .filter(Message.created_at < cutoff_date)
        .delete()
    )
    
    db.commit()
    return deleted


def get_session_stats(db: Session) -> Dict[str, Any]:
    """Get statistics about stored sessions."""
    total_messages = db.query(Message).count()
    total_sessions = db.query(Message.session_id).distinct().count()
    
    # Messages by provider
    provider_counts = {}
    results = (
        db.query(Message.llm_provider, db.func.count(Message.id))
        .group_by(Message.llm_provider)
        .all()
    )
    for provider, count in results:
        provider_counts[provider or "unknown"] = count
    
    return {
        "total_messages": total_messages,
        "total_sessions": total_sessions,
        "messages_by_provider": provider_counts
    }
