"""
Query Handler for Two-Way WhatsApp Communication.
Handles intent detection, routing, and response generation for farmer queries.
"""

import logging
from typing import Dict, Optional
from app.services.weather import get_weather
from app.services.irrigation_decision import get_irrigation_decision

logger = logging.getLogger(__name__)


def detect_intent(message: str) -> str:
    """
    Detect intent from user message using rule-based keyword matching.
    
    Args:
        message: User message text
    
    Returns:
        Intent string: "irrigation", "weather", or "general"
    """
    message_lower = message.lower().strip()
    
    # Irrigation keywords
    irrigation_keywords = ["paani", "sinchai", "water", "irrigation"]
    if any(keyword in message_lower for keyword in irrigation_keywords):
        return "irrigation"
    
    # Weather keywords
    weather_keywords = ["mausam", "weather", "barish", "rain"]
    if any(keyword in message_lower for keyword in weather_keywords):
        return "weather"
    
    # Default to general
    return "general"


def irrigation_response(farmer: Optional[Dict]) -> str:
    """
    Generate irrigation response based on farmer's location.
    
    Args:
        farmer: Farmer document from database
    
    Returns:
        Formatted irrigation response string
    """
    logger.info("[IRRIGATION RESPONSE] Generating irrigation advice")
    
    # Get location from farmer or use default
    location = "Delhi"
    if farmer and farmer.get("location") and farmer.get("location", {}).get("state"):
        location = farmer.get("location", {}).get("state", "Delhi")
    
    logger.info(f"[IRRIGATION RESPONSE] Using location: {location}")
    
    # Fetch weather data
    weather = get_weather(location)
    logger.info(f"[IRRIGATION RESPONSE] Weather data: temp={weather.get('temp')}°C, rain={weather.get('rain')}mm")
    
    # Get irrigation decision
    decision_result = get_irrigation_decision(weather)
    decision = decision_result.get("decision", "UNKNOWN")
    reason = decision_result.get("reason", "Unable to determine reason")
    
    logger.info(f"[IRRIGATION RESPONSE] Decision: {decision}, Reason: {reason}")
    
    # Format response
    response = f"💧 Sinchai: {decision}\n📌 Karan: {reason}"
    
    return response


def weather_response(farmer: Optional[Dict]) -> str:
    """
    Generate weather response based on farmer's location.
    
    Args:
        farmer: Farmer document from database
    
    Returns:
        Formatted weather response string
    """
    logger.info("[WEATHER RESPONSE] Generating weather information")
    
    # Get location from farmer or use default
    location = "Delhi"
    if farmer and farmer.get("location") and farmer.get("location", {}).get("state"):
        location = farmer.get("location", {}).get("state", "Delhi")
    
    logger.info(f"[WEATHER RESPONSE] Using location: {location}")
    
    # Fetch weather data
    weather = get_weather(location)
    
    if not weather.get("success"):
        logger.warning("[WEATHER RESPONSE] Weather data unavailable")
        return "🌤 Mausam:\n⚠️ Weather data unavailable. Please try again later."
    
    temp = weather.get("temp", 0)
    humidity = weather.get("humidity", 0)
    rain = weather.get("rain", 0)
    condition = weather.get("condition", "Unknown")
    
    # Calculate rain chance based on condition and recent rain
    rain_chance = 0
    if rain > 0:
        rain_chance = min(90, 50 + rain * 10)
    elif "rain" in condition.lower() or "drizzle" in condition.lower():
        rain_chance = 70
    elif "cloud" in condition.lower():
        rain_chance = 30
    
    logger.info(f"[WEATHER RESPONSE] Temp: {temp}°C, Humidity: {humidity}%, Rain chance: {rain_chance}%")
    
    # Format response
    response = f"🌤 Mausam:\nTemp: {temp}°C\nBarish chance: {rain_chance}%"
    
    return response


async def general_response(message: str, location: str = "Delhi", language: str = "hi") -> str:
    """
    Generate general AI response for unknown queries using LLM with fallback.
    Uses Ollama LLM as primary.
    Includes location context for accurate weather responses.
    Uses user's preferred language for response.
    
    Args:
        message: User message text
        location: Farmer's location for weather context
        language: User's preferred language (hi, en, etc.)
    
    Returns:
        General response string
    """
    logger.info("=" * 80)
    logger.info("[GENERAL RESPONSE] Starting general AI response")
    logger.info("=" * 80)
    logger.info(f"[GENERAL RESPONSE] Query: {message}")
    logger.info(f"[GENERAL RESPONSE] Location: {location}")
    logger.info(f"[GENERAL RESPONSE] Language: {language}")
    
    try:
        logger.info("[GENERAL RESPONSE] Importing get_llm_with_fallback")
        from app.services.llm_provider import get_llm_with_fallback
        
        logger.info("[GENERAL RESPONSE] Initializing LLM with Ollama (primary)")
        llm = get_llm_with_fallback(primary_provider="ollama", temperature=0.7)
        logger.info(f"[GENERAL RESPONSE] LLM initialized successfully: {type(llm)}")
        
        # Build language instruction based on user's preference
        if language == "hi":
            language_instruction = "Answer in proper Hindi (Devanagari script). Use simple, conversational Hindi that farmers can easily understand."
        elif language == "en":
            language_instruction = "Answer in simple English. Use conversational tone that farmers can easily understand."
        else:
            language_instruction = "Answer in simple Hindi or Hinglish (Hindi written in English script). Use conversational tone."
        
        # Build prompt with location context
        prompt = f"""You are Krashaq, a helpful farming assistant for Indian farmers.
You are helping farmers with agricultural questions including weather, irrigation, crop advice, and market information.

User's location: {location}

{language_instruction}
Keep answers short, practical, and conversational (under 150 words).
If the question is about weather or irrigation, use the location context to provide accurate information.

Question: {message}

Answer:"""
        
        logger.info(f"[GENERAL RESPONSE] Prompt length: {len(prompt)} characters")
        logger.info("[GENERAL RESPONSE] Calling LLM")
        response = llm.invoke(prompt)
        response_text = response.content if hasattr(response, 'content') else str(response)
        
        logger.info(f"[GENERAL RESPONSE] LLM response generated: {response_text[:100]}...")
        logger.info("=" * 80)
        return response_text
        
    except Exception as e:
        logger.error("=" * 80)
        logger.error("[GENERAL RESPONSE] ERROR OCCURRED - All LLMs failed")
        logger.error(f"[GENERAL RESPONSE] Error type: {type(e).__name__}")
        logger.error(f"[GENERAL RESPONSE] Error message: {str(e)}")
        logger.error(f"[GENERAL RESPONSE] Error args: {e.args}")
        import traceback
        logger.error(f"[GENERAL RESPONSE] Traceback:\n{traceback.format_exc()}")
        logger.error("=" * 80)
        
        # Fallback message when all LLMs fail
        if language == "hi":
            return "कृपया अपना प्रश्न सिंचाई या मौसम से संबंधित पूछें।"
        else:
            return "Kripya apna prashn sinchai ya mausam se sambandhit poochein."


async def handle_farmer_query(message: str, farmer: Optional[Dict]) -> str:
    """
    Main handler for farmer queries.
    Detects intent and routes to appropriate response function.
    
    Args:
        message: User message text
        farmer: Farmer document from database (may be None if not found)
    
    Returns:
        Response string to send back to farmer
    """
    logger.info("=" * 80)
    logger.info("FARMER QUERY HANDLER")
    logger.info("=" * 80)
    logger.info(f"[INPUT] Message: {message}")
    logger.info(f"[INPUT] Farmer: {farmer.get('name') if farmer else 'Not found'}")
    logger.info(f"[INPUT] Phone: {farmer.get('phone') if farmer else 'Unknown'}")
    
    # Get location from farmer or use default
    location = "Delhi"
    if farmer and farmer.get("location") and farmer.get("location", {}).get("state"):
        location = farmer.get("location", {}).get("state", "Delhi")
    logger.info(f"[INPUT] Location: {location}")
    
    # Get language from farmer or use default
    language = "hi"
    if farmer and farmer.get("language"):
        language = farmer.get("language", "hi")
    logger.info(f"[INPUT] Language: {language}")
    
    # Detect intent
    intent = detect_intent(message)
    logger.info(f"[INTENT] Detected: {intent}")
    
    # Route to appropriate handler
    if intent == "irrigation":
        logger.info("[ROUTE] Routing to irrigation handler")
        response = irrigation_response(farmer)
    elif intent == "weather":
        logger.info("[ROUTE] Routing to weather handler")
        response = weather_response(farmer)
    else:  # general
        logger.info("[ROUTE] Routing to general handler with LLM Agent")
        response = await general_response(message, location, language)
    
    logger.info(f"[RESPONSE] Generated: {response[:100]}...")
    logger.info("=" * 80)
    
    return response
