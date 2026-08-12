from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime
from passlib.context import CryptContext
import logging

from app.common.db.mongodb import get_collection
from app.common.middleware.auth import get_current_user, require_role
from app.admin.services.config_service import config_service
from app.scheduler.services.scheduler import reload_scheduler

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
logger = logging.getLogger(__name__)


# Pydantic models
class UserListResponse(BaseModel):
    id: int
    email: str
    name: str
    role: str
    is_active: bool
    created_at: str
    last_login: Optional[str]


class UserDetailResponse(BaseModel):
    id: int
    email: str
    name: str
    role: str
    is_active: bool
    phone: Optional[str]
    state: Optional[str]
    district: Optional[str]
    tehsil: Optional[str]
    locality: Optional[str]
    pincode: Optional[str]
    created_at: str
    last_login: Optional[str]


class ChangeRoleRequest(BaseModel):
    role: str  # admin, farmer, pestisides-supplier


class ActivateUserRequest(BaseModel):
    is_active: bool


class AuditLogResponse(BaseModel):
    id: int
    admin_user_id: int
    admin_user_name: str
    action: str
    target_type: str
    target_id: Optional[str]
    details: Optional[str]
    ip_address: Optional[str]
    created_at: str


class ConfigResponse(BaseModel):
    llm_provider: str
    ollama_base_url: str
    ollama_model: str
    weather_api_key: str
    twilio_account_sid: str
    twilio_whatsapp_number: str


class UpdateConfigRequest(BaseModel):
    llm_provider: Optional[str] = None
    ollama_base_url: Optional[str] = None
    ollama_model: Optional[str] = None
    weather_api_key: Optional[str] = None
    twilio_account_sid: Optional[str] = None
    twilio_auth_token: Optional[str] = None
    twilio_whatsapp_number: Optional[str] = None


class SchedulerConfigResponse(BaseModel):
    id: int
    job_name: str
    schedule_type: str
    interval_hours: Optional[int]
    hour: Optional[int]
    minute: Optional[int]
    enabled: bool
    last_run: Optional[str]
    next_run: Optional[str]
    created_at: str
    updated_at: str


class UpdateSchedulerConfigRequest(BaseModel):
    schedule_type: str  # hourly, daily, interval
    interval_hours: Optional[int] = None
    hour: Optional[int] = None
    minute: Optional[int] = None
    enabled: bool = True


async def log_audit(
    admin_user_id: str,
    action: str,
    target_type: str,
    target_id: Optional[str] = None,
    details: Optional[str] = None,
    ip_address: Optional[str] = None
):
    """Log an admin action to the audit log."""
    audit_logs_collection = get_collection("audit_logs")
    
    await audit_logs_collection.insert_one({
        "admin_user_id": admin_user_id,
        "action": action,
        "target_type": target_type,
        "target_id": target_id,
        "details": details,
        "ip_address": ip_address,
        "created_at": datetime.utcnow()
    })


@router.get("/users", response_model=List[Dict])
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_user: Dict = Depends(require_role(["admin"]))
):
    """
    List all users with pagination and filtering (admin only).
    """
    users_collection = get_collection("users")
    
    query = {}
    if role:
        query["role"] = role
    if is_active is not None:
        query["is_active"] = is_active
    
    users = await users_collection.find(query).skip(skip).limit(limit).to_list(length=None)
    
    return [
        {
            "id": u.get("_id"),
            "email": u.get("email"),
            "name": u.get("name"),
            "role": u.get("role"),
            "is_active": u.get("is_active", True),
            "created_at": u.get("created_at").isoformat() if u.get("created_at") else None,
            "last_login": u.get("last_login").isoformat() if u.get("last_login") else None
        }
        for u in users
    ]


@router.get("/users/{user_id}")
async def get_user(
    user_id: str,
    current_user: Dict = Depends(require_role(["admin"]))
):
    """
    Get detailed information about a specific user (admin only).
    """
    users_collection = get_collection("users")
    
    user = await users_collection.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "id": user.get("_id"),
        "email": user.get("email"),
        "name": user.get("name"),
        "role": user.get("role"),
        "is_active": user.get("is_active", True),
        "phone": user.get("phone"),
        "state": user.get("location", {}).get("state") if user.get("location") else None,
        "district": user.get("location", {}).get("district") if user.get("location") else None,
        "tehsil": user.get("location", {}).get("tehsil") if user.get("location") else None,
        "locality": user.get("location", {}).get("locality") if user.get("location") else None,
        "pincode": user.get("location", {}).get("pincode") if user.get("location") else None,
        "created_at": user.get("created_at").isoformat() if user.get("created_at") else None,
        "last_login": user.get("last_login").isoformat() if user.get("last_login") else None
    }


@router.put("/users/{user_id}/role")
async def change_user_role(
    user_id: str,
    request: ChangeRoleRequest,
    current_user: Dict = Depends(require_role(["admin"]))
):
    """
    Change a user's role (admin only).
    """
    # Validate role
    valid_roles = ["admin", "farmer", "pestisides-supplier"]
    if request.role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {valid_roles}"
        )
    
    users_collection = get_collection("users")
    
    user = await users_collection.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent changing own role
    if user.get("_id") == current_user.get("_id"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot change your own role"
        )
    
    old_role = user.get("role")
    
    await users_collection.update_one(
        {"_id": user_id},
        {"$set": {
            "role": request.role,
            "updated_at": datetime.utcnow()
        }}
    )
    
    # Log audit
    await log_audit(current_user.get("_id"), "user_role_changed", "user", user_id, 
                   f"Changed role from {old_role} to {request.role}")
    
    return {"message": "User role updated successfully"}


@router.put("/users/{user_id}/activate")
async def activate_user(
    user_id: str,
    request: ActivateUserRequest,
    current_user: Dict = Depends(require_role(["admin"]))
):
    """
    Activate or deactivate a user (admin only).
    """
    users_collection = get_collection("users")
    
    user = await users_collection.find_one({"_id": user_id})
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent deactivating self
    if user.get("_id") == current_user.get("_id") and not request.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate yourself"
        )
    
    await users_collection.update_one(
        {"_id": user_id},
        {"$set": {
            "is_active": request.is_active,
            "updated_at": datetime.utcnow()
        }}
    )
    
    # Log the action
    await log_audit(
        admin_user_id=current_user.get("_id"),
        action="user_activated" if request.is_active else "user_deactivated",
        target_type="user",
        target_id=user_id,
        details=f'User {"activated" if request.is_active else "deactivated"}'
    )
    
    return {"message": f"User {'activated' if request.is_active else 'deactivated'} successfully"}


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    current_user: Dict = Depends(require_role(["admin"]))
):
    """
    Delete a user (admin only).
    """
    users_collection = get_collection("users")
    
    user = await users_collection.find_one({"_id": user_id})
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent deleting self
    if user.get("_id") == current_user.get("_id"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete yourself"
        )
    
    user_email = user.get("email")
    await users_collection.delete_one({"_id": user_id})
    
    # Log the action
    await log_audit(
        admin_user_id=current_user.get("_id"),
        action="user_deleted",
        target_type="user",
        target_id=user_id,
        details=f'Deleted user: {user_email}'
    )
    
    return {"message": "User deleted successfully"}


@router.get("/audit-logs")
async def get_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    action: Optional[str] = None,
    target_type: Optional[str] = None,
    current_user: Dict = Depends(require_role(["admin"]))
):
    """
    Get audit logs (admin only).
    """
    audit_logs_collection = get_collection("audit_logs")
    users_collection = get_collection("users")
    
    query = {}
    if action:
        query["action"] = action
    if target_type:
        query["target_type"] = target_type
    
    logs = await audit_logs_collection.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(length=None)
    
    # Enrich with admin user names
    result = []
    for log in logs:
        admin_user = await users_collection.find_one({"_id": log.get("admin_user_id")})
        admin_name = admin_user.get("name") if admin_user else "Unknown"
        
        result.append({
            "id": log.get("_id"),
            "admin_user_id": log.get("admin_user_id"),
            "admin_user_name": admin_name,
            "action": log.get("action"),
            "target_type": log.get("target_type"),
            "target_id": log.get("target_id"),
            "details": log.get("details"),
            "ip_address": log.get("ip_address"),
            "created_at": log.get("created_at").isoformat() if log.get("created_at") else None
        })
    
    return result


@router.get("/users/search")
async def search_users(
    q: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: Dict = Depends(require_role(["admin"]))
):
    """
    Search users by name, email, or phone (admin only).
    """
    users_collection = get_collection("users")
    
    query = {
        "$or": [
            {"name": {"$regex": q, "$options": "i"}},
            {"email": {"$regex": q, "$options": "i"}},
            {"phone": {"$regex": q, "$options": "i"}}
        ]
    }
    
    users = await users_collection.find(query).skip(skip).limit(limit).to_list(length=None)
    
    return [
        {
            "id": u.get("_id"),
            "email": u.get("email"),
            "name": u.get("name"),
            "role": u.get("role"),
            "is_active": u.get("is_active", True),
            "phone": u.get("phone"),
            "created_at": u.get("created_at").isoformat() if u.get("created_at") else None
        }
        for u in users
    ]


@router.get("/users/stats")
async def get_user_stats(current_user: Dict = Depends(require_role(["admin"]))):
    """
    Get user statistics (admin only).
    """
    users_collection = get_collection("users")
    messages_collection = get_collection("messages")
    
    total_users = await users_collection.count_documents({})
    active_users = await users_collection.count_documents({"is_active": True})
    verified_users = await users_collection.count_documents({"email_verified": True})
    
    # Count by role
    admin_count = await users_collection.count_documents({"role": "admin"})
    farmer_count = await users_collection.count_documents({"role": "farmer"})
    supplier_count = await users_collection.count_documents({"role": "pestisides-supplier"})
    
    # Count users created in last 30 days
    from datetime import timedelta
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    new_users = await users_collection.count_documents({"created_at": {"$gte": thirty_days_ago}})
    
    return {
        "total_users": total_users,
        "active_users": active_users,
        "verified_users": verified_users,
        "unverified_users": total_users - verified_users,
        "by_role": {
            "admin": admin_count,
            "farmer": farmer_count,
            "pestisides-supplier": supplier_count
        },
        "new_users_last_30_days": new_users
    }


@router.post("/users/{user_id}/ban")
async def ban_user(
    user_id: str,
    current_user: Dict = Depends(require_role(["admin"]))
):
    """
    Ban a user (admin only).
    """
    users_collection = get_collection("users")
    
    user = await users_collection.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Prevent banning self
    if user.get("_id") == current_user.get("_id"):
        raise HTTPException(status_code=400, detail="Cannot ban yourself")
    
    await users_collection.update_one(
        {"_id": user_id},
        {"$set": {
            "is_active": False,
            "banned": True,
            "banned_at": datetime.utcnow(),
            "banned_by": current_user.get("_id"),
            "updated_at": datetime.utcnow()
        }}
    )
    
    # Log the action
    await log_audit(
        admin_user_id=current_user.get("_id"),
        action="user_banned",
        target_type="user",
        target_id=user_id,
        details=f"Banned user: {user.get('email')}"
    )
    
    return {"message": "User banned successfully"}


@router.post("/users/{user_id}/unban")
async def unban_user(
    user_id: str,
    current_user: Dict = Depends(require_role(["admin"]))
):
    """
    Unban a user (admin only).
    """
    users_collection = get_collection("users")
    
    user = await users_collection.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await users_collection.update_one(
        {"_id": user_id},
        {"$set": {
            "is_active": True,
            "banned": False,
            "unbanned_at": datetime.utcnow(),
            "unbanned_by": current_user.get("_id"),
            "updated_at": datetime.utcnow()
        }}
    )
    
    # Log the action
    await log_audit(
        admin_user_id=current_user.get("_id"),
        action="user_unbanned",
        target_type="user",
        target_id=user_id,
        details=f"Unbanned user: {user.get('email')}"
    )
    
    return {"message": "User unbanned successfully"}


@router.get("/dashboard")
async def get_dashboard(
    days: int = Query(30, ge=1, le=90),
    current_user: Dict = Depends(require_role(["admin"]))
):
    """
    Get admin analytics dashboard data (admin only).
    """
    users_collection = get_collection("users")
    messages_collection = get_collection("messages")
    
    from datetime import timedelta
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # User metrics
    total_users = await users_collection.count_documents({})
    active_users = await users_collection.count_documents({"is_active": True})
    new_users = await users_collection.count_documents({"created_at": {"$gte": start_date}})
    
    # Chat metrics
    total_messages = await messages_collection.count_documents({"created_at": {"$gte": start_date}})
    user_messages = await messages_collection.count_documents({"message_type": "user", "created_at": {"$gte": start_date}})
    assistant_messages = await messages_collection.count_documents({"message_type": "assistant", "created_at": {"$gte": start_date}})
    
    # LLM metrics
    from app.services.metrics import get_metrics_service
    metrics_service = get_metrics_service()
    llm_metrics = metrics_service.get_metrics()
    
    # Tool usage
    tool_usage = {}
    messages_with_tools = await messages_collection.find({"tools_used": {"$exists": True, "$ne": []}, "created_at": {"$gte": start_date}}).to_list(length=None)
    for msg in messages_with_tools:
        for tool in msg.get("tools_used", []):
            tool_usage[tool] = tool_usage.get(tool, 0) + 1
    
    # Response time metrics
    response_times = []
    for msg in messages_with_tools:
        if "response_time" in msg:
            response_times.append(msg["response_time"])
    
    avg_response_time = sum(response_times) / len(response_times) if response_times else 0
    
    # Error rate
    failed_messages = await messages_collection.count_documents({"status": "failed", "created_at": {"$gte": start_date}})
    error_rate = (failed_messages / total_messages * 100) if total_messages > 0 else 0
    
    # Daily user growth
    daily_growth = []
    for i in range(min(7, days)):
        day_start = datetime.utcnow() - timedelta(days=i+1)
        day_end = datetime.utcnow() - timedelta(days=i)
        count = await users_collection.count_documents({"created_at": {"$gte": day_start, "$lt": day_end}})
        daily_growth.append({"date": day_start.date().isoformat(), "count": count})
    
    return {
        "period": {
            "start_date": start_date.isoformat(),
            "end_date": datetime.utcnow().isoformat(),
            "days": days
        },
        "users": {
            "total": total_users,
            "active": active_users,
            "new": new_users,
            "growth_rate": (new_users / total_users * 100) if total_users > 0 else 0
        },
        "chat": {
            "total_messages": total_messages,
            "user_messages": user_messages,
            "assistant_messages": assistant_messages,
            "avg_messages_per_user": (total_messages / active_users) if active_users > 0 else 0
        },
        "llm": {
            "total_requests": llm_metrics.get("total_requests", 0),
            "success_rate": llm_metrics.get("success_rate", 0),
            "avg_response_time": llm_metrics.get("avg_response_time", 0),
            "cache_hit_rate": llm_metrics.get("cache_hit_rate", 0)
        },
        "tools": {
            "usage": tool_usage,
            "most_used": max(tool_usage, key=tool_usage.get) if tool_usage else None
        },
        "performance": {
            "avg_response_time": avg_response_time,
            "error_rate": error_rate
        },
        "daily_user_growth": list(reversed(daily_growth))
    }


@router.get("/health")
async def get_system_health(current_user: Dict = Depends(require_role(["admin"]))):
    """
    Get system health monitoring data (admin only).
    """
    import psutil
    import time
    from app.common.db.mongodb import get_client
    from app.common.config import get_settings
    
    settings = get_settings()
    
    # MongoDB health check
    mongodb_status = "healthy"
    mongodb_latency = 0
    try:
        start_time = time.time()
        client = get_client()
        await client.admin.command('ping')
        mongodb_latency = (time.time() - start_time) * 1000
    except Exception as e:
        mongodb_status = "unhealthy"
        logger.error(f"MongoDB health check failed: {e}")
    
    # Redis health check
    redis_status = "healthy"
    redis_latency = 0
    try:
        import redis
        start_time = time.time()
        r = redis.from_url(settings.redis_url)
        r.ping()
        redis_latency = (time.time() - start_time) * 1000
    except Exception as e:
        redis_status = "unhealthy"
        logger.error(f"Redis health check failed: {e}")
    
    # LLM provider health check
    llm_status = "healthy"
    try:
        from app.services.llm_provider import get_available_providers
        available = get_available_providers()
        if not available:
            llm_status = "unhealthy"
    except Exception as e:
        llm_status = "unhealthy"
        logger.error(f"LLM provider health check failed: {e}")
    
    # Twilio health check
    twilio_status = "healthy"
    try:
        from twilio.rest import Client
        client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        # Try to get account info
        client.api.accounts(settings.twilio_account_sid).fetch()
    except Exception as e:
        twilio_status = "unhealthy"
        logger.error(f"Twilio health check failed: {e}")
    
    # System metrics
    cpu_percent = psutil.cpu_percent(interval=1)
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    
    # Process uptime
    uptime = time.time() - psutil.Process().create_time()
    
    return {
        "status": "healthy" if all([
            mongodb_status == "healthy",
            redis_status == "healthy",
            llm_status == "healthy"
        ]) else "degraded",
        "timestamp": datetime.utcnow().isoformat(),
        "uptime_seconds": uptime,
        "services": {
            "mongodb": {
                "status": mongodb_status,
                "latency_ms": round(mongodb_latency, 2)
            },
            "redis": {
                "status": redis_status,
                "latency_ms": round(redis_latency, 2)
            },
            "llm_provider": {
                "status": llm_status,
                "current_provider": settings.llm_provider
            },
            "twilio": {
                "status": twilio_status
            }
        },
        "system": {
            "cpu_percent": cpu_percent,
            "memory": {
                "total_gb": round(memory.total / (1024**3), 2),
                "used_gb": round(memory.used / (1024**3), 2),
                "available_gb": round(memory.available / (1024**3), 2),
                "percent": memory.percent
            },
            "disk": {
                "total_gb": round(disk.total / (1024**3), 2),
                "used_gb": round(disk.used / (1024**3), 2),
                "free_gb": round(disk.free / (1024**3), 2),
                "percent": disk.percent
            }
        },
        "alerts": []
    }


@router.get("/moderation/flagged")
async def get_flagged_content(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status: Optional[str] = None,
    current_user: Dict = Depends(require_role(["admin"]))
):
    """
    Get flagged content for moderation review (admin only).
    """
    messages_collection = get_collection("messages")
    
    query = {"flagged": True, "deleted": {"$ne": True}}
    if status:
        query["moderation_status"] = status
    
    flagged = await messages_collection.find(query).sort("flagged_at", -1).skip(skip).limit(limit).to_list(length=None)
    
    return [
        {
            "id": m.get("_id"),
            "user_id": m.get("user_id"),
            "session_id": m.get("session_id"),
            "message": m.get("message"),
            "message_type": m.get("message_type"),
            "flagged_at": m.get("flagged_at").isoformat() if m.get("flagged_at") else None,
            "flagged_reason": m.get("flagged_reason"),
            "moderation_status": m.get("moderation_status", "pending"),
            "moderated_at": m.get("moderated_at").isoformat() if m.get("moderated_at") else None,
            "moderated_by": m.get("moderated_by")
        }
        for m in flagged
    ]


@router.post("/moderation/flag")
async def flag_content(
    message_id: str,
    reason: str,
    current_user: Dict = Depends(require_role(["admin"]))
):
    """
    Flag a message for moderation (admin only).
    """
    messages_collection = get_collection("messages")
    
    message = await messages_collection.find_one({"_id": message_id})
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    await messages_collection.update_one(
        {"_id": message_id},
        {"$set": {
            "flagged": True,
            "flagged_at": datetime.utcnow(),
            "flagged_by": current_user.get("_id"),
            "flagged_reason": reason,
            "moderation_status": "pending",
            "updated_at": datetime.utcnow()
        }}
    )
    
    # Log the action
    await log_audit(
        admin_user_id=current_user.get("_id"),
        action="content_flagged",
        target_type="message",
        target_id=message_id,
        details=f"Flagged message: {reason}"
    )
    
    return {"message": "Content flagged successfully"}


@router.put("/moderation/review")
async def review_content(
    message_id: str,
    action: str,  # approve, reject, delete
    notes: Optional[str] = None,
    current_user: Dict = Depends(require_role(["admin"]))
):
    """
    Review flagged content (admin only).
    """
    messages_collection = get_collection("messages")
    
    message = await messages_collection.find_one({"_id": message_id})
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    valid_actions = ["approve", "reject", "delete"]
    if action not in valid_actions:
        raise HTTPException(status_code=400, detail=f"Invalid action. Must be one of: {valid_actions}")
    
    update_data = {
        "moderation_status": action,
        "moderated_at": datetime.utcnow(),
        "moderated_by": current_user.get("_id"),
        "moderation_notes": notes,
        "updated_at": datetime.utcnow()
    }
    
    if action == "delete":
        update_data["deleted"] = True
        update_data["deleted_at"] = datetime.utcnow()
    elif action == "reject":
        update_data["flagged"] = False
    
    await messages_collection.update_one({"_id": message_id}, {"$set": update_data})
    
    # Log the action
    await log_audit(
        admin_user_id=current_user.get("_id"),
        action=f"content_{action}",
        target_type="message",
        target_id=message_id,
        details=f"Moderated content: {action}"
    )
    
    return {"message": f"Content {action}ed successfully"}


@router.get("/config")
async def get_config(
    current_user: Dict = Depends(require_role(["admin"]))
):
    """
    Get system configuration (admin only).
    """
    config = config_service.get_config()
    return config


@router.put("/config")
async def update_config(
    request: UpdateConfigRequest,
    current_user: Dict = Depends(require_role(["admin"]))
):
    """
    Update system configuration (admin only).
    """
    # Build update dict with only provided fields
    updates = {}
    if request.llm_provider is not None:
        updates["llm_provider"] = request.llm_provider
    if request.ollama_base_url is not None:
        updates["ollama_base_url"] = request.ollama_base_url
    if request.ollama_model is not None:
        updates["ollama_model"] = request.ollama_model
    if request.weather_api_key is not None:
        updates["weather_api_key"] = request.weather_api_key
    if request.twilio_account_sid is not None:
        updates["twilio_account_sid"] = request.twilio_account_sid
    if request.twilio_auth_token is not None:
        updates["twilio_auth_token"] = request.twilio_auth_token
    if request.twilio_whatsapp_number is not None:
        updates["twilio_whatsapp_number"] = request.twilio_whatsapp_number
    
    # Validate and update configuration
    config_service.update_config(updates)
    
    # Log the action
    await log_audit(
        admin_user_id=current_user.get("_id"),
        action="config_updated",
        target_type="config",
        details=f"Updated configuration keys: {', '.join(updates.keys())}"
    )
    
    return {"message": "Configuration updated successfully"}


@router.get("/scheduler/configs")
async def get_scheduler_configs(
    current_user: Dict = Depends(require_role(["admin"]))
):
    """
    Get all scheduler configurations (admin only).
    """
    scheduler_configs_collection = get_collection("scheduler_configs")
    
    configs = await scheduler_configs_collection.find().to_list(length=None)
    
    return [
        {
            "id": config.get("_id"),
            "job_name": config.get("job_name"),
            "schedule_type": config.get("schedule_type"),
            "interval_hours": config.get("interval_hours"),
            "hour": config.get("hour"),
            "minute": config.get("minute"),
            "enabled": config.get("enabled"),
            "last_run": config.get("last_run").isoformat() if config.get("last_run") else None,
            "next_run": config.get("next_run").isoformat() if config.get("next_run") else None,
            "created_at": config.get("created_at").isoformat() if config.get("created_at") else "",
            "updated_at": config.get("updated_at").isoformat() if config.get("updated_at") else ""
        }
        for config in configs
    ]


@router.put("/scheduler/configs/{config_id}")
async def update_scheduler_config(
    config_id: str,
    request: UpdateSchedulerConfigRequest,
    current_user: Dict = Depends(require_role(["admin"]))
):
    """
    Update a scheduler configuration (admin only).
    """
    scheduler_configs_collection = get_collection("scheduler_configs")
    
    # Validate schedule_type
    valid_types = ["hourly", "daily", "interval"]
    if request.schedule_type not in valid_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid schedule_type. Must be one of: {valid_types}"
        )
    
    config = await scheduler_configs_collection.find_one({"_id": config_id})
    if not config:
        raise HTTPException(status_code=404, detail="Scheduler config not found")
    
    # Build update data
    update_data = {
        "schedule_type": request.schedule_type,
        "interval_hours": request.interval_hours,
        "hour": request.hour,
        "minute": request.minute,
        "enabled": request.enabled,
        "updated_at": datetime.utcnow()
    }
    
    await scheduler_configs_collection.update_one(
        {"_id": config_id},
        {"$set": update_data}
    )
    
    # Log the action
    await log_audit(
        admin_user_id=current_user.get("_id"),
        action="scheduler_config_updated",
        target_type="scheduler_config",
        target_id=config_id,
        details=f"Updated scheduler config: {config.get('job_name')}"
    )
    
    # Reload scheduler to apply changes
    await reload_scheduler()
    
    return {"message": "Scheduler configuration updated successfully"}


@router.post("/scheduler/configs/{config_id}/trigger")
async def trigger_scheduler_job(
    config_id: str,
    current_user: Dict = Depends(require_role(["admin"]))
):
    """
    Manually trigger a scheduler job (admin only).
    """
    scheduler_configs_collection = get_collection("scheduler_configs")
    
    config = await scheduler_configs_collection.find_one({"_id": config_id})
    
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scheduler configuration not found"
        )
    
    # Import the job function based on job_name
    if config.get("job_name") == "daily_irrigation_alerts":
        from app.scheduler import send_daily_irrigation_alerts_sync
        # Run the job
        send_daily_irrigation_alerts_sync()
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown job: {config.get('job_name')}"
        )
    
    # Log the action
    await log_audit(
        admin_user_id=current_user.get("_id"),
        action="scheduler_job_triggered",
        target_type="scheduler_config",
        target_id=config_id,
        details=f"Manually triggered job: {config.get('job_name')}"
    )
    
    return {"message": f"Job '{config.get('job_name')}' triggered successfully"}
