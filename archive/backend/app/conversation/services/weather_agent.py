"""
Weather specialist agent for Krashaq multi-agent system.
Handles weather-related queries including current weather, forecasts, and alerts.
"""

from typing import Dict, Any
from langchain_core.messages import HumanMessage, AIMessage

from app.conversation.services.base_agent import BaseAgent
from app.weather.services.weather import get_weather, format_weather_for_farmer
from app.conversation.services.agent_config import get_agent_config


class WeatherAgent(BaseAgent):
    """Specialist agent for weather-related queries."""
    
    def __init__(self):
        """Initialize weather agent with configuration."""
        config = get_agent_config("weather")
        super().__init__(
            agent_name="weather",
            model=config.get("model"),
            temperature=config.get("temperature", 0.2)
        )
        self.cache_ttl = config.get("cache_ttl", 300)
    
    def process(self, query: str, context: Dict[str, Any]) -> str:
        """
        Process a weather-related query.
        
        Args:
            query: User query about weather
            context: Additional context (location, language, etc.)
        
        Returns:
            Weather advice response
        """
        location = context.get("location", "Delhi")
        language = context.get("language", "en")
        
        # Check cache first
        cache_key = f"{location}_{query}"
        cached = self.get_cached_result(cache_key)
        if cached:
            return cached
        
        # Get weather data
        weather = get_weather(location)
        
        if not weather.get("success"):
            error_msg = f"Unable to fetch weather for {location}. Please try again later."
            if language == "hi":
                error_msg = f"{location} के लिए मौसम की जानकारी प्राप्त करने में विफल। कृपया बाद में पुनः प्रयास करें।"
            return error_msg
        
        # Format weather response
        weather_response = format_weather_for_farmer(weather)
        
        # Use LLM to provide contextual advice based on weather
        try:
            llm = self.get_llm()
            system_prompt = self.get_system_prompt(language)
            
            user_prompt = f"""
Weather data for {location}:
{weather_response}

User query: "{query}"

Provide weather-related farming advice based on this weather data. Consider:
- Current conditions and their impact on crops
- Any alerts or warnings
- Recommendations for the next few days
"""
            
            response = llm.invoke([
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt)
            ])
            
            result = response.content if response.content else weather_response
            
        except Exception as e:
            # Fallback to basic weather data if LLM fails
            result = weather_response
        
        # Cache the result
        self.cache_result(cache_key, result, ttl=self.cache_ttl)
        
        return self.format_response(result, language)
    
    def validate_context(self, context: Dict[str, Any]) -> bool:
        """Validate that location is provided."""
        return "location" in context or context.get("location")
