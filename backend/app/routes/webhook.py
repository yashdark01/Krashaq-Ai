from fastapi import APIRouter, Form, Request, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from sqlalchemy.orm import Session
from twilio.rest import Client
from twilio.request_validator import RequestValidator
from twilio.twiml.messaging_response import MessagingResponse

from app.db import get_db
from app.models import Farmer, Message
from app.config import get_settings
from app.services.weather import get_weather, format_weather_for_farmer
from app.services.irrigation import get_irrigation_advice

router = APIRouter()
settings = get_settings()


def get_twilio_client():
    return Client(settings.twilio_account_sid, settings.twilio_auth_token)


def validate_twilio_request(request: Request) -> bool:
    """Validate that the request actually came from Twilio."""
    validator = RequestValidator(settings.twilio_auth_token)
    
    signature = request.headers.get("X-Twilio-Signature", "")
    url = str(request.url)
    
    # For form data, Twilio sends params
    params = {}
    
    return validator.validate(url, params, signature)


def process_message(body: str, location: str = "Delhi") -> str:
    """Process incoming message and generate response."""
    body_lower = body.lower().strip()
    
    # Get weather data
    weather = get_weather(location)
    
    # Check for keywords
    if any(word in body_lower for word in ["weather", "mausam", "temperature", "temp"]):
        weather_msg = format_weather_for_farmer(weather)
        return f"{weather_msg}\n\nReply with 'irrigate' for watering advice."
    
    if any(word in body_lower for word in ["irrigate", "water", "paani", "seinch", "watering"]):
        weather_msg = format_weather_for_farmer(weather)
        irrigation_msg = get_irrigation_advice(weather)
        return f"{weather_msg}\n\n{irrigation_msg}"
    
    if any(word in body_lower for word in ["help", "madad", "sahayata"]):
        return (
            "🌾 Krashaq - Your Farming Assistant\n\n"
            "Send these keywords:\n"
            "• 'weather' - Current weather\n"
            "• 'irrigate' - Irrigation advice\n"
            "• 'help' - This message\n\n"
            "Stay connected for smart farming tips!"
        )
    
    # Default response
    weather_msg = format_weather_for_farmer(weather)
    irrigation_msg = get_irrigation_advice(weather)
    
    return (
        f"🌾 Krashaq says:\n\n"
        f"{weather_msg}\n\n"
        f"{irrigation_msg}\n\n"
        f"Send 'help' for more options."
    )


@router.post("/webhook")
async def whatsapp_webhook(
    request: Request,
    Body: str = Form(...),
    From: str = Form(...),
    db: Session = Depends(get_db)
):
    """
    Handle incoming WhatsApp messages from Twilio.
    """
    # Validate request is from Twilio (skip in development if needed)
    # if not validate_twilio_request(request):
    #     raise HTTPException(status_code=403, detail="Invalid request signature")
    
    # Get or create farmer
    phone = From.replace("whatsapp:", "")
    farmer = db.query(Farmer).filter(Farmer.phone == phone).first()
    
    # Default location - can be updated based on farmer's registered location
    location = "Delhi"
    if farmer and farmer.location:
        location = farmer.location
    
    # Process message
    reply_text = process_message(Body, location)
    
    # Save message to database
    message = Message(
        farmer_id=farmer.id if farmer else None,
        phone=phone,
        message=Body,
        response=reply_text
    )
    db.add(message)
    db.commit()
    
    # Create Twilio response
    response = MessagingResponse()
    response.message(reply_text)
    
    return PlainTextResponse(str(response), media_type="application/xml")


@router.post("/send-whatsapp")
async def send_whatsapp_message(
    to: str,
    message: str,
    db: Session = Depends(get_db)
):
    """
    Send proactive WhatsApp message to a farmer.
    """
    try:
        client = get_twilio_client()
        
        # Format phone number
        if not to.startswith("+"):
            to = f"+{to}"
        
        from_number = settings.twilio_whatsapp_number
        if not from_number.startswith("whatsapp:"):
            from_number = f"whatsapp:{from_number}"
        
        to_number = f"whatsapp:{to}"
        
        message = client.messages.create(
            from_=from_number,
            body=message,
            to=to_number
        )
        
        return {
            "success": True,
            "message_sid": message.sid,
            "status": message.status
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send message: {str(e)}")
