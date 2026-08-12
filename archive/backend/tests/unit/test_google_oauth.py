"""
Unit tests for Google OAuth service.
"""
import pytest
from unittest.mock import patch, MagicMock
from requests import Response

from app.services.auth.google_oauth import GoogleOAuthService, google_oauth_service


@pytest.mark.unit
class TestGoogleOAuthService:
    """Test Google OAuth service methods."""
    
    def test_init(self):
        """Test service initialization."""
        service = GoogleOAuthService()
        assert service is not None
        assert service.client_id is not None or service.client_id == ""
        assert service.client_secret is not None or service.client_secret == ""
        assert service.redirect_uri is not None
    
    @patch('app.services.auth.google_oauth.Flow')
    def test_get_authorization_url(self, mock_flow):
        """Test generating authorization URL."""
        mock_flow_instance = MagicMock()
        mock_flow_instance.authorization_url.return_value = ("https://accounts.google.com/o/oauth2/auth?code=test", "state123")
        mock_flow.from_client_config.return_value = mock_flow_instance
        
        service = GoogleOAuthService()
        url = service.get_authorization_url()
        
        assert url is not None
        assert isinstance(url, str)
        assert "accounts.google.com" in url
        mock_flow.from_client_config.assert_called_once()
        mock_flow_instance.authorization_url.assert_called_once()
    
    @patch('app.services.auth.google_oauth.Flow')
    def test_exchange_code_for_tokens_success(self, mock_flow):
        """Test successful token exchange."""
        mock_credentials = MagicMock()
        mock_credentials.token = "access_token_123"
        mock_credentials.refresh_token = "refresh_token_123"
        mock_credentials.token_uri = "https://oauth2.googleapis.com/token"
        mock_credentials.client_id = "client_id"
        mock_credentials.client_secret = "client_secret"
        mock_credentials.scopes = ["openid", "email", "profile"]
        
        mock_flow_instance = MagicMock()
        mock_flow_instance.credentials = mock_credentials
        mock_flow_instance.fetch_token.return_value = None
        mock_flow.from_client_config.return_value = mock_flow_instance
        
        service = GoogleOAuthService()
        tokens = service.exchange_code_for_tokens("auth_code_123")
        
        assert tokens is not None
        assert tokens["access_token"] == "access_token_123"
        assert tokens["refresh_token"] == "refresh_token_123"
        mock_flow_instance.fetch_token.assert_called_once_with(code="auth_code_123")
    
    @patch('app.services.auth.google_oauth.Flow')
    def test_exchange_code_for_tokens_failure(self, mock_flow):
        """Test failed token exchange."""
        mock_flow_instance = MagicMock()
        mock_flow_instance.fetch_token.side_effect = Exception("Invalid code")
        mock_flow.from_client_config.return_value = mock_flow_instance
        
        service = GoogleOAuthService()
        tokens = service.exchange_code_for_tokens("invalid_code")
        
        assert tokens is None
    
    @patch('app.services.auth.google_oauth.requests.get')
    def test_get_user_info_success(self, mock_get):
        """Test successful user info fetch."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "id": "123456789",
            "email": "test@example.com",
            "name": "Test User",
            "picture": "https://example.com/photo.jpg"
        }
        mock_get.return_value = mock_response
        
        service = GoogleOAuthService()
        user_info = service.get_user_info("access_token_123")
        
        assert user_info is not None
        assert user_info["email"] == "test@example.com"
        assert user_info["name"] == "Test User"
        mock_get.assert_called_once()
    
    @patch('app.services.auth.google_oauth.requests.get')
    def test_get_user_info_failure(self, mock_get):
        """Test failed user info fetch."""
        mock_response = MagicMock()
        mock_response.status_code = 401
        mock_get.return_value = mock_response
        
        service = GoogleOAuthService()
        user_info = service.get_user_info("invalid_token")
        
        assert user_info is None
    
    @patch('app.services.auth.google_oauth.requests.get')
    def test_get_user_info_exception(self, mock_get):
        """Test user info fetch with exception."""
        mock_get.side_effect = Exception("Network error")
        
        service = GoogleOAuthService()
        user_info = service.get_user_info("access_token_123")
        
        assert user_info is None
    
    @patch('app.services.auth.google_oauth.id_token')
    def test_verify_id_token_success(self, mock_id_token):
        """Test successful ID token verification."""
        mock_id_token.verify_oauth2_token.return_value = {
            "iss": "accounts.google.com",
            "sub": "123456789",
            "email": "test@example.com",
            "name": "Test User"
        }
        
        service = GoogleOAuthService()
        payload = service.verify_id_token("valid_id_token")
        
        assert payload is not None
        assert payload["email"] == "test@example.com"
        assert payload["iss"] == "accounts.google.com"
    
    @patch('app.services.auth.google_oauth.id_token')
    def test_verify_id_token_invalid_issuer(self, mock_id_token):
        """Test ID token verification with invalid issuer."""
        mock_id_token.verify_oauth2_token.return_value = {
            "iss": "invalid-issuer.com",
            "sub": "123456789",
            "email": "test@example.com"
        }
        
        service = GoogleOAuthService()
        payload = service.verify_id_token("invalid_token")
        
        assert payload is None
    
    @patch('app.services.auth.google_oauth.id_token')
    def test_verify_id_token_exception(self, mock_id_token):
        """Test ID token verification with exception."""
        mock_id_token.verify_oauth2_token.side_effect = Exception("Invalid token")
        
        service = GoogleOAuthService()
        payload = service.verify_id_token("invalid_token")
        
        assert payload is None
    
    def test_singleton_instance(self):
        """Test that google_oauth_service is a singleton."""
        assert google_oauth_service is not None
        assert isinstance(google_oauth_service, GoogleOAuthService)
