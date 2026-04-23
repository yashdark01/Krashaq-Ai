"""
Integration tests for authentication routes.
"""
import pytest
from fastapi.testclient import TestClient


@pytest.mark.integration
class TestAuthRoutes:
    """Test authentication route endpoints."""
    
    def test_signup_success(self, test_client: TestClient, test_user_data):
        """Test successful user signup."""
        response = test_client.post("/api/auth/signup", json=test_user_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert "user" in data
        assert data["user"]["email"] == test_user_data["email"]
        assert data["user"]["name"] == test_user_data["name"]
    
    def test_signup_duplicate_email(self, test_client: TestClient, test_user_data):
        """Test signup with duplicate email."""
        # First signup
        test_client.post("/api/auth/signup", json=test_user_data)
        
        # Second signup with same email
        response = test_client.post("/api/auth/signup", json=test_user_data)
        
        assert response.status_code == 400
        data = response.json()
        assert "detail" in data
        assert "already exists" in data["detail"].lower()
    
    def test_signup_missing_fields(self, test_client: TestClient):
        """Test signup with missing required fields."""
        response = test_client.post("/api/auth/signup", json={
            "email": "test@example.com"
            # Missing name, password
        })
        
        assert response.status_code == 422  # Validation error
    
    def test_email_login_success(self, test_client: TestClient, test_user_data):
        """Test successful email login."""
        # First signup
        signup_response = test_client.post("/api/auth/signup", json=test_user_data)
        assert signup_response.status_code == 200
        
        # Login
        login_response = test_client.post("/api/auth/login/email", json={
            "email": test_user_data["email"],
            "password": test_user_data["password"]
        })
        
        assert login_response.status_code == 200
        data = login_response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert "user" in data
    
    def test_email_login_invalid_credentials(self, test_client: TestClient):
        """Test login with invalid credentials."""
        response = test_client.post("/api/auth/login/email", json={
            "email": "nonexistent@example.com",
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data
    
    def test_email_login_wrong_password(self, test_client: TestClient, test_user_data):
        """Test login with wrong password."""
        # First signup
        test_client.post("/api/auth/signup", json=test_user_data)
        
        # Login with wrong password
        response = test_client.post("/api/auth/login/email", json={
            "email": test_user_data["email"],
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401
    
    def test_refresh_token_success(self, test_client: TestClient, test_user_data):
        """Test successful token refresh."""
        # Signup to get tokens
        signup_response = test_client.post("/api/auth/signup", json=test_user_data)
        tokens = signup_response.json()
        refresh_token = tokens["refresh_token"]
        
        # Refresh token
        response = test_client.post("/api/auth/refresh", json={
            "refresh_token": refresh_token
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        # New refresh token should be different
        assert data["refresh_token"] != refresh_token
    
    def test_refresh_token_invalid(self, test_client: TestClient):
        """Test refresh with invalid token."""
        response = test_client.post("/api/auth/refresh", json={
            "refresh_token": "invalid.token.here"
        })
        
        assert response.status_code == 401
    
    def test_refresh_token_revoked(self, test_client: TestClient, test_user_data):
        """Test refresh with revoked token."""
        # Signup
        signup_response = test_client.post("/api/auth/signup", json=test_user_data)
        tokens = signup_response.json()
        refresh_token = tokens["refresh_token"]
        
        # Logout (revokes token)
        test_client.post(f"/api/auth/logout?refresh_token={refresh_token}")
        
        # Try to refresh with revoked token
        response = test_client.post("/api/auth/refresh", json={
            "refresh_token": refresh_token
        })
        
        assert response.status_code == 401
    
    def test_logout_success(self, test_client: TestClient, test_user_data):
        """Test successful logout."""
        # Signup
        signup_response = test_client.post("/api/auth/signup", json=test_user_data)
        tokens = signup_response.json()
        refresh_token = tokens["refresh_token"]
        
        # Logout
        response = test_client.post(f"/api/auth/logout?refresh_token={refresh_token}")
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
    
    def test_get_current_user(self, test_client: TestClient, test_user_data, auth_headers):
        """Test getting current user profile."""
        # Signup
        test_client.post("/api/auth/signup", json=test_user_data)
        
        # Get current user
        response = test_client.get("/api/auth/me", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert "email" in data
        assert "name" in data
    
    def test_get_current_user_unauthorized(self, test_client: TestClient):
        """Test getting current user without auth."""
        response = test_client.get("/api/auth/me")
        
        assert response.status_code == 401
    
    def test_get_current_user_invalid_token(self, test_client: TestClient):
        """Test getting current user with invalid token."""
        headers = {"Authorization": "Bearer invalid.token.here"}
        response = test_client.get("/api/auth/me", headers=headers)
        
        assert response.status_code == 401
    
    def test_update_profile(self, test_client: TestClient, test_user_data, auth_headers):
        """Test updating user profile."""
        # Signup
        test_client.post("/api/auth/signup", json=test_user_data)
        
        # Update profile
        update_data = {
            "name": "Updated Name",
            "phone": "+1234567890"
        }
        response = test_client.put("/api/auth/me", json=update_data, headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Name"
        assert data["phone"] == "+1234567890"
    
    def test_update_profile_unauthorized(self, test_client: TestClient):
        """Test updating profile without auth."""
        response = test_client.put("/api/auth/me", json={"name": "Test"})
        
        assert response.status_code == 401
    
    def test_update_location(self, test_client: TestClient, test_user_data, auth_headers):
        """Test updating user location."""
        # Signup
        test_client.post("/api/auth/signup", json=test_user_data)
        
        # Update location
        location_data = {
            "state": "Maharashtra",
            "district": "Pune",
            "tehsil": "Pune",
            "locality": "Kothrud",
            "pincode": "411038"
        }
        response = test_client.put("/api/auth/me", json=location_data, headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["location"]["state"] == "Maharashtra"
        assert data["location"]["district"] == "Pune"
    
    def test_update_password_success(self, test_client: TestClient, test_user_data, auth_headers):
        """Test updating password successfully."""
        # Signup
        test_client.post("/api/auth/signup", json=test_user_data)
        
        # Update password
        response = test_client.put("/api/auth/me/password", json={
            "current_password": test_user_data["password"],
            "new_password": "NewPassword123!"
        }, headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
    
    def test_update_password_wrong_current(self, test_client: TestClient, test_user_data, auth_headers):
        """Test updating password with wrong current password."""
        # Signup
        test_client.post("/api/auth/signup", json=test_user_data)
        
        # Update password with wrong current password
        response = test_client.put("/api/auth/me/password", json={
            "current_password": "wrongpassword",
            "new_password": "NewPassword123!"
        }, headers=auth_headers)
        
        assert response.status_code == 401
    
    def test_update_password_unauthorized(self, test_client: TestClient):
        """Test updating password without auth."""
        response = test_client.put("/api/auth/me/password", json={
            "current_password": "old",
            "new_password": "new"
        })
        
        assert response.status_code == 401
    
    def test_google_login_success(self, test_client: TestClient):
        """Test Google OAuth login with valid code."""
        # Mock the Google OAuth service
        from unittest.mock import patch
        
        mock_tokens = {
            "access_token": "google_access_token",
            "refresh_token": "google_refresh_token"
        }
        mock_user_info = {
            "id": "123456789",
            "email": "google@example.com",
            "name": "Google User"
        }
        
        with patch('app.routes.auth.google_oauth_service.exchange_code_for_tokens', return_value=mock_tokens), \
             patch('app.routes.auth.google_oauth_service.get_user_info', return_value=mock_user_info):
            
            response = test_client.post("/api/auth/google/login", json={"code": "valid_code"})
            
            assert response.status_code == 200
            data = response.json()
            assert "user_info" in data
            assert "google_tokens" in data
    
    def test_google_login_invalid_code(self, test_client: TestClient):
        """Test Google OAuth login with invalid code."""
        from unittest.mock import patch
        
        with patch('app.routes.auth.google_oauth_service.exchange_code_for_tokens', return_value=None):
            response = test_client.post("/api/auth/google/login", json={"code": "invalid_code"})
            
            assert response.status_code == 400
    
    def test_register_oauth_user(self, test_client: TestClient):
        """Test completing registration for Google OAuth user."""
        register_data = {
            "email": "oauth@example.com",
            "name": "OAuth User",
            "state": "Delhi",
            "district": "New Delhi",
            "tehsil": "Connaught Place",
            "locality": "Rajiv Chowk",
            "pincode": "110001"
        }
        
        response = test_client.post("/api/auth/register", json=register_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["user"]["email"] == "oauth@example.com"
    
    def test_verify_2fa_endpoint(self, test_client: TestClient):
        """Test 2FA verification endpoint (simplified implementation)."""
        response = test_client.post("/api/auth/verify-2fa", json={
            "code": "123456",
            "session_token": "session_token"
        })
        
        # Currently returns success (simplified implementation)
        assert response.status_code == 200
