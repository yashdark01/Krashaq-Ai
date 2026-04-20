"""
Audio utilities for downloading and converting WhatsApp audio messages.
"""

import os
import logging
import requests
import ffmpeg
from typing import Optional
from app.config import get_settings

logger = logging.getLogger(__name__)

TEMP_DIR = "temp"


def download_audio(media_url: str) -> Optional[str]:
    """
    Download audio file from Twilio MediaUrl with authentication.
    
    Args:
        media_url: URL of the audio file from Twilio
    
    Returns:
        Path to downloaded file, or None if failed
    """
    try:
        # logger.info(f"[AUDIO DOWNLOAD] Downloading from: {media_url}")
        
        # Ensure temp directory exists
        os.makedirs(TEMP_DIR, exist_ok=True)
        
        # Get Twilio credentials for authentication
        settings = get_settings()
        auth = (settings.twilio_account_sid, settings.twilio_auth_token)
        
        # Download file with authentication
        response = requests.get(media_url, auth=auth, timeout=30)
        response.raise_for_status()
        
        # Generate temp filename
        temp_file = os.path.join(TEMP_DIR, "audio.ogg")
        
        # Save file
        with open(temp_file, "wb") as f:
            f.write(response.content)
        
        file_size = os.path.getsize(temp_file)
        # logger.info(f"[AUDIO DOWNLOAD] ✓ Downloaded: {temp_file} ({file_size} bytes)")
        
        return temp_file
        
    except Exception as e:
        # logger.error(f"[AUDIO DOWNLOAD] ✗ Failed: {str(e)}")
        return None


def convert_audio(input_path: str) -> Optional[str]:
    """
    Convert audio to mono 16kHz WAV format using ffmpeg.
    
    Args:
        input_path: Path to input audio file
    
    Returns:
        Path to converted WAV file, or None if failed
    """
    try:
        # logger.info(f"[AUDIO CONVERT] Converting: {input_path}")
        
        # Ensure temp directory exists
        os.makedirs(TEMP_DIR, exist_ok=True)
        
        # Generate output filename
        output_path = os.path.join(TEMP_DIR, "audio.wav")
        
        # Convert using ffmpeg
        (
            ffmpeg
            .input(input_path)
            .output(output_path, ac=1, ar=16000)
            .overwrite_output()
            .run(capture_stdout=True, capture_stderr=True)
        )
        
        file_size = os.path.getsize(output_path)
        # logger.info(f"[AUDIO CONVERT] ✓ Converted: {output_path} ({file_size} bytes)")
        
        return output_path
        
    except Exception as e:
        # logger.error(f"[AUDIO CONVERT] ✗ Failed: {str(e)}")
        return None


def get_audio_duration(file_path: str) -> Optional[float]:
    """
    Get audio duration in seconds using ffprobe.
    
    Args:
        file_path: Path to audio file
    
    Returns:
        Duration in seconds, or None if failed
    """
    try:
        # logger.info(f"[AUDIO DURATION] Checking: {file_path}")
        
        # Use ffprobe to get duration
        probe = ffmpeg.probe(file_path)
        duration = float(probe['streams'][0]['duration'])
        
        # logger.info(f"[AUDIO DURATION] ✓ Duration: {duration:.2f} seconds")
        
        return duration
        
    except Exception as e:
        # logger.error(f"[AUDIO DURATION] ✗ Failed: {str(e)}")
        return None


def cleanup_temp_file(file_path: str) -> None:
    """
    Delete temporary audio file.
    
    Args:
        file_path: Path to file to delete
    """
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
            # logger.info(f"[AUDIO CLEANUP] ✓ Deleted: {file_path}")
    except Exception as e:
        # logger.warning(f"[AUDIO CLEANUP] ✗ Failed to delete {file_path}: {str(e)}")
        pass
