"""
Orchestrator agent (supervisor) for Krashaq multi-agent system.
Coordinates specialist agents and manages the overall conversation flow.
"""

from typing import Dict, Any, List, Literal
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage

from app.conversation.services.base_agent import BaseAgent
from app.conversation.services.weather_agent import WeatherAgent
from app.conversation.services.crop_agent import CropAgent
from app.conversation.services.irrigation_agent import IrrigationAgent
from app.conversation.services.fertilizer_agent import FertilizerAgent
from app.conversation.services.synthesis_agent import SynthesisAgent
from app.conversation.services.prompts import detect_language, detect_crop
from app.conversation.services.metrics import get_metrics_service
from app.conversation.services.agent_config import get_agent_config, get_enabled_agents


class OrchestratorAgent(BaseAgent):
    """Supervisor agent that coordinates specialist agents."""
    
    def __init__(self):
        """Initialize orchestrator agent with configuration."""
        config = get_agent_config("orchestrator")
        super().__init__(
            agent_name="orchestrator",
            model=config.get("model"),
            temperature=config.get("temperature", 0.3)
        )
        
        # Initialize specialist agents
        self.agents = {
            "weather": WeatherAgent(),
            "crop": CropAgent(),
            "irrigation": IrrigationAgent(),
            "fertilizer": FertilizerAgent()
        }
        
        self.enable_reflection = config.get("enable_reflection", True)
        self.max_reflections = config.get("max_reflections", 2)
    
    def classify_intents(self, query: str, context: Dict[str, Any]) -> List[str]:
        """
        Classify user query into multiple intents using LLM.
        
        Args:
            query: User query
            context: Additional context
        
        Returns:
            List of detected intents (weather, crop, irrigation, fertilizer)
        """
        try:
            llm = self.get_llm()
            
            classification_prompt = f"""
You are a classifier for a farming assistant. Determine which domains the user's query relates to.

Query: "{query}"
Location: {context.get('location', 'Delhi')}
Crop: {context.get('detected_crop', 'Not specified')}

Available domains:
- weather: Weather conditions, forecasts, temperature, rain
- crop: Crop selection, diseases, pests, harvest, yield
- irrigation: Water management, irrigation schedules, watering
- fertilizer: Fertilizer recommendations, soil nutrients, fertilization

Return a JSON object with:
{{
  "intents": ["domain1", "domain2"],
  "reasoning": "brief explanation"
}}

Only return the JSON, nothing else.
"""
            
            response = llm.invoke([HumanMessage(content=classification_prompt)])
            content = response.content.lower()
            
            intents = []
            if "weather" in content:
                intents.append("weather")
            if "crop" in content:
                intents.append("crop")
            if "irrigation" in content or "water" in content:
                intents.append("irrigation")
            if "fertilizer" in content or "nutrient" in content:
                intents.append("fertilizer")
            
            # Fallback to keyword matching if LLM fails
            if not intents:
                return self.fallback_classification(query)
            
            return intents
            
        except Exception as e:
            # Fallback to keyword matching
            return self.fallback_classification(query)
    
    def fallback_classification(self, query: str) -> List[str]:
        """Fallback keyword-based classification."""
        query_lower = query.lower()
        intents = []
        
        weather_keywords = ["weather", "mausam", "मौसम", "temperature", "temp", "rain", "बारिश", "forecast"]
        crop_keywords = ["crop", "fasal", "wheat", "gehu", "rice", "chawal", "cotton", "kapas"]
        irrigation_keywords = ["irrigate", "water", "paani", "sichai", "सिंचाई"]
        fertilizer_keywords = ["fertilizer", "khad", "खाद", "urea", "dap", "nutrient"]
        
        if any(kw in query_lower for kw in weather_keywords):
            intents.append("weather")
        if any(kw in query_lower for kw in crop_keywords):
            intents.append("crop")
        if any(kw in query_lower for kw in irrigation_keywords):
            intents.append("irrigation")
        if any(kw in query_lower for kw in fertilizer_keywords):
            intents.append("fertilizer")
        
        return intents
    
    def invoke_agents(self, intents: List[str], query: str, context: Dict[str, Any]) -> Dict[str, str]:
        """
        Invoke specialist agents based on detected intents.
        
        Args:
            intents: List of detected intents
            query: User query
            context: Additional context
        
        Returns:
            Dictionary mapping agent names to their responses
        """
        results = {}
        metrics = get_metrics_service()
        
        for intent in intents:
            if intent in self.agents and get_agent_config(intent).get("enabled", True):
                try:
                    metrics.record_specialist_agent_invocation(intent)
                    agent = self.agents[intent]
                    response = agent.process(query, context)
                    results[intent] = response
                except Exception as e:
                    print(f"Error invoking {intent} agent: {e}")
                    results[intent] = f"Error: Unable to process {intent} query."
        
        return results
    
    def synthesize_response(self, query: str, agent_results: Dict[str, str], context: Dict[str, Any]) -> str:
        """
        Synthesize responses from multiple agents into a cohesive response.
        
        Args:
            query: Original user query
            agent_results: Results from specialist agents
            context: Additional context
        
        Returns:
            Synthesized response
        """
        language = context.get("language", "en")
        metrics = get_metrics_service()
        
        if not agent_results:
            # No agents were invoked, provide general response
            if language == "hi":
                return "🌾 क्रशक सहायक में आपका स्वागत है!\n\nमैं आपकी सहायता कर सकता हूं:\n• मौसम की जानकारी\n• सिंचाई सलाह\n• फसल मार्गदर्शन\n• उर्वरक सिफारिशें\n\nकृपया अपना स्थान और फसल बताएं।"
            else:
                return "🌾 Welcome to Krashaq Farming Assistant!\n\nI can help you with:\n• Weather information\n• Irrigation advice\n• Crop guidance\n• Fertilizer recommendations\n\nPlease share your location and crop type."
        
        # If only one agent was invoked, return its response directly
        if len(agent_results) == 1:
            return list(agent_results.values())[0]
        
        # Multiple agents - use LLM to synthesize
        try:
            metrics.record_synthesis()
            llm = self.get_llm()
            
            synthesis_prompt = f"""
User query: "{query}"
Location: {context.get('location', 'Delhi')}
Crop: {context.get('detected_crop', 'Not specified')}

Agent responses:
"""
            for agent_name, response in agent_results.items():
                synthesis_prompt += f"\n{agent_name.upper()}:\n{response}\n"
            
            synthesis_prompt += """
Synthesize these responses into a single, cohesive answer. The response should:
- Combine information from all agents naturally
- Avoid repetition
- Be conversational and friendly
- Use appropriate emojis
- Provide actionable recommendations
"""
            
            response = llm.invoke([HumanMessage(content=synthesis_prompt)])
            return response.content if response.content else "\n\n".join(agent_results.values())
            
        except Exception as e:
            # Fallback to concatenating responses
            return "\n\n".join(agent_results.values())
    
    def process(self, query: str, context: Dict[str, Any]) -> str:
        """
        Process a query through the multi-agent system.
        
        Args:
            query: User query
            context: Additional context (location, crop, language, etc.)
        
        Returns:
            Synthesized response from specialist agents
        """
        # Detect language and crop
        language = detect_language(query)
        context["language"] = language
        
        crop = detect_crop(query)
        if crop:
            context["detected_crop"] = crop
        
        # Classify intents
        intents = self.classify_intents(query, context)
        
        # If no intents detected, return general response
        if not intents:
            return self.synthesize_response(query, {}, context)
        
        # Invoke specialist agents
        agent_results = self.invoke_agents(intents, query, context)
        
        # Synthesize response
        response = self.synthesize_response(query, agent_results, context)
        
        return response
    
    def validate_context(self, context: Dict[str, Any]) -> bool:
        """Validate that location is provided."""
        return "location" in context or context.get("location")
