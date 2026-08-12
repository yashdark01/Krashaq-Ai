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
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from app.conversation.services.llm_provider import get_llm_with_fallback, resolve_llm_with_chain
from app.conversation.services.weather import get_weather, format_weather_for_farmer
from app.conversation.services.irrigation import get_irrigation_advice, analyze_crop_needs
from app.conversation.services.fertilizer import get_fertilizer_recommendation
from app.conversation.services.prompts import get_system_prompt, detect_language, detect_crop
from app.conversation.services.memory import ChatMemory
from app.common.cache_service import get_cache_service, cached_tool
from app.conversation.services.metrics import get_metrics_service, calculate_response_quality
from app.conversation.services.orchestrator_agent import OrchestratorAgent
from app.conversation.services.synthesis_agent import SynthesisAgent
from app.common.config import get_settings


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
    reflection_count: int
    selected_tools: List[str]


# Define tools for the agent
@tool
@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
def fetch_weather(location: str) -> str:
    """Get current weather for a location. Use this when user asks about weather or conditions."""
    cache = get_cache_service()
    
    # Try cache first
    cached = cache.get("fetch_weather", location=location)
    if cached:
        return cached
    
    weather = get_weather(location)
    if not weather.get("success"):
        return f"Unable to fetch weather for {location}. Please try again."
    
    result = format_weather_for_farmer(weather)
    
    # Cache for 5 minutes (300 seconds)
    cache.set("fetch_weather", result, ttl=300, location=location)
    
    return result


@tool
@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
def fetch_irrigation_advice(location: str, crop: Optional[str] = None) -> str:
    """Get irrigation/watering advice based on weather and optional crop type."""
    cache = get_cache_service()
    
    # Try cache first
    cache_key = {"location": location, "crop": crop}
    cached = cache.get("fetch_irrigation_advice", **cache_key)
    if cached:
        return cached
    
    weather = get_weather(location)
    if not weather.get("success"):
        return "Weather data unavailable. General advice: Water early morning (6-8 AM) or evening (5-7 PM)."
    
    base_advice = get_irrigation_advice(weather)
    
    if crop:
        crop_advice = analyze_crop_needs(crop, weather)
        if crop_advice:
            result = f"{base_advice}\n\n{crop_advice}"
        else:
            result = base_advice
    else:
        result = base_advice
    
    # Cache for 10 minutes (600 seconds)
    cache.set("fetch_irrigation_advice", result, ttl=600, **cache_key)
    
    return result


@tool
@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
def fetch_crop_advice(crop: str, location: str) -> str:
    """Get crop-specific advice including weather considerations."""
    cache = get_cache_service()
    
    # Try cache first
    cache_key = {"crop": crop, "location": location}
    cached = cache.get("fetch_crop_advice", **cache_key)
    if cached:
        return cached
    
    weather = get_weather(location)
    advice = analyze_crop_needs(crop, weather)
    
    if not advice:
        result = f"🌾 {crop.title()} Guidance:\n- Maintain consistent soil moisture\n- Monitor for pests regularly\n- Ensure proper spacing for air circulation"
    else:
        result = advice
    
    # Cache for 30 minutes (1800 seconds) - crop advice changes slowly
    cache.set("fetch_crop_advice", result, ttl=1800, **cache_key)
    
    return result


@tool
@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
def fetch_fertilizer_advice(crop: str, soil_type: Optional[str] = None) -> str:
    """Get fertilizer recommendations for a crop and optional soil type."""
    cache = get_cache_service()
    
    # Try cache first
    cache_key = {"crop": crop, "soil_type": soil_type}
    cached = cache.get("fetch_fertilizer_advice", **cache_key)
    if cached:
        return cached
    
    result = get_fertilizer_recommendation(crop, soil_type)
    
    # Cache for 1 hour (3600 seconds) - fertilizer advice changes very slowly
    cache.set("fetch_fertilizer_advice", result, ttl=3600, **cache_key)
    
    return result


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


def classify_with_llm(state: AgentState) -> AgentState:
    """Use LLM to classify which tools to use."""
    last_message = state["messages"][-1].content if state["messages"] else ""
    location = state.get("location", "Delhi")
    crop = state.get("detected_crop")
    
    try:
        llm, provider_used, _ = resolve_llm_with_chain(temperature=0.1)
        state["llm_provider"] = provider_used
        
        classification_prompt = f"""
You are a tool selector for a farming assistant. Determine which tools are needed for this query.

Query: "{last_message}"
Location: {location}
Crop: {crop if crop else "Not specified"}

Available tools:
1. fetch_weather - Get current weather data
2. fetch_irrigation_advice - Get irrigation/watering advice
3. fetch_crop_advice - Get crop-specific guidance
4. fetch_fertilizer_advice - Get fertilizer recommendations

Return a JSON object with:
{{
  "needs_tools": true/false,
  "selected_tools": ["tool1", "tool2"],
  "reasoning": "brief explanation"
}}
"""
        
        response = llm.invoke([HumanMessage(content=classification_prompt)])
        
        # Parse the response (simple parsing, could be improved)
        content = response.content.lower()
        
        # Determine which tools are selected
        selected_tools = []
        if "fetch_weather" in content or "weather" in content:
            selected_tools.append("fetch_weather")
        if "fetch_irrigation" in content or "irrigation" in content or "water" in content:
            selected_tools.append("fetch_irrigation_advice")
        if "fetch_crop" in content or "crop" in content:
            selected_tools.append("fetch_crop_advice")
        if "fetch_fertilizer" in content or "fertilizer" in content:
            selected_tools.append("fetch_fertilizer_advice")
        
        state["selected_tools"] = selected_tools
        
        # Fallback to keyword matching if LLM fails to select tools
        if not selected_tools:
            return fallback_tool_selection(state)
        
        return state
        
    except Exception as e:
        # Fallback to keyword matching if LLM fails
        return fallback_tool_selection(state)


def fallback_tool_selection(state: AgentState) -> AgentState:
    """Fallback keyword-based tool selection."""
    last_message = state["messages"][-1].content.lower()
    
    # Keywords that trigger tool usage (English + Hindi + Hinglish)
    weather_keywords = ["weather", "mausam", "मौसम", "temperature", "temp", "तापमान", "rain", "बारिश", "baarish", "barish", "forecast"]
    irrigation_keywords = ["irrigate", "water", "paani", "pani", "पानी", "seinch", "sichai", "sinchai", "सिंचाई", "watering"]
    crop_keywords = ["crop", "fasal", "फसल", "wheat", "gehu", "गेहूं", "rice", "chawal", "चावल", "cotton", "kapas", "कपास", "sugarcane", "ganna", "गन्ना"]
    fertilizer_keywords = ["fertilizer", "khad", "खाद", "urea", "dap", "nutrient", "manure", "organic", "उर्वरक"]
    
    text = last_message.lower()
    selected_tools = []
    
    if any(kw in text for kw in weather_keywords):
        selected_tools.append("fetch_weather")
    if any(kw in text for kw in irrigation_keywords):
        selected_tools.append("fetch_irrigation_advice")
    if any(kw in text for kw in crop_keywords):
        selected_tools.append("fetch_crop_advice")
    if any(kw in text for kw in fertilizer_keywords):
        selected_tools.append("fetch_fertilizer_advice")
    
    state["selected_tools"] = selected_tools
    return state


def should_use_tools(state: AgentState) -> str:
    """Determine if tools should be called based on LLM classification."""
    selected_tools = state.get("selected_tools", [])
    return "tools" if selected_tools else "respond"


def call_tools(state: AgentState) -> AgentState:
    """Execute selected tools based on LLM classification."""
    selected_tools = state.get("selected_tools", [])
    location = state.get("location", "Delhi")
    crop = state.get("detected_crop")
    tools_used = []
    results = []
    
    # Execute selected tools
    for tool_name in selected_tools:
        try:
            if tool_name == "fetch_weather":
                weather_result = fetch_weather.invoke(location)
                results.append(f"Weather:\n{weather_result}")
                tools_used.append("fetch_weather")
                # Store weather data for later
                state["weather_data"] = get_weather(location)
                
            elif tool_name == "fetch_irrigation_advice":
                irrigation_result = fetch_irrigation_advice.invoke({"location": location, "crop": crop})
                results.append(irrigation_result)
                tools_used.append("fetch_irrigation_advice")
                
            elif tool_name == "fetch_crop_advice":
                crop_result = fetch_crop_advice.invoke({"crop": crop, "location": location})
                results.append(crop_result)
                tools_used.append("fetch_crop_advice")
                
            elif tool_name == "fetch_fertilizer_advice":
                fertilizer_result = fetch_fertilizer_advice.invoke({"crop": crop, "soil_type": None})
                results.append(fertilizer_result)
                tools_used.append("fetch_fertilizer_advice")
                
        except Exception as e:
            print(f"Tool execution error for {tool_name}: {e}")
            # Continue with other tools even if one fails
    
    state["tools_used"] = tools_used
    
    # Add tool results as a system message
    if results:
        tool_message = f"Tool results:\n" + "\n\n".join(results)
        state["messages"].append(SystemMessage(content=tool_message))
    
    return state


def should_reflect(state: AgentState) -> str:
    """Determine if agent should reflect on its output."""
    reflection_count = state.get("reflection_count", 0)
    
    # Max 2 reflections to prevent infinite loops
    if reflection_count >= 2:
        return "end"
    
    # Check if response quality is low (simple heuristic)
    last_message = state["messages"][-1]
    if hasattr(last_message, 'content'):
        content = last_message.content
        # Low quality indicators
        if len(content) < 50 or "Unable to fetch" in content or "Please try again" in content:
            return "reflect"
    
    return "end"


def reflect(state: AgentState) -> AgentState:
    """Agent reflects on its own output and refines."""
    state["reflection_count"] = state.get("reflection_count", 0) + 1
    
    try:
        llm, provider_used, _ = resolve_llm_with_chain(temperature=0.3)
        
        last_response = state["messages"][-1].content if hasattr(state["messages"][-1], 'content') else ""
        
        reflection_prompt = f"""
You are improving a response for a farming assistant.

Original response: "{last_response}"

Critique the response and provide an improved version. The improved version should:
- Be more helpful and actionable
- Include specific details when possible
- Be conversational and friendly
- Use appropriate emojis

Return only the improved response, no explanation.
"""
        
        refined_response = llm.invoke([HumanMessage(content=reflection_prompt)])
        
        if refined_response.content and len(refined_response.content) > len(last_response):
            # Replace the last message with refined version
            state["messages"][-1] = AIMessage(content=refined_response.content)
        
    except Exception as e:
        print(f"Reflection error: {e}")
        # Keep original response if reflection fails
    
    return state


def generate_response(state: AgentState, config: Optional[Dict] = None) -> AgentState:
    """Generate final response using LLM."""
    settings = get_settings()
    
    # Get LLM with fallback chain
    try:
        llm, provider_used, provider_errors = resolve_llm_with_chain(temperature=0.7)
        state["llm_provider"] = provider_used
        if provider_errors:
            logger.info(f"Provider errors during generation: {provider_errors}")
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
    """Build and return the LangGraph agent with reflection loop."""
    workflow = StateGraph(AgentState)
    
    # Add nodes
    workflow.add_node("classify", classify_query)
    workflow.add_node("classify_llm", classify_with_llm)
    workflow.add_node("tools", call_tools)
    workflow.add_node("respond", generate_response)
    workflow.add_node("reflect", reflect)
    
    # Add edges
    workflow.set_entry_point("classify")
    
    # From classify, go to LLM classification
    workflow.add_edge("classify", "classify_llm")
    
    # From LLM classification, decide if tools needed
    workflow.add_conditional_edges(
        "classify_llm",
        should_use_tools,
        {
            "tools": "tools",
            "respond": "respond"
        }
    )
    
    workflow.add_edge("tools", "respond")
    
    # From respond, decide if reflection needed
    workflow.add_conditional_edges(
        "respond",
        should_reflect,
        {
            "reflect": "reflect",
            "end": END
        }
    )
    
    workflow.add_edge("reflect", "respond")
    
    return workflow.compile()


# Global agent instance
_agent = None

# Global multi-agent instances
_orchestrator = None
_synthesis_agent = None

def get_agent():
    """Get or create the agent instance."""
    global _agent
    if _agent is None:
        _agent = build_agent()
    return _agent


def get_orchestrator():
    """Get or create the orchestrator agent instance."""
    global _orchestrator
    if _orchestrator is None:
        _orchestrator = OrchestratorAgent()
    return _orchestrator


def get_synthesis_agent():
    """Get or create the synthesis agent instance."""
    global _synthesis_agent
    if _synthesis_agent is None:
        _synthesis_agent = SynthesisAgent()
    return _synthesis_agent


async def process_with_multi_agent(message: str, context: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process a query using the multi-agent system.
    
    Args:
        message: User message
        context: Additional context (location, crop, language, weather, etc.)
    
    Returns:
        Response dict with reply and metadata
    """
    orchestrator = get_orchestrator()
    
    # LangSmith metadata for multi-agent
    langchain_metadata = {
        "agent_type": "multi-agent",
        "session_id": context.get("session_id", ""),
        "location": context.get("location", "Delhi"),
        "language": context.get("language", "en"),
        "detected_crop": context.get("detected_crop"),
        "user_id": context.get("user_id")
    }
    
    # Add metadata to orchestrator context for LangSmith tracing
    context_with_metadata = context.copy()
    context_with_metadata["langchain_metadata"] = langchain_metadata
    context_with_metadata["langchain_tags"] = ["multi-agent", "krashaq", "orchestrator"]
    
    try:
        # Process through orchestrator with LangSmith tracing
        response = orchestrator.process(message, context_with_metadata)
        
        return {
            "reply": response,
            "agent_type": "multi-agent",
            "language": context.get("language", "en"),
            "detected_crop": context.get("detected_crop"),
            "tools_used": [],  # Orchestrator handles this internally
            "llm_provider": context.get("llm_provider", "ollama"),
            "weather": context.get("weather_data"),
            "reflection_count": 0,
            "quality_score": 100  # Will be calculated by metrics
        }
    except Exception as e:
        # Fallback to single agent on error
        print(f"Multi-agent error, falling back: {e}")
        return await process_with_single_agent(message, context)


async def process_with_single_agent(message: str, context: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process a query using the single-agent system (Phase 1 fallback).
    
    Args:
        message: User message
        context: Additional context (location, crop, language, weather, etc.)
    
    Returns:
        Response dict with reply and metadata
    """
    # Build initial state for single agent
    messages = [HumanMessage(content=message)]
    
    # LangSmith metadata
    langchain_metadata = {
        "agent_type": "single-agent",
        "session_id": context.get("session_id", ""),
        "location": context.get("location", "Delhi"),
        "language": context.get("language", "en"),
        "detected_crop": context.get("detected_crop"),
        "user_id": context.get("user_id")
    }
    
    initial_state = AgentState(
        messages=messages,
        session_id=context.get("session_id", ""),
        location=context.get("location", "Delhi"),
        language=context.get("language", "en"),
        detected_crop=context.get("detected_crop"),
        tools_used=[],
        weather_data=context.get("weather_data"),
        llm_provider=context.get("llm_provider", "ollama"),
        reflection_count=0,
        selected_tools=[]
    )
    
    # Run single agent with LangSmith tracing
    agent = get_agent()
    config = {
        "configurable": {
            "langchain_tags": ["single-agent", "krashaq"],
            "langchain_metadata": langchain_metadata
        }
    }
    final_state = await agent.ainvoke(initial_state, config=config)
    
    # Extract response
    last_message = final_state["messages"][-1]
    response_text = last_message.content if hasattr(last_message, "content") else str(last_message)
    
    return {
        "reply": response_text,
        "agent_type": "single-agent",
        "language": final_state.get("language", "en"),
        "tools_used": final_state.get("tools_used", []),
        "detected_crop": final_state.get("detected_crop"),
        "llm_provider": final_state.get("llm_provider", "ollama"),
        "weather": final_state.get("weather_data"),
        "reflection_count": final_state.get("reflection_count", 0),
        "quality_score": 0  # Will be calculated
    }


async def process_chat(
    message: str,
    session_id: str,
    location: str = "Delhi",
    db = None,
    chat_memory: Optional[ChatMemory] = None,
    use_multi_agent: bool = True
) -> Dict[str, Any]:
    """
    Process a chat message through the multi-agent system.
    
    Args:
        message: User message
        session_id: Conversation session ID
        location: User's location for weather queries
        db: Database session
        chat_memory: ChatMemory instance
        use_multi_agent: Whether to use multi-agent system (default: True)
    
    Returns:
        Response dict with reply, tools_used, and metadata
    """
    import time
    metrics = get_metrics_service()
    
    start_time = time.time()
    success = False
    error = None
    
    try:
        # Build context
        context = {
            "session_id": session_id,
            "location": location,
            "language": "en",
            "detected_crop": None,
            "weather_data": None,
            "llm_provider": "ollama"
        }
        
        # Detect language and crop from message
        context["language"] = detect_language(message)
        crop = detect_crop(message)
        if crop:
            context["detected_crop"] = crop
        
        # Get weather data
        try:
            weather = get_weather(location)
            if weather.get("success"):
                context["weather_data"] = weather
        except:
            pass
        
        # Route to appropriate agent system
        if use_multi_agent:
            result = await process_with_multi_agent(message, context)
        else:
            result = await process_with_single_agent(message, context)
        
        # Save to memory if provided
        if chat_memory:
            await chat_memory.add_message(
                role="user",
                content=message,
                language=context.get("language", "en")
            )
            await chat_memory.add_message(
                role="assistant",
                content=result["reply"],
                tools_used=result.get("tools_used", []),
                language=context.get("language", "en"),
                llm_provider=result.get("llm_provider", "ollama")
            )
        
        success = True
        
        # Calculate response quality
        quality_metrics = calculate_response_quality(
            result["reply"],
            result.get("tools_used", []),
            result.get("reflection_count", 0)
        )
        
        result["quality_score"] = quality_metrics["quality_score"]
        result["session_id"] = session_id
        
        return result
        
    except Exception as e:
        error = str(e)
        success = False
        raise e
        
    finally:
        # Record metrics
        end_time = time.time()
        metrics.record_request(
            session_id=session_id,
            start_time=start_time,
            end_time=end_time,
            success=success,
            tools_used=result.get("tools_used", []) if 'result' in locals() else [],
            reflection_count=result.get("reflection_count", 0) if 'result' in locals() else 0,
            llm_provider=result.get("llm_provider", "ollama") if 'result' in locals() else "unknown",
            language=result.get("language", "en") if 'result' in locals() else "en",
            error=error,
            agent_type=result.get("agent_type", "single-agent") if 'result' in locals() else "single-agent"
        )
