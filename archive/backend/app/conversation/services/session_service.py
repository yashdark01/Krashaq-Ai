"""
Session management service for Krashaq backend.
"""
import uuid
from typing import Optional, Dict, List
from datetime import datetime, timedelta
from app.common.db.mongodb import get_collection
from app.common.config import get_settings

settings = get_settings()


class SessionService:
    """Service for managing user sessions."""
    
    def __init__(self):
        self.session_ttl_days = 30  # 30 days of inactivity
        self.max_sessions_per_user = 5  # Max concurrent sessions
    
    async def create_session(
        self,
        user_id: str,
        device_info: Dict,
        ip_address: str,
        user_agent: str
    ) -> str:
        """
        Create a new session for a user.
        
        Args:
            user_id: User ID
            device_info: Device information (user_agent, platform, etc.)
            ip_address: IP address
            user_agent: User agent string
        
        Returns:
            Session ID
        """
        sessions_collection = get_collection("sessions")
        
        # Check session limit
        active_sessions = await sessions_collection.count_documents({
            "user_id": user_id,
            "is_active": True
        })
        
        if active_sessions >= self.max_sessions_per_user:
            # Revoke oldest session
            oldest_session = await sessions_collection.find_one(
                {"user_id": user_id, "is_active": True},
                sort=[("created_at", 1)]
            )
            if oldest_session:
                await self.revoke_session(oldest_session["_id"])
        
        # Generate session ID
        session_id = str(uuid.uuid4())
        
        # Create session
        session = {
            "_id": session_id,
            "user_id": user_id,
            "device_info": device_info,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "last_activity": datetime.utcnow(),
            "expires_at": datetime.utcnow() + timedelta(days=self.session_ttl_days)
        }
        
        await sessions_collection.insert_one(session)
        
        return session_id
    
    async def validate_session(self, session_id: str) -> Optional[Dict]:
        """
        Validate a session and update last activity.
        
        Args:
            session_id: Session ID
        
        Returns:
            Session data if valid, None otherwise
        """
        sessions_collection = get_collection("sessions")
        
        # Get session
        session = await sessions_collection.find_one({"_id": session_id})
        
        if not session:
            return None
        
        # Check if session is active
        if not session.get("is_active", False):
            return None
        
        # Check if session is expired
        if session.get("expires_at", datetime.utcnow()) < datetime.utcnow():
            await self.revoke_session(session_id)
            return None
        
        # Update last activity
        await sessions_collection.update_one(
            {"_id": session_id},
            {
                "$set": {
                    "last_activity": datetime.utcnow(),
                    "expires_at": datetime.utcnow() + timedelta(days=self.session_ttl_days)
                }
            }
        )
        
        return session
    
    async def revoke_session(self, session_id: str) -> bool:
        """
        Revoke a session.
        
        Args:
            session_id: Session ID
        
        Returns:
            True if revoked successfully
        """
        sessions_collection = get_collection("sessions")
        
        result = await sessions_collection.update_one(
            {"_id": session_id},
            {
                "$set": {
                    "is_active": False,
                    "revoked_at": datetime.utcnow()
                }
            }
        )
        
        return result.modified_count > 0
    
    async def revoke_all_sessions(self, user_id: str) -> int:
        """
        Revoke all sessions for a user.
        
        Args:
            user_id: User ID
        
        Returns:
            Number of sessions revoked
        """
        sessions_collection = get_collection("sessions")
        
        result = await sessions_collection.update_many(
            {"user_id": user_id, "is_active": True},
            {
                "$set": {
                    "is_active": False,
                    "revoked_at": datetime.utcnow()
                }
            }
        )
        
        return result.modified_count
    
    async def get_user_sessions(self, user_id: str) -> List[Dict]:
        """
        Get all active sessions for a user.
        
        Args:
            user_id: User ID
        
        Returns:
            List of active sessions
        """
        sessions_collection = get_collection("sessions")
        
        sessions = await sessions_collection.find(
            {"user_id": user_id, "is_active": True},
            projection={
                "device_info": 1,
                "ip_address": 1,
                "created_at": 1,
                "last_activity": 1
            }
        ).to_list(length=None)
        
        return sessions
    
    async def cleanup_expired_sessions(self) -> int:
        """
        Clean up expired sessions (should be run periodically).
        
        Returns:
            Number of sessions cleaned up
        """
        sessions_collection = get_collection("sessions")
        
        result = await sessions_collection.update_many(
            {
                "is_active": True,
                "expires_at": {"$lt": datetime.utcnow()}
            },
            {
                "$set": {
                    "is_active": False,
                    "revoked_at": datetime.utcnow()
                }
            }
        )
        
        return result.modified_count


# Singleton instance
session_service = SessionService()
