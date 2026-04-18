from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from typing import Optional, List, Dict
from datetime import datetime
from passlib.context import CryptContext
import logging

from app.db.mongodb import get_collection
from app.middleware.auth import get_current_user, require_role
from app.services.config_service import config_service
from app.scheduler import reload_scheduler

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
