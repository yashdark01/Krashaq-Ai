from fastapi import APIRouter, Query
from typing import Optional
import json
import os

router = APIRouter()

# Load location data
LOCATIONS_FILE = os.path.join(os.path.dirname(__file__), "..", "config", "locations.json")

def load_locations():
    """Load location data from JSON file."""
    try:
        with open(LOCATIONS_FILE, "r") as f:
            return json.load(f)
    except FileNotFoundError:
        return {"districts": []}

@router.get("/states")
async def get_states():
    """
    Get list of all states from location data.
    """
    data = load_locations()
    states = set()
    for district in data.get("districts", []):
        if district.get("state"):
            states.add(district["state"])
    
    return {
        "states": sorted(list(states))
    }

@router.get("/districts")
async def get_districts(state: str = Query(...)):
    """
    Get list of districts for a given state.
    """
    data = load_locations()
    districts = []
    
    for district in data.get("districts", []):
        if district.get("state") == state:
            districts.append({
                "id": district.get("id"),
                "name": district.get("name"),
                "district_code": district.get("district_code"),
                "headquarters": district.get("headquarters"),
                "total_tehsils": district.get("total_tehsils", 0)
            })
    
    return {
        "districts": districts
    }

@router.get("/tehsils")
async def get_tehsils(
    state: str = Query(...),
    district: str = Query(...)
):
    """
    Get list of tehsils for a given district.
    """
    data = load_locations()
    tehsils = []
    
    for dist_data in data.get("districts", []):
        if dist_data.get("state") == state and dist_data.get("name") == district:
            for tehsil in dist_data.get("tehsils", []):
                tehsils.append({
                    "id": tehsil.get("id"),
                    "name": tehsil.get("name"),
                    "headquarters": tehsil.get("headquarters"),
                    "primary_pincode": tehsil.get("primary_pincode"),
                    "total_localities": len(tehsil.get("localities", []))
                })
            break
    
    return {
        "tehsils": tehsils
    }

@router.get("/localities")
async def get_localities(
    state: str = Query(...),
    district: str = Query(...),
    tehsil: str = Query(...)
):
    """
    Get list of localities for a given tehsil.
    """
    data = load_locations()
    localities = []
    
    for dist_data in data.get("districts", []):
        if dist_data.get("state") == state and dist_data.get("name") == district:
            for tehsil_data in dist_data.get("tehsils", []):
                if tehsil_data.get("name") == tehsil:
                    for locality in tehsil_data.get("localities", []):
                        localities.append({
                            "name": locality.get("name"),
                            "type": locality.get("type"),
                            "pincode": locality.get("pincode")
                        })
                    break
            break
    
    return {
        "localities": localities
    }
