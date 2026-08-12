import pyotp
import random
import secrets
from typing import Optional, List
from passlib.context import CryptContext
from app.common.config import get_settings

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class TwoFactorService:
    """Service for handling two-factor authentication."""
    
    def __init__(self):
        pass
    
    def generate_totp_secret(self) -> str:
        """
        Generate a new TOTP secret for authenticator apps.
        
        Returns:
            Base32 encoded TOTP secret
        """
        return pyotp.random_base32()
    
    def generate_totp_uri(self, secret: str, email: str, issuer: str = "Krashaq") -> str:
        """
        Generate a TOTP URI for QR code generation.
        
        Args:
            secret: TOTP secret
            email: User email
            issuer: Application name
        
        Returns:
            TOTP URI for QR code
        """
        totp = pyotp.TOTP(secret)
        return totp.provisioning_uri(email, issuer_name=issuer)
    
    def verify_totp(self, secret: str, code: str) -> bool:
        """
        Verify a TOTP code.
        
        Args:
            secret: TOTP secret
            code: 6-digit TOTP code
        
        Returns:
            True if code is valid, False otherwise
        """
        totp = pyotp.TOTP(secret)
        return totp.verify(code, valid_window=1)  # Allow 1 step window for clock skew
    
    def generate_backup_codes(self, count: int = 10) -> List[str]:
        """
        Generate backup codes for 2FA recovery.
        
        Args:
            count: Number of backup codes to generate
        
        Returns:
            List of backup codes
        """
        codes = []
        for _ in range(count):
            code = secrets.token_hex(4).upper()  # 8-character hex code
            codes.append(code)
        return codes
    
    def verify_backup_code(self, backup_codes: List[str], code: str) -> bool:
        """
        Verify a backup code.
        
        Args:
            backup_codes: List of valid backup codes
            code: Code to verify
        
        Returns:
            True if code is valid and not already used
        """
        return code.upper() in [bc.upper() for bc in backup_codes]
    
    def encrypt_secret(self, secret: str) -> str:
        """
        Encrypt a secret using bcrypt.
        
        Args:
            secret: Secret to encrypt
        
        Returns:
            Encrypted secret
        """
        return pwd_context.hash(secret)
    
    def verify_encrypted_secret(self, secret: str, encrypted: str) -> bool:
        """
        Verify a secret against encrypted value.
        
        Args:
            secret: Secret to verify
            encrypted: Encrypted secret
        
        Returns:
            True if secret matches
        """
        return pwd_context.verify(secret, encrypted)
    
    def generate_sms_otp(self) -> str:
        """
        Generate a random 6-digit OTP for SMS-based 2FA.
        
        Returns:
            6-digit OTP as string
        """
        return str(random.randint(100000, 999999))
    
    def send_sms_otp(self, phone: str, otp: str) -> bool:
        """
        Send OTP via SMS using Twilio.
        
        Args:
            phone: Phone number to send OTP to
            otp: OTP code to send
        
        Returns:
            True if sent successfully, False otherwise
        """
        try:
            from twilio.rest import Client
            
            client = Client(
                settings.twilio_account_sid,
                settings.twilio_auth_token
            )
            
            message = client.messages.create(
                body=f"Your Krashaq verification code is: {otp}",
                from_=settings.twilio_whatsapp_number,
                to=phone
            )
            
            return message.sid is not None
        except Exception as e:
            print(f"Error sending SMS OTP: {e}")
            return False


# Singleton instance
two_factor_service = TwoFactorService()
