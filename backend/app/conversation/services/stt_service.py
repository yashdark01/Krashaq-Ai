"""
Speech-to-Text service using faster-whisper.
"""

import logging
from faster_whisper import WhisperModel

logger = logging.getLogger(__name__)

# Load model globally for efficiency
whisper_model = WhisperModel("base", compute_type="int8")


def transcribe_audio(file_path: str) -> str:
    """
    Transcribe audio file using faster-whisper.
    
    Args:
        file_path: Path to audio file (WAV format recommended)
    
    Returns:
        Transcribed text as string
    """
    try:
        # logger.info("=" * 80)
        # logger.info("STT TRANSCRIPTION STARTING")
        # logger.info("=" * 80)
        # logger.info(f"[STT] File: {file_path}")
        
        # Transcribe audio
        segments, info = whisper_model.transcribe(file_path, language="hi")
        
        # logger.info(f"[STT] Detected language: {info.language} (probability: {info.language_probability:.2f})")
        
        # Combine segments into single string
        transcribed_text = " ".join(segment.text for segment in segments)
        
        print(f"\n{'='*80}")
        print(f"STT TRANSCRIBED TEXT: {transcribed_text}")
        print(f"{'='*80}\n")
        # logger.info(f"[STT] ✓ Transcribed: {transcribed_text[:100]}...")
        # logger.info("=" * 80)
        
        return transcribed_text.strip()
        
    except Exception as e:
        # logger.error("=" * 80)
        # logger.error("[STT] TRANSCRIPTION FAILED")
        # logger.error(f"[STT] Error: {str(e)}")
        # logger.error("=" * 80)
        print(f"STT ERROR: {str(e)}")
        raise
