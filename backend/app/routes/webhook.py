from fastapi import APIRouter, Form, Request, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from twilio.rest import Client
from twilio.request_validator import RequestValidator
from datetime import datetime
import logging

from app.db.mongodb import get_collection
from app.config import get_settings
from app.services.query_handler import handle_farmer_query
from app.services.whatsapp_sender import send_whatsapp_message
from app.services.audio_utils import download_audio, convert_audio, get_audio_duration, cleanup_temp_file
from app.services.stt import transcribe_audio

logger = logging.getLogger(__name__)

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


@router.post("/webhook")
async def whatsapp_webhook(
    request: Request,
    Body: str = Form(None),
    From: str = Form(...),
    NumMedia: int = Form(0),
    MediaUrl0: str = Form(None),
    MediaContentType0: str = Form(None)
):
    """
    Handle incoming WhatsApp messages from Twilio.
    Uses query handler for intent detection and response generation.
    """
    logger.info("=" * 80)
    logger.info("WHATSAPP WEBHOOK RECEIVED")
    logger.info("=" * 80)
    logger.info(f"[WEBHOOK] From: {From}")
    logger.info(f"[WEBHOOK] NumMedia: {NumMedia}")
    logger.info(f"[WEBHOOK] MediaContentType0: {MediaContentType0}")
    logger.info(f"[WEBHOOK] Body (text): {Body}")
    
    # Validate request is from Twilio (skip in development if needed)
    # if not validate_twilio_request(request):
    #     raise HTTPException(status_code=403, detail="Invalid request signature")
    
    # Get phone number
    phone = From.replace("whatsapp:", "")
    logger.info(f"[WEBHOOK] Extracted phone: {phone}")
    
    # Get farmer from database
    logger.info("[WEBHOOK] Looking up farmer in database...")
    users_collection = get_collection("users")
    farmer = await users_collection.find_one({"phone": phone, "role": "farmer"})
    
    if farmer:
        logger.info(f"[WEBHOOK] ✓ Farmer found: {farmer.get('name')} (ID: {farmer.get('_id')})")
    else:
        logger.warning(f"[WEBHOOK] ✗ Farmer not found for phone: {phone}")
    
    # Detect if message is audio
    is_audio = NumMedia > 0 and MediaContentType0 and "audio" in MediaContentType0.lower()
    message_type = "audio" if is_audio else "text"
    logger.info(f"[WEBHOOK] Message type: {message_type}")
    
    # Process audio or text
    if is_audio:
        logger.info("[WEBHOOK] Processing audio message...")
        
        # Download audio
        downloaded_file = download_audio(MediaUrl0)
        if not downloaded_file:
            reply_text = "Kripya dubara audio bhejein ya text mein likhein"
            message_type = "audio_error"
            transcribed_text = None
        else:
            # Convert audio
            converted_file = convert_audio(downloaded_file)
            if not converted_file:
                reply_text = "Kripya dubara audio bhejein ya text mein likhein"
                message_type = "audio_error"
                transcribed_text = None
                cleanup_temp_file(downloaded_file)
            else:
                # Check audio duration
                duration = get_audio_duration(converted_file)
                if duration and duration > 30:
                    reply_text = "Kripya chhota audio bhejein"
                    message_type = "audio_error"
                    transcribed_text = None
                    cleanup_temp_file(downloaded_file)
                    cleanup_temp_file(converted_file)
                else:
                    # Transcribe audio
                    try:
                        transcribed_text = transcribe_audio(converted_file)
                        logger.info(f"[WEBHOOK] Transcribed text: {transcribed_text}")
                        
                        # Process transcribed text with query handler
                        reply_text = await handle_farmer_query(transcribed_text, farmer)
                        logger.info(f"[WEBHOOK] Response generated: {reply_text[:100]}...")
                        
                    except Exception as e:
                        logger.error(f"[WEBHOOK] Transcription failed: {str(e)}")
                        reply_text = "Kripya dubara audio bhejein ya text mein likhein"
                        message_type = "audio_error"
                        transcribed_text = None
                    
                    finally:
                        # Cleanup temp files
                        cleanup_temp_file(downloaded_file)
                        cleanup_temp_file(converted_file)
    else:
        # Process text message
        logger.info("[WEBHOOK] Processing text message...")
        transcribed_text = None
        reply_text = await handle_farmer_query(Body, farmer)
        logger.info(f"[WEBHOOK] Response generated: {reply_text[:100]}...")
    
    # Save message to database
    logger.info("[WEBHOOK] Saving message to database...")
    messages_collection = get_collection("messages")
    
    message_doc = {
        "farmer_id": farmer.get("_id") if farmer else None,
        "phone": phone,
        "message": Body,
        "response": reply_text,
        "message_type": message_type,
        "language": farmer.get("language", "hi") if farmer else "hi",
        "created_at": datetime.utcnow()
    }
    
    # Add transcribed text for audio messages
    if transcribed_text:
        message_doc["transcribed_text"] = transcribed_text
    
    await messages_collection.insert_one(message_doc)
    logger.info("[WEBHOOK] ✓ Message saved to database")
    
    # Send response via WhatsApp API
    logger.info("[WEBHOOK] Sending WhatsApp response...")
    send_result = send_whatsapp_message(phone, reply_text)
    
    if send_result.get("success"):
        logger.info(f"[WEBHOOK] ✓ WhatsApp message sent successfully (SID: {send_result.get('message_sid')})")
    else:
        logger.error(f"[WEBHOOK] ✗ Failed to send WhatsApp message: {send_result.get('error')}")
    
    logger.info("=" * 80)
    logger.info("WHATSAPP WEBHOOK COMPLETED")
    logger.info("=" * 80)
    
    return PlainTextResponse("OK", status_code=200)


@router.post("/send-whatsapp")
async def send_whatsapp_message_endpoint(
    to: str,
    message: str
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
        
        message_obj = client.messages.create(
            from_=from_number,
            body=message,
            to=to_number
        )
        
        return {
            "success": True,
            "message_sid": message_obj.sid,
            "status": message_obj.status
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send message: {str(e)}")
