from typing import Dict, Any, List, Optional
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
    
    async def load_memory_from_database(self, session_id: str):
        """
        Load conversation history from database into memory.
        
        Args:
            session_id: Session identifier
        """
        from app.common.db.mongodb import get_collection
        from datetime import datetime
        
        messages_collection = get_collection("messages")
        
        messages = await messages_collection.find(
            {"session_id": session_id}
        ).sort("created_at", 1).to_list(length=None)
        
        memory = self.get_memory(session_id)
        
        for msg in messages:
            if msg.get("message"):
                memory.append({"role": "user", "content": msg.get("message")})
            if msg.get("response"):
                memory.append({"role": "assistant", "content": msg.get("response")})
    
    async def save_memory_to_database(self, session_id: str, user_id: Optional[str] = None):
        """
        Save current memory state to database (for persistence).
        
        Args:
            session_id: Session identifier
            user_id: User ID (optional)
        """
        from app.common.db.mongodb import get_collection
        from datetime import datetime
        
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
