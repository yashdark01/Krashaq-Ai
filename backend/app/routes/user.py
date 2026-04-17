from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db import get_db
from app.models import Farmer

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
async def create_farmer(farmer: FarmerCreate, db: Session = Depends(get_db)):
    """
    Register a new farmer.
    """
    # Check if phone already exists
    existing = db.query(Farmer).filter(Farmer.phone == farmer.phone).first()
    if existing:
        raise HTTPException(status_code=400, detail="Phone number already registered")
    
    # Create new farmer
    db_farmer = Farmer(
        name=farmer.name,
        phone=farmer.phone,
        location=farmer.location
    )
    db.add(db_farmer)
    db.commit()
    db.refresh(db_farmer)
    
    return db_farmer


@router.get("/farmers", response_model=List[FarmerResponse])
async def get_farmers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    Get list of all farmers.
    """
    farmers = db.query(Farmer).offset(skip).limit(limit).all()
    return farmers


@router.get("/farmers/{farmer_id}", response_model=FarmerResponse)
async def get_farmer(farmer_id: int, db: Session = Depends(get_db)):
    """
    Get a specific farmer by ID.
    """
    farmer = db.query(Farmer).filter(Farmer.id == farmer_id).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")
    return farmer


@router.get("/farmers/phone/{phone}", response_model=FarmerResponse)
async def get_farmer_by_phone(phone: str, db: Session = Depends(get_db)):
    """
    Get a farmer by phone number.
    """
    farmer = db.query(Farmer).filter(Farmer.phone == phone).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")
    return farmer


@router.put("/farmers/{farmer_id}", response_model=FarmerResponse)
async def update_farmer(
    farmer_id: int,
    name: Optional[str] = None,
    location: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Update farmer information.
    """
    farmer = db.query(Farmer).filter(Farmer.id == farmer_id).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")
    
    if name:
        farmer.name = name
    if location:
        farmer.location = location
    
    db.commit()
    db.refresh(farmer)
    
    return farmer


@router.delete("/farmers/{farmer_id}")
async def delete_farmer(farmer_id: int, db: Session = Depends(get_db)):
    """
    Delete a farmer.
    """
    farmer = db.query(Farmer).filter(Farmer.id == farmer_id).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer not found")
    
    db.delete(farmer)
    db.commit()
    
    return {"message": "Farmer deleted successfully"}
