import logging
from typing import Dict, Optional

logger = logging.getLogger(__name__)


def get_irrigation_decision(weather_data: Dict, soil_moisture: Optional[float] = None) -> Dict:
    """
    Generate irrigation decision based on weather and soil moisture data.
    Uses simple rule-based logic for MVP.
    
    Args:
        weather_data: Dictionary containing weather data with keys:
            - temp: Temperature in Celsius
            - rain: Precipitation in mm
            - success: Boolean indicating if weather data is valid
        soil_moisture: Optional soil moisture percentage (0-100)
    
    Returns:
        Dictionary with decision and reason:
        {
            "decision": "SKIP" | "IRRIGATE" | "INCREASE_WATER",
            "reason": "Human-readable explanation"
        }
    """
    # Extract weather data
    temp = weather_data.get("temp", 30)
    rain = weather_data.get("rain", 0)
    weather_success = weather_data.get("success", True)
    
    logger.info(f"Making irrigation decision: temp={temp}°C, rain={rain}mm, soil_moisture={soil_moisture}%")
    
    # Rule 1: If rain > 2mm (high probability), skip irrigation
    if rain > 2:
        return {
            "decision": "SKIP",
            "reason": f"Rain expected ({rain}mm detected). No irrigation needed today."
        }
    
    # Rule 2: If soil moisture exists and > 35%, skip irrigation
    if soil_moisture is not None and soil_moisture > 35:
        return {
            "decision": "SKIP",
            "reason": f"Soil moisture is adequate ({soil_moisture}%). No irrigation needed today."
        }
    
    # Rule 3: If temperature > 38°C, increase water
    if temp > 38:
        return {
            "decision": "INCREASE_WATER",
            "reason": f"Extreme heat detected ({temp}°C). Increase irrigation by 20% to compensate for high evaporation."
        }
    
    # Default: Irrigate normally
    if weather_success:
        return {
            "decision": "IRRIGATE",
            "reason": f"Normal conditions ({temp}°C, {rain}mm rain). Proceed with regular irrigation."
        }
    else:
        return {
            "decision": "IRRIGATE",
            "reason": "Weather data unavailable. Proceed with regular irrigation as a precaution."
        }
