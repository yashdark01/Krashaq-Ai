"""
LangGraph agent router for Krashaq.
Implements ReAct pattern with tool calling for farming assistance.
"""

import json
from typing import TypedDict, List, Dict, Any, Optional, Annotated
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_core.tools import tool
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages

from app.services.llm_provider import get_llm_with_fallback
from app.services.weather import get_weather, format_weather_for_farmer
from app.services.irrigation import get_irrigation_advice, analyze_crop_needs
from app.services.fertilizer import get_fertilizer_recommendation
from app.services.prompts import get_system_prompt, detect_language, detect_crop
from app.services.memory import ChatMemory
from app.config import get_settings


# Define state for LangGraph
class AgentState(TypedDict):
    messages: Annotated[List[Any], add_messages]
    session_id: str
    location: str
    language: str
    detected_crop: Optional[str]
    tools_used: List[str]
    weather_data: Optional[Dict]
    llm_provider: str


# Define tools for the agent
@tool
def fetch_weather(location: str) -> str:
    """Get current weather for a location. Use this when user asks about weather or conditions."""
    weather = get_weather(location)
    if not weather.get("success"):
        return f"Unable to fetch weather for {location}. Please try again."
    return format_weather_for_farmer(weather)


@tool
def fetch_irrigation_advice(location: str, crop: Optional[str] = None) -> str:
    """Get irrigation/watering advice based on weather and optional crop type."""
    weather = get_weather(location)
    if not weather.get("success"):
        return "Weather data unavailable. General advice: Water early morning (6-8 AM) or evening (5-7 PM)."
    
    base_advice = get_irrigation_advice(weather)
    
    if crop:
        crop_advice = analyze_crop_needs(crop, weather)
        if crop_advice:
            return f"{base_advice}\n\n{crop_advice}"
    
    return base_advice


@tool
def fetch_crop_advice(crop: str, location: str) -> str:
    """Get crop-specific advice including weather considerations."""
    weather = get_weather(location)
    advice = analyze_crop_needs(crop, weather)
    
    if not advice:
        return f"🌾 {crop.title()} Guidance:\n- Maintain consistent soil moisture\n- Monitor for pests regularly\n- Ensure proper spacing for air circulation"
    
    return advice


@tool
def fetch_fertilizer_advice(crop: str, soil_type: Optional[str] = None) -> str:
    """Get fertilizer recommendations for a crop and optional soil type."""
    return get_fertilizer_recommendation(crop, soil_type)


# Tools list
TOOLS = [fetch_weather, fetch_irrigation_advice, fetch_crop_advice, fetch_fertilizer_advice]


def classify_query(state: AgentState) -> AgentState:
    """Classify user intent and detect language/crop."""
    last_message = state["messages"][-1].content if state["messages"] else ""
    
    # Detect language
    lang = detect_language(last_message)
    state["language"] = lang
    
    # Detect crop
    crop = detect_crop(last_message)
    if crop:
        state["detected_crop"] = crop
    
    return state


def should_use_tools(state: AgentState) -> str:
    """Determine if tools should be called based on query content."""
    last_message = state["messages"][-1].content.lower()
    
    # Keywords that trigger tool usage (English + Hindi + Hinglish)
    weather_keywords = ["weather", "mausam", "मौसम", "temperature", "temp", "तापमान", "rain", "बारिश", "baarish", "barish", "forecast"]
    irrigation_keywords = ["irrigate", "water", "paani", "pani", "पानी", "seinch", "sichai", "sinchai", "सिंचाई", "watering"]
    crop_keywords = ["crop", "fasal", "फसल", "wheat", "gehu", "गेहूं", "rice", "chawal", "चावल", "cotton", "kapas", "कपास", "sugarcane", "ganna", "गन्ना"]
    fertilizer_keywords = ["fertilizer", "khad", "खाद", "urea", "dap", "nutrient", "manure", "organic", "उर्वरक"]
    
    text = last_message.lower()
    
    # Check if any keyword matches
    needs_tools = (
        any(kw in text for kw in weather_keywords) or
        any(kw in text for kw in irrigation_keywords) or
        any(kw in text for kw in crop_keywords) or
        any(kw in text for kw in fertilizer_keywords)
    )
    
    return "tools" if needs_tools else "respond"


def call_tools(state: AgentState) -> AgentState:
    """Execute relevant tools based on query."""
    last_message = state["messages"][-1].content
    location = state.get("location", "Delhi")
    crop = state.get("detected_crop")
    tools_used = []
    
    text_lower = last_message.lower()
    results = []
    
    # Check for weather-related queries (English + Hindi + Hinglish)
    weather_keywords = ["weather", "mausam", "मौसम", "temperature", "temp", "rain", "बारिश", "baarish", "barish", "forecast"]
    if any(kw in text_lower for kw in weather_keywords):
        weather_result = fetch_weather.invoke(location)
        results.append(f"Weather:\n{weather_result}")
        tools_used.append("fetch_weather")
        
        # Store weather data for later
        state["weather_data"] = get_weather(location)
    
    # Check for irrigation-related queries
    irrigation_keywords = ["irrigate", "water", "paani", "pani", "seinch", "watering", "sichai", "sinchai", "पानी", "सिंचाई", "सिंचाई"]
    if any(kw in text_lower for kw in irrigation_keywords):
        irrigation_result = fetch_irrigation_advice.invoke({"location": location, "crop": crop})
        results.append(irrigation_result)
        tools_used.append("fetch_irrigation_advice")
    
    # Check for crop-specific queries
    crop_keywords = ["crop", "fasal", "wheat", "gehu", "गेहूं", "rice", "chawal", "चावल", "cotton", "kapas", "कपास", "sugarcane", "ganna", "गन्ना", "vegetable", "sabzi", "सब्जी", "फसल"]
    if any(kw in text_lower for kw in crop_keywords) and crop and "irrigate" not in text_lower and "water" not in text_lower:
        crop_result = fetch_crop_advice.invoke({"crop": crop, "location": location})
        results.append(crop_result)
        tools_used.append("fetch_crop_advice")
    
    # Check for fertilizer-related queries
    fertilizer_keywords = ["fertilizer", "khad", "खाद", "urea", "dap", "nutrient", "manure", "organic", "उर्वरक", "खाद"]
    if any(kw in text_lower for kw in fertilizer_keywords) and crop:
        fertilizer_result = fetch_fertilizer_advice.invoke({"crop": crop, "soil_type": None})
        results.append(fertilizer_result)
        tools_used.append("fetch_fertilizer_advice")
    
    # If no specific tool was triggered but we have a crop, provide general advice
    if not tools_used and crop:
        crop_result = fetch_crop_advice.invoke({"crop": crop, "location": location})
        results.append(crop_result)
        tools_used.append("fetch_crop_advice")
    
    state["tools_used"] = tools_used
    
    # Add tool results as a system message
    if results:
        tool_message = f"Tool results:\n" + "\n\n".join(results)
        state["messages"].append(SystemMessage(content=tool_message))
    
    return state


def generate_response(state: AgentState, config: Optional[Dict] = None) -> AgentState:
    """Generate final response using LLM."""
    settings = get_settings()
    
    # Get LLM with fallback
    try:
        llm = get_llm_with_fallback(settings.llm_provider, temperature=0.7)
        state["llm_provider"] = settings.llm_provider
    except Exception:
        # Fallback to keyword-based response
        return generate_fallback_response(state)
    
    # Prepare messages with system prompt
    lang = state.get("language", "en")
    system_prompt = get_system_prompt(lang)
    
    # Add instruction to use tool results
    system_prompt += "\n\nUse the tool results provided to answer the user's question. Be helpful and conversational."
    
    messages = [SystemMessage(content=system_prompt)] + state["messages"]
    
    try:
        # Call LLM directly without tool binding (tools already executed)
        response = llm.invoke(messages)
        content = response.content if response.content else generate_simple_response(state)
        state["messages"].append(AIMessage(content=content))
    except Exception as e:
        # Fallback response on LLM error
        fallback = generate_simple_response(state, str(e))
        state["messages"].append(AIMessage(content=fallback))
    
    return state


def generate_fallback_response(state: AgentState) -> AgentState:
    """Generate simple response without LLM when LLM is unavailable."""
    location = state.get("location", "Delhi")
    lang = state.get("language", "en")
    crop = state.get("detected_crop")
    tools_used = state.get("tools_used", [])
    
    # Get tool results from the last system message
    tool_results = ""
    for msg in reversed(state["messages"]):
        if isinstance(msg, SystemMessage) and "Tool results:" in msg.content:
            tool_results = msg.content.replace("Tool results:\n", "")
            break
    
    if tool_results:
        response = f"🌾 Krashaq Advisory:\n\n{tool_results}"
    else:
        # Generic response
        if lang == "hi":
            response = (
                "🌾 क्रशक सहायक में आपका स्वागत है!\n\n"
                "मैं आपकी सहायता कर सकता हूं:\n"
                "• मौसम की जानकारी\n"
                "• सिंचाई सलाह\n"
                "• फसल मार्गदर्शन\n"
                "• उर्वरक सिफारिशें\n\n"
                "कृपया अपना स्थान और फसल बताएं।"
            )
        else:
            response = (
                "🌾 Welcome to Krashaq Farming Assistant!\n\n"
                "I can help you with:\n"
                "• Weather information\n"
                "• Irrigation advice\n"
                "• Crop guidance\n"
                "• Fertilizer recommendations\n\n"
                "Please share your location and crop type."
            )
    
    state["messages"].append(AIMessage(content=response))
    return state


def generate_simple_response(state: AgentState, error: str = "") -> str:
    """Generate a simple text response when LLM fails."""
    # Extract tool results
    for msg in reversed(state["messages"]):
        if isinstance(msg, SystemMessage) and "Tool results:" in msg.content:
            return msg.content.replace("Tool results:\n", "🌾 Krashaq Advisory:\n\n")
    
    return "🌾 I'm here to help with your farming questions. Please try again with more details about your location and crop."


# Build the graph
def build_agent() -> StateGraph:
    """Build and return the LangGraph agent."""
    workflow = StateGraph(AgentState)
    
    # Add nodes
    workflow.add_node("classify", classify_query)
    workflow.add_node("tools", call_tools)
    workflow.add_node("respond", generate_response)
    
    # Add edges
    workflow.set_entry_point("classify")
    workflow.add_conditional_edges(
        "classify",
        should_use_tools,
        {
            "tools": "tools",
            "respond": "respond"
        }
    )
    workflow.add_edge("tools", "respond")
    workflow.add_edge("respond", END)
    
    return workflow.compile()


# Global agent instance
_agent = None

def get_agent():
    """Get or create the agent instance."""
    global _agent
    if _agent is None:
        _agent = build_agent()
    return _agent


async def process_chat(
    message: str,
    session_id: str,
    location: str = "Delhi",
    db = None,
    chat_memory: Optional[ChatMemory] = None
) -> Dict[str, Any]:
    """
    Process a chat message through the LangGraph agent.
    
    Args:
        message: User message
        session_id: Conversation session ID
        location: User's location for weather queries
        db: Database session
        chat_memory: ChatMemory instance
    
    Returns:
        Response dict with reply, tools_used, and metadata
    """
    # Get agent
    agent = get_agent()
    
    # Get chat history if memory provided
    history = []
    if chat_memory:
        history = chat_memory.get_history(limit=5)
    
    # Build initial state
    messages = []
    for msg in history:
        if msg["role"] == "user":
            messages.append(HumanMessage(content=msg["content"]))
        else:
            messages.append(AIMessage(content=msg["content"]))
    
    # Add current message
    messages.append(HumanMessage(content=message))
    
    initial_state = AgentState(
        messages=messages,
        session_id=session_id,
        location=location,
        language="en",
        detected_crop=None,
        tools_used=[],
        weather_data=None,
        llm_provider="ollama"
    )
    
    # Run agent
    final_state = agent.invoke(initial_state)
    
    # Extract response
    last_message = final_state["messages"][-1]
    response_text = last_message.content if hasattr(last_message, "content") else str(last_message)
    
    # Save to memory if provided
    if chat_memory:
        chat_memory.add_message(
            role="user",
            content=message,
            language=final_state.get("language", "en")
        )
        chat_memory.add_message(
            role="assistant",
            content=response_text,
            tools_used=final_state.get("tools_used", []),
            language=final_state.get("language", "en"),
            llm_provider=final_state.get("llm_provider", "ollama")
        )
    
    return {
        "reply": response_text,
        "session_id": session_id,
        "language": final_state.get("language", "en"),
        "tools_used": final_state.get("tools_used", []),
        "detected_crop": final_state.get("detected_crop"),
        "llm_provider": final_state.get("llm_provider", "ollama"),
        "weather": final_state.get("weather_data")
    }
