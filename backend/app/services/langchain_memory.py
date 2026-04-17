from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.models import Message
import json

class LangChainMemoryService:
    """Service for managing conversation memory using database."""
    
    def __init__(self):
        self.memory_store: Dict[str, List[Dict[str, str]]] = {}
    
    def get_memory(self, session_id: str) -> List[Dict[str, str]]:
        """
        Get or create memory for a session.
        
        Args:
            session_id: Session identifier
        
        Returns:
            List of message dictionaries
        """
        if session_id not in self.memory_store:
            self.memory_store[session_id] = []
        return self.memory_store[session_id]
    
    def add_user_message(self, session_id: str, message: str):
        """
        Add a user message to memory.
        
        Args:
            session_id: Session identifier
            message: User message content
        """
        memory = self.get_memory(session_id)
        memory.append({"role": "user", "content": message})
    
    def add_assistant_message(self, session_id: str, message: str):
        """
        Add an assistant message to memory.
        
        Args:
            session_id: Session identifier
            message: Assistant message content
        """
        memory = self.get_memory(session_id)
        memory.append({"role": "assistant", "content": message})
    
    def get_conversation_history(self, session_id: str) -> str:
        """
        Get formatted conversation history.
        
        Args:
            session_id: Session identifier
        
        Returns:
            Formatted conversation history string
        """
        memory = self.get_memory(session_id)
        if not memory:
            return ""
        
        lines = []
        for msg in memory:
            role_label = "User" if msg["role"] == "user" else "Assistant"
            lines.append(f"{role_label}: {msg['content']}")
        
        return "\n".join(lines)
    
    def clear_memory(self, session_id: str):
        """
        Clear memory for a session.
        
        Args:
            session_id: Session identifier
        """
        if session_id in self.memory_store:
            del self.memory_store[session_id]
    
    def load_memory_from_database(self, session_id: str, db: Session):
        """
        Load conversation history from database into memory.
        
        Args:
            session_id: Session identifier
            db: Database session
        """
        messages = db.query(Message).filter(
            Message.session_id == session_id
        ).order_by(Message.created_at).all()
        
        memory = self.get_memory(session_id)
        
        for msg in messages:
            if msg.message:
                memory.append({"role": "user", "content": msg.message})
            if msg.response:
                memory.append({"role": "assistant", "content": msg.response})
    
    def save_memory_to_database(self, session_id: str, db: Session, user_id: Optional[int] = None):
        """
        Save current memory state to database (for persistence).
        
        Args:
            session_id: Session identifier
            db: Database session
            user_id: User ID (optional)
        """
        memory = self.get_memory(session_id)
        
        # This is a simplified version - in production, you'd want to track which messages
        # are new and only insert those, or update existing ones
        pass
    
    def get_memory_variables(self, session_id: str) -> Dict[str, Any]:
        """
        Get memory variables for use in prompts.
        
        Args:
            session_id: Session identifier
        
        Returns:
            Dictionary with memory variables
        """
        memory = self.get_memory(session_id)
        return {"chat_history": memory}


# Singleton instance
langchain_memory_service = LangChainMemoryService()
