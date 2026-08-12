import logging
from twilio.rest import Client
from typing import Dict
from app.common.config import get_settings

logger = logging.getLogger(__name__)


def send_whatsapp_message(phone: str, message: str) -> Dict:
    """
    Send a WhatsApp message using Twilio.
    
    Args:
        phone: Phone number (with or without + prefix)
        message: Message content to send
    
    Returns:
        Dictionary with status and message SID:
        {
            "success": bool,
            "message_sid": str | None,
            "status": str,
            "error": str | None
        }
    """
    logger.info("-" * 80)
    logger.info("WHATSAPP MESSAGE SENDING PROCESS")
    logger.info("-" * 80)
    logger.info(f"[INPUT] Phone: {phone}")
    logger.info(f"[INPUT] Message length: {len(message)} characters")
    logger.info(f"[MESSAGE PREVIEW] {message[:150]}..." if len(message) > 150 else f"[MESSAGE] {message}")
    
    try:
        logger.info("[STEP 1] Loading Twilio configuration...")
        settings = get_settings()
        logger.info(f"[STEP 1] ✓ Twilio Account SID: {settings.twilio_account_sid[:10]}...{settings.twilio_account_sid[-4:]}")
        logger.info(f"[STEP 1] ✓ Twilio WhatsApp Number: {settings.twilio_whatsapp_number}")
        
        logger.info("[STEP 2] Initializing Twilio client...")
        client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        logger.info("[STEP 2] ✓ Twilio client initialized")
        
        # Format phone number
        logger.info("[STEP 3] Formatting phone numbers...")
        if not phone.startswith("+"):
            phone = f"+91{phone}"
            logger.info(f"[STEP 3] ✓ Added +91 prefix: {phone}")
        
        # Format from number
        from_number = settings.twilio_whatsapp_number
        if not from_number.startswith("whatsapp:"):
            from_number = f"whatsapp:{from_number}"
            logger.info(f"[STEP 3] ✓ From number: {from_number}")
        
        # Format to number
        to_number = f"whatsapp:{phone}"
        logger.info(f"[STEP 3] ✓ To number: {to_number}")
        
        # Send message
        logger.info("[STEP 4] Sending message via Twilio API...")
        logger.info(f"[STEP 4] From: {from_number}")
        logger.info(f"[STEP 4] To: {to_number}")
        
        twilio_message = client.messages.create(
            from_=from_number,
            body=message,
            to=to_number
        )
        
        logger.info("[STEP 4] ✓ Message sent to Twilio API")
        logger.info(f"[SUCCESS] Message SID: {twilio_message.sid}")
        logger.info(f"[SUCCESS] Message Status: {twilio_message.status}")
        logger.info(f"[SUCCESS] Direction: {twilio_message.direction}")
        logger.info(f"[SUCCESS] Date Created: {twilio_message.date_created}")
        logger.info("-" * 80)
        
        return {
            "success": True,
            "message_sid": twilio_message.sid,
            "status": twilio_message.status,
            "error": None
        }
        
    except Exception as e:
        logger.error("-" * 80)
        logger.error("[ERROR] WhatsApp message sending failed")
        logger.error(f"[ERROR] Phone: {phone}")
        logger.error(f"[ERROR] Error: {str(e)}")
        logger.error(f"[ERROR] Error type: {type(e).__name__}")
        import traceback
        logger.error(f"[ERROR] Traceback: {traceback.format_exc()}")
        logger.error("-" * 80)
        
        return {
            "success": False,
            "message_sid": None,
            "status": "failed",
            "error": str(e)
        }
