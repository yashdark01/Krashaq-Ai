from typing import Optional, Dict, Any
from google_auth_oauthlib.flow import Flow
from google.auth.transport import requests as google_requests
import requests
from app.common.config import get_settings

settings = get_settings()


class GoogleOAuthService:
    """Service for handling Google OAuth authentication."""
    
    def __init__(self):
        self.client_id = settings.google_client_id
        self.client_secret = settings.google_client_secret
        self.redirect_uri = settings.google_redirect_uri
    
    def get_authorization_url(self) -> str:
        """
        Generate the Google OAuth authorization URL.
        
        Returns:
            Authorization URL for Google OAuth
        """
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [self.redirect_uri]
                }
            },
            scopes=["openid", "email", "profile"]
        )
        
        flow.redirect_uri = self.redirect_uri
        authorization_url, state = flow.authorization_url(
            access_type="offline",
            include_granted_scopes="true"
        )
        
        return authorization_url
    
    def exchange_code_for_tokens(self, code: str) -> Optional[Dict[str, Any]]:
        """
        Exchange authorization code for access tokens.
        
        Args:
            code: Authorization code from Google OAuth callback
        
        Returns:
            Dictionary containing access token and refresh token, or None if failed
        """
        try:
            flow = Flow.from_client_config(
                {
                    "web": {
                        "client_id": self.client_id,
                        "client_secret": self.client_secret,
                        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                        "token_uri": "https://oauth2.googleapis.com/token",
                        "redirect_uris": [self.redirect_uri]
                    }
                },
                scopes=["openid", "email", "profile"]
            )
            
            flow.redirect_uri = self.redirect_uri
            flow.fetch_token(code=code)
            
            credentials = flow.credentials
            return {
                "access_token": credentials.token,
                "refresh_token": credentials.refresh_token,
                "token_uri": credentials.token_uri,
                "client_id": credentials.client_id,
                "client_secret": credentials.client_secret,
                "scopes": credentials.scopes
            }
        except Exception as e:
            print(f"Error exchanging code for tokens: {e}")
            return None
    
    def get_user_info(self, access_token: str) -> Optional[Dict[str, Any]]:
        """
        Fetch user information from Google using access token.
        
        Args:
            access_token: Google OAuth access token
        
        Returns:
            User information dictionary, or None if failed
        """
        try:
            response = requests.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            if response.status_code == 200:
                return response.json()
            return None
        except Exception as e:
            print(f"Error fetching user info: {e}")
            return None
    
    def verify_id_token(self, id_token: str) -> Optional[Dict[str, Any]]:
        """
        Verify and decode Google ID token.
        
        Args:
            id_token: Google ID token to verify
        
        Returns:
            Decoded token payload if valid, None otherwise
        """
        try:
            from google.oauth2 import id_token
            from google.auth.transport import requests as google_requests
            
            idinfo = id_token.verify_oauth2_token(
                id_token,
                google_requests.Request(),
                self.client_id
            )
            
            if idinfo["iss"] not in ["accounts.google.com", "https://accounts.google.com"]:
                return None
            
            return idinfo
        except Exception as e:
            print(f"Error verifying ID token: {e}")
            return None


# Singleton instance
google_oauth_service = GoogleOAuthService()
