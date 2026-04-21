"""
Fertilizer specialist agent for Krashaq multi-agent system.
Handles fertilizer and soil nutrition queries.
"""

from typing import Dict, Any
from langchain_core.messages import HumanMessage, AIMessage

from app.services.base_agent import BaseAgent
from app.services.fertilizer import get_fertilizer_recommendation
from app.services.agent_config import get_agent_config


class FertilizerAgent(BaseAgent):
    """Specialist agent for fertilizer and soil nutrition."""
    
    def __init__(self):
        """Initialize fertilizer agent with configuration."""
        config = get_agent_config("fertilizer")
        super().__init__(
            agent_name="fertilizer",
            model=config.get("model"),
            temperature=config.get("temperature", 0.3)
        )
        self.cache_ttl = config.get("cache_ttl", 3600)
    
    def process(self, query: str, context: Dict[str, Any]) -> str:
        """
        Process a fertilizer-related query.
        
        Args:
            query: User query about fertilizer
            context: Additional context (crop, soil_type, language, etc.)
        
        Returns:
            Fertilizer advice response
        """
        crop = context.get("detected_crop") or context.get("crop")
        soil_type = context.get("soil_type")
        language = context.get("language", "en")
        
        # Check cache first
        cache_key = f"{crop}_{soil_type}_{query}"
        cached = self.get_cached_result(cache_key)
        if cached:
            return cached
        
        # Get fertilizer recommendations
        fertilizer_advice = get_fertilizer_recommendation(crop, soil_type)
        
        # Use LLM to provide comprehensive fertilizer advice
        try:
            llm = self.get_llm()
            system_prompt = self.get_system_prompt(language)
            
            context_info = f"""
Crop: {crop if crop else "Not specified"}
Soil type: {soil_type if soil_type else "Not specified"}
"""
            
            user_prompt = f"""
{context_info}

Fertilizer recommendation data:
{fertilizer_advice}

User query: "{query}"

Provide comprehensive fertilizer advice including:
- Recommended fertilizers and application rates
- Nutrient deficiency diagnosis
- Organic fertilizer options
- Application timing and schedule
- Cost optimization tips
- Soil health improvement
"""
            
            response = llm.invoke([
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt)
            ])
            
            result = response.content if response.content else fertilizer_advice
            
        except Exception as e:
            # Fallback to basic fertilizer data if LLM fails
            result = fertilizer_advice
        
        # Cache the result
        self.cache_result(cache_key, result, ttl=self.cache_ttl)
        
        return self.format_response(result, language)
    
    def validate_context(self, context: Dict[str, Any]) -> bool:
        """Validate that crop is provided."""
        crop = context.get("detected_crop") or context.get("crop")
        return crop is not None
