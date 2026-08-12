"""
Crop specialist agent for Krashaq multi-agent system.
Handles crop-related queries including selection, diseases, pests, and yield estimation.
"""

from typing import Dict, Any
from langchain_core.messages import HumanMessage, AIMessage

from app.conversation.services.base_agent import BaseAgent
from app.conversation.services.irrigation import analyze_crop_needs
from app.conversation.services.agent_config import get_agent_config


class CropAgent(BaseAgent):
    """Specialist agent for crop-related queries."""
    
    def __init__(self):
        """Initialize crop agent with configuration."""
        config = get_agent_config("crop")
        super().__init__(
            agent_name="crop",
            model=config.get("model"),
            temperature=config.get("temperature", 0.4)
        )
        self.cache_ttl = config.get("cache_ttl", 1800)
    
    def process(self, query: str, context: Dict[str, Any]) -> str:
        """
        Process a crop-related query.
        
        Args:
            query: User query about crops
            context: Additional context (location, crop, language, weather, etc.)
        
        Returns:
            Crop advice response
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
        
        # Get crop-specific advice
        crop_advice = ""
        if crop:
            crop_advice = analyze_crop_needs(crop, weather)
        
        # Use LLM to provide comprehensive crop advice
        try:
            llm = self.get_llm()
            system_prompt = self.get_system_prompt(language)
            
            context_info = f"""
Crop: {crop if crop else "Not specified"}
Location: {location}
"""
            if weather:
                context_info += f"Current weather: {weather.get('description', 'N/A')}\n"
            
            user_prompt = f"""
{context_info}

Crop-specific data:
{crop_advice if crop_advice else "No specific crop data available"}

User query: "{query}"

Provide comprehensive crop advice including:
- Crop selection if not specified
- Planting schedule and timing
- Disease and pest management
- Yield optimization tips
- Weather considerations for this crop
"""
            
            response = llm.invoke([
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt)
            ])
            
            result = response.content if response.content else crop_advice or "Please specify a crop for detailed advice."
            
        except Exception as e:
            # Fallback to basic crop data if LLM fails
            result = crop_advice if crop_advice else "Please specify a crop for detailed advice."
        
        # Cache the result
        self.cache_result(cache_key, result, ttl=self.cache_ttl)
        
        return self.format_response(result, language)
    
    def validate_context(self, context: Dict[str, Any]) -> bool:
        """Validate that location is provided."""
        return "location" in context or context.get("location")
