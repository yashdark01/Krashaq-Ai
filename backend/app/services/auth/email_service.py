"""
Email service for sending verification and notification emails.
"""
from typing import Optional
from app.config import get_settings
from app.services.auth.jwt_service import create_access_token
from datetime import timedelta

settings = get_settings()


class EmailService:
    """Service for sending emails via SendGrid or Mailgun."""
    
    def __init__(self):
        self.provider = settings.email_provider if hasattr(settings, 'email_provider') else "sendgrid"
        self.api_key = settings.sendgrid_api_key if hasattr(settings, 'sendgrid_api_key') else ""
        self.from_email = settings.email_from if hasattr(settings, 'email_from') else "noreply@krashaq.com"
    
    def generate_verification_token(self, user_id: str, email: str) -> str:
        """
        Generate a verification token for email verification.
        
        Args:
            user_id: User ID
            email: User email
        
        Returns:
            JWT verification token
        """
        return create_access_token(
            data={"sub": user_id, "email": email, "type": "email_verification"},
            expires_delta=timedelta(hours=24)  # 24 hour expiry
        )
    
    def generate_password_reset_token(self, user_id: str, email: str) -> str:
        """
        Generate a password reset token.
        
        Args:
            user_id: User ID
            email: User email
        
        Returns:
            JWT reset token
        """
        return create_access_token(
            data={"sub": user_id, "email": email, "type": "password_reset"},
            expires_delta=timedelta(hours=1)  # 1 hour expiry
        )
    
    def send_verification_email(self, email: str, token: str, name: str = "User") -> bool:
        """
        Send verification email to user.
        
        Args:
            email: User email
            token: Verification token
            name: User name
        
        Returns:
            True if sent successfully
        """
        # In production, use SendGrid/Mailgun API
        # For now, just log the token
        print(f"[EMAIL] Verification email for {email}: Token={token}")
        
        # TODO: Implement actual email sending with SendGrid/Mailgun
        # Example SendGrid implementation:
        # from sendgrid import SendGridAPIClient
        # from sendgrid.helpers.mail import Mail
        # 
        # message = Mail(
        #     from_email=self.from_email,
        #     to_emails=email,
        #     subject="Verify your Krashaq account",
        #     html_content=self._get_verification_html(token, name),
        #     plain_text_content=self._get_verification_text(token, name)
        # )
        # 
        # try:
        #     sg = SendGridAPIClient(self.api_key)
        #     response = sg.send(message)
        #     return response.status_code == 202
        # except Exception as e:
        #     print(f"Error sending email: {e}")
        #     return False
        
        return True  # Return True for development
    
    def send_password_reset_email(self, email: str, token: str, name: str = "User") -> bool:
        """
        Send password reset email to user.
        
        Args:
            email: User email
            token: Reset token
            name: User name
        
        Returns:
            True if sent successfully
        """
        print(f"[EMAIL] Password reset email for {email}: Token={token}")
        
        # TODO: Implement actual email sending
        return True  # Return True for development
    
    def _get_verification_html(self, token: str, name: str) -> str:
        """Generate HTML content for verification email."""
        verification_url = f"{settings.frontend_url}/verify-email?token={token}"
        
        return f"""
        <html>
        <body style="font-family: Arial, sans-serif;">
            <h2>Welcome to Krashaq, {name}!</h2>
            <p>Thank you for signing up for Krashaq Farming Assistant.</p>
            <p>Please verify your email address by clicking the button below:</p>
            <a href="{verification_url}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email</a>
            <p>Or copy and paste this link into your browser:</p>
            <p>{verification_url}</p>
            <p>This link will expire in 24 hours.</p>
            <p>If you didn't create an account with Krashaq, please ignore this email.</p>
            <p>Best regards,<br>The Krashaq Team</p>
        </body>
        </html>
        """
    
    def _get_verification_text(self, token: str, name: str) -> str:
        """Generate plain text content for verification email."""
        verification_url = f"{settings.frontend_url}/verify-email?token={token}"
        
        return f"""
Welcome to Krashaq, {name}!

Thank you for signing up for Krashaq Farming Assistant.

Please verify your email address by visiting:
{verification_url}

This link will expire in 24 hours.

If you didn't create an account with Krashaq, please ignore this email.

Best regards,
The Krashaq Team
        """
    
    def _get_password_reset_html(self, token: str, name: str) -> str:
        """Generate HTML content for password reset email."""
        reset_url = f"{settings.frontend_url}/reset-password?token={token}"
        
        return f"""
        <html>
        <body style="font-family: Arial, sans-serif;">
            <h2>Password Reset Request</h2>
            <p>Hello {name},</p>
            <p>We received a request to reset your password for your Krashaq account.</p>
            <p>Click the button below to reset your password:</p>
            <a href="{reset_url}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
            <p>Or copy and paste this link into your browser:</p>
            <p>{reset_url}</p>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request a password reset, please ignore this email.</p>
            <p>Best regards,<br>The Krashaq Team</p>
        </body>
        </html>
        """
    
    def _get_password_reset_text(self, token: str, name: str) -> str:
        """Generate plain text content for password reset email."""
        reset_url = f"{settings.frontend_url}/reset-password?token={token}"
        
        return f"""
Password Reset Request

Hello {name},

We received a request to reset your password for your Krashaq account.

Visit this link to reset your password:
{reset_url}

This link will expire in 1 hour.

If you didn't request a password reset, please ignore this email.

Best regards,
The Krashaq Team
        """


# Singleton instance
email_service = EmailService()
