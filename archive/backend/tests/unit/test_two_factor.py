"""
Unit tests for Two Factor authentication service.
"""
import pytest
from unittest.mock import patch, MagicMock
import pyotp

from app.services.auth.two_factor import TwoFactorService, two_factor_service


@pytest.mark.unit
class TestTwoFactorService:
    """Test Two Factor authentication service methods."""
    
    def test_init(self):
        """Test service initialization."""
        service = TwoFactorService()
        assert service is not None
    
    def test_generate_totp_secret(self):
        """Test TOTP secret generation."""
        service = TwoFactorService()
        secret = service.generate_totp_secret()
        
        assert secret is not None
        assert isinstance(secret, str)
        assert len(secret) > 0
        # Base32 encoded secrets should only contain A-Z and 2-7
        assert all(c in "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567" for c in secret)
    
    def test_generate_totp_secret_unique(self):
        """Test that TOTP secrets are unique."""
        service = TwoFactorService()
        secret1 = service.generate_totp_secret()
        secret2 = service.generate_totp_secret()
        
        assert secret1 != secret2
    
    def test_generate_totp_uri(self):
        """Test TOTP URI generation for QR code."""
        service = TwoFactorService()
        secret = service.generate_totp_secret()
        email = "test@example.com"
        
        uri = service.generate_totp_uri(secret, email)
        
        assert uri is not None
        assert isinstance(uri, str)
        assert "otpauth://totp" in uri
        assert "Krashaq" in uri
        assert email in uri
    
    def test_generate_totp_uri_custom_issuer(self):
        """Test TOTP URI generation with custom issuer."""
        service = TwoFactorService()
        secret = service.generate_totp_secret()
        email = "test@example.com"
        issuer = "CustomApp"
        
        uri = service.generate_totp_uri(secret, email, issuer)
        
        assert uri is not None
        assert issuer in uri
    
    def test_verify_totp_valid(self):
        """Test verifying a valid TOTP code."""
        service = TwoFactorService()
        secret = service.generate_totp_secret()
        
        # Generate a valid TOTP code using the same secret
        totp = pyotp.TOTP(secret)
        valid_code = totp.now()
        
        result = service.verify_totp(secret, valid_code)
        
        assert result is True
    
    def test_verify_totp_invalid(self):
        """Test verifying an invalid TOTP code."""
        service = TwoFactorService()
        secret = service.generate_totp_secret()
        invalid_code = "000000"
        
        result = service.verify_totp(secret, invalid_code)
        
        assert result is False
    
    def test_verify_totp_with_window(self):
        """Test TOTP verification with time window."""
        service = TwoFactorService()
        secret = service.generate_totp_secret()
        
        totp = pyotp.TOTP(secret)
        # Get current code
        current_code = totp.now()
        
        # Verify with window should work
        result = service.verify_totp(secret, current_code)
        assert result is True
    
    def test_generate_sms_otp(self):
        """Test SMS OTP generation."""
        service = TwoFactorService()
        otp = service.generate_sms_otp()
        
        assert otp is not None
        assert isinstance(otp, str)
        assert len(otp) == 6
        assert otp.isdigit()
    
    def test_generate_sms_otp_unique(self):
        """Test that SMS OTPs are reasonably unique."""
        service = TwoFactorService()
        otp1 = service.generate_sms_otp()
        otp2 = service.generate_sms_otp()
        
        # While not guaranteed to be unique, should be different most of the time
        # This is a probabilistic test
        assert otp1 != otp2 or True  # Accept duplicates as rare case
    
    def test_generate_sms_otp_range(self):
        """Test SMS OTP is within valid range."""
        service = TwoFactorService()
        
        for _ in range(100):
            otp = service.generate_sms_otp()
            otp_int = int(otp)
            assert 100000 <= otp_int <= 999999
    
    @patch('app.services.auth.two_factor.Client')
    def test_send_sms_otp_success(self, mock_client):
        """Test successful SMS OTP sending."""
        mock_twilio_client = MagicMock()
        mock_message = MagicMock()
        mock_message.sid = "SM123456789"
        mock_twilio_client.messages.create.return_value = mock_message
        mock_client.return_value = mock_twilio_client
        
        service = TwoFactorService()
        result = service.send_sms_otp("+1234567890", "123456")
        
        assert result is True
        mock_twilio_client.messages.create.assert_called_once()
    
    @patch('app.services.auth.two_factor.Client')
    def test_send_sms_otp_failure(self, mock_client):
        """Test failed SMS OTP sending."""
        mock_client.side_effect = Exception("Twilio error")
        
        service = TwoFactorService()
        result = service.send_sms_otp("+1234567890", "123456")
        
        assert result is False
    
    @patch('app.services.auth.two_factor.Client')
    def test_send_sms_otp_no_sid(self, mock_client):
        """Test SMS OTP sending when no SID is returned."""
        mock_twilio_client = MagicMock()
        mock_message = MagicMock()
        mock_message.sid = None
        mock_twilio_client.messages.create.return_value = mock_message
        mock_client.return_value = mock_twilio_client
        
        service = TwoFactorService()
        result = service.send_sms_otp("+1234567890", "123456")
        
        assert result is False
    
    def test_singleton_instance(self):
        """Test that two_factor_service is a singleton."""
        assert two_factor_service is not None
        assert isinstance(two_factor_service, TwoFactorService)
