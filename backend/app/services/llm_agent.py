"""
LLM Agent service for Krashaq.
Main interface for chat processing with the LangGraph agent.
"""

from typing import Dict, Any, Optional

from app.services.agent_router import process_chat
from app.services.memory import ChatMemory, get_or_create_session
from app.services.weather import get_weather


class LLMAgent:
    """Main agent interface for Krashaq chat functionality."""
    
    def __init__(self):
        pass
    
    async def chat(
        self,
        message: str,
        location: str = "Delhi",
        phone: Optional[str] = None,
        session_id: Optional[str] = None,
        language_hint: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Process a chat message and return response.
        
        Args:
            message: User's message
            location: User's location for weather queries
            phone: User's phone number (optional)
            session_id: Existing session ID for conversation continuity
            language_hint: Preferred language (en, hi, hinglish)
        
        Returns:
            Dict containing reply and metadata
        """
        # Get or create session
        session_id = get_or_create_session(phone, session_id)
        
        # Initialize chat memory
        chat_memory = ChatMemory(session_id)
        
        # Process through agent
        result = await process_chat(
            message=message,
            session_id=session_id,
            location=location,
            chat_memory=chat_memory
        )
        
        return result
    
    async def get_chat_history(
        self,
        session_id: str,
        limit: int = 20
    ) -> list:
        """Get chat history for a session."""
        chat_memory = ChatMemory(session_id)
        return await chat_memory.get_history(limit)
    
    async def clear_chat_history(self, session_id: str) -> bool:
        """Clear chat history for a session."""
        chat_memory = ChatMemory(session_id)
        await chat_memory.clear_history()
        return True


def get_agent() -> LLMAgent:
    """Factory function to create agent instance."""
    return LLMAgent()
