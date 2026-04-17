import requests
from typing import Dict, Optional
from app.config import get_settings
from app.services.cache.redis_service import redis_cache_service

settings = get_settings()
BASE_URL = "http://api.weatherapi.com/v1/current.json"


def get_weather(city: str, use_cache: bool = True) -> Dict:
    """
    Fetch current weather data from WeatherAPI.com with Redis caching.
    Returns temperature, humidity, conditions, and rain forecast.
    
    Args:
        city: City name
        use_cache: Whether to use Redis cache (default: True)
    """
    # Check cache first
    cache_key = f"weather:{city.lower()}"
    if use_cache:
        cached_data = redis_cache_service.get(cache_key)
        if cached_data:
            print(f"Returning cached weather data for {city}")
            return cached_data
    
    # Fetch from API
    try:
        params = {
            "q": city,
            "key": settings.weather_api_key,
            "units": "metric"
        }
        
        response = requests.get(BASE_URL, params=params, timeout=10)
        print(f"WeatherAPI response: {response.status_code}")
        print(f"URL: {response.url}")
        response.raise_for_status()
        data = response.json()
        
        weather_data = {
            "city": city,
            "temp": round(data["current"]["temp_c"]),
            "feels_like": round(data["current"]["feelslike_c"]),
            "humidity": data["current"]["humidity"],
            "pressure": data["current"]["pressure_mb"],
            "condition": data["current"]["condition"]["text"],
            "wind_speed": data["current"]["wind_kph"] / 3.6,  # Convert to m/s
            "rain": data["current"]["precip_mm"],
            "clouds": data["current"]["cloud"],
            "success": True
        }
        
        # Cache the result
        if use_cache and weather_data.get("success"):
            redis_cache_service.set(cache_key, weather_data)
            print(f"Cached weather data for {city}")
        
        return weather_data
        
    except requests.exceptions.RequestException as e:
        return {
            "city": city,
            "error": str(e),
            "success": False,
            "temp": 32,
            "humidity": 60,
            "condition": "unknown"
        }
    except (KeyError, IndexError) as e:
        return {
            "city": city,
            "error": f"Invalid response format: {str(e)}",
            "success": False,
            "temp": 32,
            "humidity": 60,
            "condition": "unknown"
        }


def invalidate_weather_cache(city: str):
    """
    Invalidate weather cache for a specific city.
    
    Args:
        city: City name to invalidate cache for
    """
    cache_key = f"weather:{city.lower()}"
    redis_cache_service.delete(cache_key)
    print(f"Invalidated weather cache for {city}")


def format_weather_for_farmer(weather: Dict) -> str:
    """Format weather data into a farmer-friendly message."""
    if not weather.get("success"):
        return "⚠️ Weather data unavailable. Using default recommendations."
    
    city = weather["city"]
    temp = weather["temp"]
    condition = weather["condition"]
    humidity = weather["humidity"]
    rain = weather.get("rain", 0)
    
    emoji = "☀️" if temp > 30 else "⛅" if temp > 20 else "🌤️"
    if "rain" in condition.lower():
        emoji = "🌧️"
    elif "cloud" in condition.lower():
        emoji = "☁️"
    
    rain_info = f"Rain (last hour): {rain}mm" if rain > 0 else "No recent rain"
    
    return (
        f"{emoji} Weather in {city}:\n"
        f"Temperature: {temp}°C (feels like {weather.get('feels_like', temp)}°C)\n"
        f"Condition: {condition.capitalize()}\n"
        f"Humidity: {humidity}%\n"
        f"{rain_info}"
    )
