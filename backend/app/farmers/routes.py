from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import uuid
from datetime import datetime

from app.common.db.mongodb import get_collection

router = APIRouter()


class FarmerCreate(BaseModel):
    name: str
    phone: str
    location: Optional[str] = None


class FarmerResponse(BaseModel):
    id: int
    name: str
    phone: str
    location: Optional[str]
    
    class Config:
        orm_mode = True


@router.post("/farmers", response_model=FarmerResponse)
async def create_farmer(farmer: FarmerCreate):
    """
    Register a new farmer.
    """
    users_collection = get_collection("users")
    
    # Check if phone already exists
    existing = await users_collection.find_one({"phone": farmer.phone})
    if existing:
        raise HTTPException(status_code=400, detail="Phone number already registered")
    
    # Generate user ID
    user_id = str(uuid.uuid4())
    
    # Create new farmer (user with farmer role)
    new_farmer = {
        "_id": user_id,
        "name": farmer.name,
        "phone": farmer.phone,
        "role": "farmer",
        "language": "hi",
        "location": {
            "state": None,
            "district": None,
            "tehsil": None,
            "locality": farmer.location,
            "pincode": None
        },
        "is_active": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await users_collection.insert_one(new_farmer)
    
    return {
        "id": user_id,
        "name": farmer.name,
        "phone": farmer.phone,
        "location": farmer.location
    }


@router.get("/farmers", response_model=List[FarmerResponse])
async def get_farmers(skip: int = 0, limit: int = 100):
    """
    Get list of all farmers.
    """
    users_collection = get_collection("users")
    
    farmers = await users_collection.find({"role": "farmer"}).skip(skip).limit(limit).to_list(length=None)
    
    return [
        {
            "id": f.get("_id"),
            "name": f.get("name"),
            "phone": f.get("phone"),
            "location": f.get("location", {}).get("locality") if f.get("location") else None
        }
        for f in farmers
    ]


@router.get("/farmers/{farmer_id}", response_model=FarmerResponse)
async def get_farmer(farmer_id: str):
    """
    Get a specific farmer by ID.
    """
    users_collection = get_collection("users")
    
    farmer = await users_collection.find_one({"_id": farmer_id, "role": "farmer"})
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")
    
    return {
        "id": farmer.get("_id"),
        "name": farmer.get("name"),
        "phone": farmer.get("phone"),
        "location": farmer.get("location", {}).get("locality") if farmer.get("location") else None
    }


@router.get("/farmers/phone/{phone}", response_model=FarmerResponse)
async def get_farmer_by_phone(phone: str):
    """
    Get a farmer by phone number.
    """
    users_collection = get_collection("users")
    
    farmer = await users_collection.find_one({"phone": phone, "role": "farmer"})
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")
    
    return {
        "id": farmer.get("_id"),
        "name": farmer.get("name"),
        "phone": farmer.get("phone"),
        "location": farmer.get("location", {}).get("locality") if farmer.get("location") else None
    }


@router.put("/farmers/{farmer_id}", response_model=FarmerResponse)
async def update_farmer(
    farmer_id: str,
    name: Optional[str] = None,
    location: Optional[str] = None
):
    """
    Update a farmer's information.
    """
    users_collection = get_collection("users")
    
    farmer = await users_collection.find_one({"_id": farmer_id, "role": "farmer"})
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")
    
    update_data = {}
    if name:
        update_data["name"] = name
    if location:
        current_location = farmer.get("location", {})
        current_location["locality"] = location
        update_data["location"] = current_location
    
    if update_data:
        update_data["updated_at"] = datetime.utcnow()
        await users_collection.update_one(
            {"_id": farmer_id},
            {"$set": update_data}
        )
    
    # Fetch updated farmer
    updated_farmer = await users_collection.find_one({"_id": farmer_id})
    
    return {
        "id": updated_farmer.get("_id"),
        "name": updated_farmer.get("name"),
        "phone": updated_farmer.get("phone"),
        "location": updated_farmer.get("location", {}).get("locality") if updated_farmer.get("location") else None
    }


@router.delete("/farmers/{farmer_id}")
async def delete_farmer(farmer_id: str):
    """
    Delete a farmer.
    """
    users_collection = get_collection("users")
    
    result = await users_collection.delete_one({"_id": farmer_id, "role": "farmer"})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Farmer not found")
    
    return {"message": "Farmer deleted successfully"}
