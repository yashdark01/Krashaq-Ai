"""
Synthesis agent for Krashaq multi-agent system.
Combines results from multiple specialist agents into a cohesive response.
"""

from typing import Dict, Any, List
from langchain_core.messages import HumanMessage, AIMessage

from app.conversation.services.base_agent import BaseAgent
from app.conversation.services.agent_config import get_agent_config


class SynthesisAgent(BaseAgent):
    """Agent responsible for synthesizing responses from multiple specialists."""
    
    def __init__(self):
        """Initialize synthesis agent with configuration."""
        config = get_agent_config("synthesis")
        super().__init__(
            agent_name="synthesis",
            model=config.get("model"),
            temperature=config.get("temperature", 0.5)
        )
    
    def process(self, agent_results: Dict[str, str], query: str, context: Dict[str, Any]) -> str:
        """
        Synthesize responses from multiple agents.
        
        Args:
            agent_results: Dictionary mapping agent names to their responses
            query: Original user query
            context: Additional context (location, crop, language, etc.)
        
        Returns:
            Synthesized cohesive response
        """
        language = context.get("language", "en")
        
        # If no agent results, return general response
        if not agent_results:
            if language == "hi":
                return "🌾 क्रशक सहायक में आपका स्वागत है!\n\nमैं आपकी सहायता कर सकता हूं:\n• मौसम की जानकारी\n• सिंचाई सलाह\n• फसल मार्गदर्शन\n• उर्वरक सिफारिशें\n\nकृपया अपना स्थान और फसल बताएं।"
            else:
                return "🌾 Welcome to Krashaq Farming Assistant!\n\nI can help you with:\n• Weather information\n• Irrigation advice\n• Crop guidance\n• Fertilizer recommendations\n\nPlease share your location and crop type."
        
        # If only one agent, return its response directly
        if len(agent_results) == 1:
            return list(agent_results.values())[0]
        
        # Use LLM to synthesize multiple agent responses
        try:
            llm = self.get_llm()
            
            synthesis_prompt = f"""
You are a synthesis agent for Krashaq, an agricultural AI assistant. Your job is to combine responses from multiple specialist agents into a single, cohesive, helpful response.

Original user query: "{query}"
Location: {context.get('location', 'Delhi')}
Crop: {context.get('detected_crop', 'Not specified')}
Language: {language}

Specialist agent responses:
"""
            
            for agent_name, response in agent_results.items():
                synthesis_prompt += f"\n{agent_name.upper()} AGENT:\n{response}\n"
            
            synthesis_prompt += """
Instructions for synthesis:
1. Combine information from all agents naturally without repetition
2. Organize the response logically (e.g., start with weather, then irrigation, etc.)
3. Maintain a conversational and friendly tone
4. Use appropriate emojis to make the response engaging
5. Provide actionable recommendations
6. Resolve any conflicts between agent responses
7. Keep the response concise but comprehensive
8. Respond in the appropriate language (English, Hindi, or Hinglish)

Provide ONLY the synthesized response, no explanations or meta-commentary.
"""
            
            response = llm.invoke([HumanMessage(content=synthesis_prompt)])
            return response.content if response.content else self.fallback_synthesis(agent_results)
            
        except Exception as e:
            # Fallback to concatenating responses
            return self.fallback_synthesis(agent_results)
    
    def fallback_synthesis(self, agent_results: Dict[str, str]) -> str:
        """
        Fallback synthesis by concatenating responses.
        
        Args:
            agent_results: Results from specialist agents
        
        Returns:
            Concatenated response
        """
        # Order agents logically
        order = ["weather", "irrigation", "crop", "fertilizer"]
        ordered_results = []
        
        for agent in order:
            if agent in agent_results:
                ordered_results.append(agent_results[agent])
        
        # Add any remaining agents not in the order
        for agent, result in agent_results.items():
            if agent not in order:
                ordered_results.append(result)
        
        return "\n\n".join(ordered_results)
    
    def resolve_conflicts(self, agent_results: Dict[str, str]) -> Dict[str, Any]:
        """
        Resolve conflicts between agent responses.
        
        Args:
            agent_results: Results from specialist agents
        
        Returns:
            Dictionary with conflict resolution decisions
        """
        # Simple conflict resolution logic
        # Can be enhanced with more sophisticated reasoning
        conflicts = {}
        
        # Check for contradictory advice between irrigation and weather
        if "weather" in agent_results and "irrigation" in agent_results:
            weather_response = agent_results["weather"].lower()
            irrigation_response = agent_results["irrigation"].lower()
            
            # If weather says rain but irrigation says water, adjust irrigation
            if "rain" in weather_response and "water" in irrigation_response:
                conflicts["irrigation_override"] = "Skip irrigation due to rain"
        
        return conflicts
    
    def format_response(self, response: str, language: str = "en") -> str:
        """
        Format the synthesized response.
        
        Args:
            response: Raw synthesized response
            language: Response language
        
        Returns:
            Formatted response
        """
        # Add a friendly header if not already present
        if not response.startswith("🌾"):
            return f"🌾 Krashaq Advisory:\n\n{response}"
        return response
