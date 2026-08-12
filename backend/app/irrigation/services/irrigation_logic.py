from typing import Dict


def get_irrigation_advice(weather: Dict) -> str:
    """
    Generate irrigation advice based on weather conditions.
    Returns smart recommendations for farmers.
    """
    if not weather.get("success"):
        return "💧 Irrigation Advice:\n- Check soil moisture manually\n- Water early morning (6-8 AM) or evening (5-7 PM)\n- Avoid watering during peak heat"
    
    temp = weather.get("temp", 30)
    humidity = weather.get("humidity", 50)
    rain = weather.get("rain", 0)
    condition = weather.get("condition", "").lower()
    
    advice = []
    urgency = "normal"
    
    if rain > 5:
        advice.append("🌧️ Recent heavy rainfall detected. Skip irrigation today.")
        advice.append("Check soil drainage to prevent waterlogging.")
        urgency = "low"
    elif rain > 0:
        advice.append("💧 Light rain detected. Reduce irrigation by 50%.")
        urgency = "low"
    elif temp > 38:
        advice.append("🌡️ Extreme heat! Irrigate early morning (5-7 AM) only.")
        advice.append("Increase water volume by 20% due to high evaporation.")
        advice.append("Add mulch to reduce soil moisture loss.")
        urgency = "high"
    elif temp > 35:
        advice.append("🌡️ High temperature detected. Irrigate early morning (6-8 AM).")
        advice.append("Avoid afternoon watering to prevent leaf scorch.")
        urgency = "medium"
    elif humidity < 30:
        advice.append("🌵 Low humidity detected. Soil will dry faster.")
        advice.append("Irrigate in the evening to maximize water absorption.")
        advice.append("Consider drip irrigation for water efficiency.")
        urgency = "medium"
    elif humidity > 80:
        advice.append("💨 High humidity - risk of fungal diseases.")
        advice.append("Water at the base, avoid wetting leaves.")
        advice.append("Ensure good air circulation between plants.")
        urgency = "normal"
    else:
        advice.append("💧 Normal irrigation conditions.")
        advice.append("Best time: Early morning (6-8 AM) or evening (5-7 PM).")
        urgency = "normal"
    
    if "cloud" in condition and rain == 0:
        advice.append("☁️ Cloudy weather reduces evaporation - good for watering.")
    
    advice.append(f"\nPriority: {urgency.upper()}")
    
    return "💧 Irrigation Advice:\n" + "\n".join(f"- {line}" for line in advice)


def analyze_crop_needs(crop_type: str, weather: Dict) -> str:
    """
    Provide crop-specific advice based on weather.
    """
    temp = weather.get("temp", 30)
    
    crop_guidance = {
        "rice": {
            "temp_range": (20, 35),
            "advice": "Rice needs standing water. Maintain 2-5cm water level."
        },
        "wheat": {
            "temp_range": (15, 28),
            "advice": "Wheat needs moderate watering. Avoid over-irrigation during flowering."
        },
        "cotton": {
            "temp_range": (25, 35),
            "advice": "Cotton is drought-tolerant but needs water during boll formation."
        },
        "sugarcane": {
            "temp_range": (25, 35),
            "advice": "Sugarcane needs high water. Maintain soil moisture at all times."
        },
        "vegetables": {
            "temp_range": (18, 30),
            "advice": "Most vegetables need consistent moisture. Mulch heavily."
        }
    }
    
    crop = crop_type.lower()
    if crop in crop_guidance:
        info = crop_guidance[crop]
        min_temp, max_temp = info["temp_range"]
        
        if temp < min_temp:
            temp_advice = f"⚠️ Current temp ({temp}°C) is below ideal for {crop} ({min_temp}-{max_temp}°C). Protect from cold."
        elif temp > max_temp:
            temp_advice = f"⚠️ Current temp ({temp}°C) is above ideal for {crop} ({min_temp}-{max_temp}°C). Increase shade/water."
        else:
            temp_advice = f"✅ Temperature is ideal for {crop}."
        
        return f"🌾 {crop.capitalize()} Guidance:\n- {info['advice']}\n- {temp_advice}"
    
    return ""
