"""
Unit tests for JWT service.
"""
import pytest
from datetime import datetime, timedelta
from unittest.mock import patch
from jose import JWTError

from app.services.auth.jwt_service import (
    create_access_token,
    create_refresh_token,
    verify_token,
    decode_token
)


@pytest.mark.unit
class TestJWTService:
    """Test JWT token creation and verification."""
    
    def test_create_access_token(self):
        """Test creating an access token."""
        data = {"sub": "user123", "email": "test@example.com"}
        token = create_access_token(data)
        
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0
    
    def test_create_access_token_with_expiration(self):
        """Test that access token has correct expiration."""
        data = {"sub": "user123"}
        token = create_access_token(data)
        payload = decode_token(token)
        
        assert payload is not None
        assert "exp" in payload
        assert payload["type"] == "access"
        
        # Check expiration is in the future
        exp_timestamp = payload["exp"]
        exp_datetime = datetime.fromtimestamp(exp_timestamp)
        assert exp_datetime > datetime.utcnow()
    
    def test_create_refresh_token(self):
        """Test creating a refresh token."""
        data = {"sub": "user123"}
        token = create_refresh_token(data)
        
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0
    
    def test_create_refresh_token_with_expiration(self):
        """Test that refresh token has correct expiration."""
        data = {"sub": "user123"}
        token = create_refresh_token(data)
        payload = decode_token(token)
        
        assert payload is not None
        assert "exp" in payload
        assert payload["type"] == "refresh"
        
        # Refresh tokens should have longer expiration
        exp_timestamp = payload["exp"]
        exp_datetime = datetime.fromtimestamp(exp_timestamp)
        assert exp_datetime > datetime.utcnow() + timedelta(days=6)
    
    def test_verify_token_valid(self):
        """Test verifying a valid token."""
        data = {"sub": "user123", "email": "test@example.com"}
        token = create_access_token(data)
        payload = verify_token(token)
        
        assert payload is not None
        assert payload["sub"] == "user123"
        assert payload["email"] == "test@example.com"
    
    def test_verify_token_invalid(self):
        """Test verifying an invalid token."""
        invalid_token = "invalid.token.here"
        payload = verify_token(invalid_token)
        
        assert payload is None
    
    def test_verify_token_expired(self):
        """Test verifying an expired token."""
        data = {"sub": "user123"}
        
        # Mock the settings to create an already expired token
        with patch('app.services.auth.jwt_service.settings') as mock_settings:
            mock_settings.access_token_expire_minutes = -1  # Negative to make it expired
            mock_settings.jwt_secret_key = "test_secret"
            mock_settings.jwt_algorithm = "HS256"
            
            token = create_access_token(data)
            payload = verify_token(token)
            
            # Expired token should return None
            assert payload is None
    
    def test_decode_token_without_verification(self):
        """Test decoding a token without verification."""
        data = {"sub": "user123", "email": "test@example.com"}
        token = create_access_token(data)
        payload = decode_token(token)
        
        assert payload is not None
        assert payload["sub"] == "user123"
        assert payload["email"] == "test@example.com"
    
    def test_decode_token_invalid(self):
        """Test decoding an invalid token."""
        invalid_token = "invalid.token.here"
        payload = decode_token(invalid_token)
        
        assert payload is None
    
    def test_token_payload_preservation(self):
        """Test that token payload is preserved correctly."""
        data = {
            "sub": "user123",
            "email": "test@example.com",
            "role": "admin",
            "language": "hi"
        }
        token = create_access_token(data)
        payload = verify_token(token)
        
        assert payload["sub"] == "user123"
        assert payload["email"] == "test@example.com"
        assert payload["role"] == "admin"
        assert payload["language"] == "hi"
    
    def test_access_token_type(self):
        """Test that access token has correct type."""
        data = {"sub": "user123"}
        token = create_access_token(data)
        payload = verify_token(token)
        
        assert payload["type"] == "access"
    
    def test_refresh_token_type(self):
        """Test that refresh token has correct type."""
        data = {"sub": "user123"}
        token = create_refresh_token(data)
        payload = verify_token(token)
        
        assert payload["type"] == "refresh"
