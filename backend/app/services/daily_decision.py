import logging
from app.services.weather import get_weather
from app.services.irrigation_decision import get_irrigation_decision

logger = logging.getLogger(__name__)


def generate_daily_message(user: dict, language: str = "hi") -> str:
    """
    Generate daily irrigation message for a farmer.
    
    Args:
        user: User dictionary with name, phone, location, soil_moisture, language
        language: Language preference (en, hi, hinglish)
    
    Returns:
        Formatted WhatsApp message string
    """
    logger.info(f"Generating daily message for farmer: {user.get('name')}, Location: {user.get('location')}, Language: {language}")
    
    # Get farmer's location (default to Mandsaur if not set)
    location = user.get('location', {}).get('state', 'Maharashtra') if user.get('location') else "Mandsaur"
    
    # Fetch weather data
    weather = get_weather(location, use_cache=False)  # Don't use cache for daily decisions
    
    # Get irrigation decision
    decision_result = get_irrigation_decision(
        weather_data=weather,
        soil_moisture=user.get('soil_moisture')
    )
    
    # Extract weather data
    temp = weather.get("temp", 30)
    rain = weather.get("rain", 0)
    decision = decision_result["decision"]
    reason = decision_result["reason"]
    
    logger.info(f"Weather: {temp}°C, Rain: {rain}mm, Decision: {decision}, Reason: {reason}")
    
    # Format message based on language
    if language == "hi":
        # Hindi message
        message = (
            f"🌾 शुभ प्रभात {user.get('name')}!\n\n"
            f"🌤 मौसम: {temp}°C, वर्षा {rain}mm\n"
            f"💧 सिंचाई: {decision}\n"
            f"📌 कारण: {reason}\n\n"
            f"खेती का अच्छा दिन! 🚜"
        )
    elif language == "hinglish":
        # Hinglish message
        message = (
            f"🌾 Good Morning {user.get('name')}!\n\n"
            f"🌤 Weather: {temp}°C, Rain {rain}mm\n"
            f"💧 Irrigation: {decision}\n"
            f"📌 Reason: {reason}\n\n"
            f"Have a great farming day! 🚜"
        )
    else:
        # English message (default)
        message = (
            f"🌾 Good Morning {user.get('name')}!\n\n"
            f"🌤 Weather: {temp}°C, Rain {rain}mm\n"
            f"💧 Irrigation: {decision}\n"
            f"📌 Reason: {reason}\n\n"
            f"Have a great farming day! 🚜"
        )
    
    return message
