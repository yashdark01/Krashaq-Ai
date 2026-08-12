"""
Configuration service for managing system-wide settings.
Provides methods to get and update configuration values.
"""

import os
from typing import Dict, Any
from dotenv import load_dotenv

load_dotenv()


class ConfigService:
    """Service for managing system configuration."""
    
    # Valid configuration keys
    VALID_KEYS = {
        "llm_provider",
        "ollama_base_url",
        "ollama_model",
        "weather_api_key",
        "twilio_account_sid",
        "twilio_auth_token",
        "twilio_whatsapp_number",
        "google_api_key",
        "openai_api_key",
        "anthropic_api_key",
        "xai_api_key"
    }
    
    def get_config(self) -> Dict[str, str]:
        """
        Get current system configuration.
        
        Returns:
            Dictionary of configuration values (sensitive keys masked)
        """
        return {
            "llm_provider": os.getenv("LLM_PROVIDER", "ollama"),
            "ollama_base_url": os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434"),
            "ollama_model": os.getenv("OLLAMA_MODEL", "llama3.1:8b"),
            "weather_api_key": self._mask_key(os.getenv("WEATHER_API_KEY", "")),
            "twilio_account_sid": self._mask_key(os.getenv("TWILIO_ACCOUNT_SID", "")),
            "twilio_whatsapp_number": self._mask_key(os.getenv("TWILIO_WHATSAPP_NUMBER", ""))
        }
    
    def update_config(self, updates: Dict[str, str]) -> bool:
        """
        Update system configuration.
        
        Args:
            updates: Dictionary of configuration key-value pairs to update
            
        Returns:
            True if successful, False otherwise
        """
        try:
            # Validate all keys
            for key in updates.keys():
                if key not in self.VALID_KEYS:
                    raise ValueError(f"Invalid configuration key: {key}")
            
            # Update .env file
            env_file = os.path.join(os.getcwd(), ".env")
            
            # Read existing .env file
            env_vars = {}
            if os.path.exists(env_file):
                with open(env_file, 'r') as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith('#') and '=' in line:
                            key, value = line.split('=', 1)
                            env_vars[key.strip()] = value.strip()
            
            # Apply updates
            for key, value in updates.items():
                env_vars[key] = value
            
            # Write back to .env file
            with open(env_file, 'w') as f:
                for key, value in env_vars.items():
                    f.write(f"{key}={value}\n")
            
            # Reload environment variables
            load_dotenv(override=True)
            
            return True
            
        except Exception as e:
            print(f"Error updating configuration: {e}")
            return False
    
    def _mask_key(self, value: str) -> str:
        """
        Mask sensitive configuration values.
        
        Args:
            value: The value to mask
            
        Returns:
            Masked value (first 4 chars visible, rest asterisks)
        """
        if not value or len(value) <= 4:
            return "****"
        return value[:4] + "*" * (len(value) - 4)


# Singleton instance
config_service = ConfigService()
