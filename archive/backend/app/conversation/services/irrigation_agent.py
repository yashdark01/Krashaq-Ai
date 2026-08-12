"""
Irrigation specialist agent for Krashaq multi-agent system.
Handles irrigation and water management queries.
"""

from typing import Dict, Any
from langchain_core.messages import HumanMessage, AIMessage

from app.conversation.services.base_agent import BaseAgent
from app.conversation.services.irrigation import get_irrigation_advice, analyze_crop_needs
from app.conversation.services.weather import get_weather
from app.conversation.services.agent_config import get_agent_config


class IrrigationAgent(BaseAgent):
    """Specialist agent for irrigation and water management."""
    
    def __init__(self):
        """Initialize irrigation agent with configuration."""
        config = get_agent_config("irrigation")
        super().__init__(
            agent_name="irrigation",
            model=config.get("model"),
            temperature=config.get("temperature", 0.3)
        )
        self.cache_ttl = config.get("cache_ttl", 600)
    
    def process(self, query: str, context: Dict[str, Any]) -> str:
        """
        Process an irrigation-related query.
        
        Args:
            query: User query about irrigation
            context: Additional context (location, crop, language, weather, etc.)
        
        Returns:
            Irrigation advice response
        """
        crop = context.get("detected_crop") or context.get("crop")
        location = context.get("location", "Delhi")
        language = context.get("language", "en")
        weather = context.get("weather_data")
        
        # Check cache first
        cache_key = f"{crop}_{location}_{query}"
        cached = self.get_cached_result(cache_key)
        if cached:
            return cached
        
        # Get weather data if not provided
        if not weather:
            weather = get_weather(location)
        
        # Get irrigation advice
        base_advice = get_irrigation_advice(weather)
        crop_advice = ""
        if crop:
            crop_advice = analyze_crop_needs(crop, weather)
        
        # Use LLM to provide comprehensive irrigation advice
        try:
            llm = self.get_llm()
            system_prompt = self.get_system_prompt(language)
            
            context_info = f"""
Crop: {crop if crop else "Not specified"}
Location: {location}
"""
            if weather and weather.get("success"):
                context_info += f"Current weather: {weather.get('description', 'N/A')}\n"
                context_info += f"Temperature: {weather.get('temp', 'N/A')}°C\n"
                context_info += f"Humidity: {weather.get('humidity', 'N/A')}%\n"
            
            user_prompt = f"""
{context_info}

Irrigation data:
Base advice: {base_advice}
Crop-specific: {crop_advice if crop_advice else "N/A"}

User query: "{query}"

Provide comprehensive irrigation advice including:
- Watering schedule and timing
- Water requirements based on weather
- Crop-specific irrigation needs
- Water conservation tips
- Soil moisture management
"""
            
            response = llm.invoke([
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt)
            ])
            
            result = response.content if response.content else base_advice
            
        except Exception as e:
            # Fallback to basic irrigation data if LLM fails
            result = base_advice
            if crop_advice:
                result = f"{base_advice}\n\n{crop_advice}"
        
        # Cache the result
        self.cache_result(cache_key, result, ttl=self.cache_ttl)
        
        return self.format_response(result, language)
    
    def validate_context(self, context: Dict[str, Any]) -> bool:
        """Validate that location is provided."""
        return "location" in context or context.get("location")
