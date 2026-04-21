"""
Base agent class for Krashaq multi-agent system.
Provides common functionality for all specialist agents.
"""

from typing import Dict, Any, Optional, List
from abc import ABC, abstractmethod
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

from app.services.llm_provider import get_llm_with_fallback
from app.services.cache_service import get_cache_service
from app.config import get_settings


class BaseAgent(ABC):
    """Base class for all specialist agents."""
    
    def __init__(self, agent_name: str, model: Optional[str] = None, temperature: float = 0.7):
        """
        Initialize base agent.
        
        Args:
            agent_name: Name of the agent
            model: LLM model to use (optional, uses default if not specified)
            temperature: Temperature for LLM generation
        """
        self.agent_name = agent_name
        self.model = model
        self.temperature = temperature
        self.cache = get_cache_service()
        self.settings = get_settings()
    
    def get_llm(self):
        """Get LLM instance for this agent."""
        provider = self.model if self.model else self.settings.llm_provider
        return get_llm_with_fallback(provider, temperature=self.temperature)
    
    def get_system_prompt(self, language: str = "en") -> str:
        """
        Get system prompt for this agent.
        
        Args:
            language: Language for the prompt (en, hi, hinglish)
        
        Returns:
            System prompt string
        """
        base_prompt = f"""
You are a {self.agent_name} specialist for Krashaq, an agricultural AI assistant.
Your role is to provide expert advice in your domain.

Key guidelines:
- Be helpful and conversational
- Provide specific, actionable advice
- Use appropriate emojis to make responses friendly
- Consider the farmer's context and location
- If you don't have enough information, ask clarifying questions
"""
        
        if language == "hi":
            return base_prompt + "\n\nRespond in Hindi or Hinglish as appropriate."
        elif language == "hinglish":
            return base_prompt + "\n\nRespond in Hinglish (mix of Hindi and English)."
        
        return base_prompt + "\n\nRespond in English."
    
    def cache_result(self, key: str, result: Any, ttl: int = 300) -> bool:
        """
        Cache a result.
        
        Args:
            key: Cache key
            result: Result to cache
            ttl: Time to live in seconds
        
        Returns:
            True if cached successfully
        """
        return self.cache.set(self.agent_name, result, ttl=ttl, cache_key=key)
    
    def get_cached_result(self, key: str) -> Optional[Any]:
        """
        Get cached result.
        
        Args:
            key: Cache key
        
        Returns:
            Cached result if exists, None otherwise
        """
        return self.cache.get(self.agent_name, cache_key=key)
    
    @abstractmethod
    def process(self, query: str, context: Dict[str, Any]) -> str:
        """
        Process a query and return a response.
        
        Args:
            query: User query
            context: Additional context (location, crop, language, etc.)
        
        Returns:
            Agent response
        """
        pass
    
    def format_response(self, response: str, language: str = "en") -> str:
        """
        Format response for the user.
        
        Args:
            response: Raw response from agent
            language: Response language
        
        Returns:
            Formatted response
        """
        # Add agent-specific prefix
        prefix = f"🌾 {self.agent_name.title()} Advice:\n\n"
        
        return prefix + response
    
    def validate_context(self, context: Dict[str, Any]) -> bool:
        """
        Validate that required context is present.
        
        Args:
            context: Context dictionary
        
        Returns:
            True if context is valid
        """
        return True  # Override in subclasses if needed
