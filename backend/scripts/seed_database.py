#!/usr/bin/env python3
"""
Seed MongoDB database with dummy data for testing.
"""

import sys
import os
import asyncio
import hashlib

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db.mongodb import connect_to_mongodb, close_mongodb_connection, get_collection
from datetime import datetime


def get_password_hash(password: str) -> str:
    """Simple password hashing for dummy data."""
    return hashlib.sha256(password.encode()).hexdigest()


async def seed_database():
    """Seed the MongoDB database with dummy data."""
    try:
        # Connect to MongoDB
        await connect_to_mongodb()
        
        # Get collections
        users_collection = get_collection("users")
        scheduler_configs_collection = get_collection("scheduler_configs")
        
        # Clear existing data
        await users_collection.delete_many({})
        await scheduler_configs_collection.delete_many({})
        print("✓ Cleared existing data")
        
        # Create admin user
        admin_user = {
            "email": "admin@krashaq.ai",
            "name": "Admin User",
            "password_hash": get_password_hash("admin123"),
            "phone": "9876543210",
            "role": "admin",
            "language": "en",
            "location": {
                "state": "Maharashtra",
                "district": "Pune",
                "tehsil": "Haveli",
                "locality": "Pune City",
                "pincode": "411001"
            },
            "is_active": True,
            "two_factor_enabled": False,
            "phone_verified": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        await users_collection.insert_one(admin_user)
        print(f"✓ Created admin user: admin@krashaq.ai / admin123")
        print(f"  Phone: 9876543210")
        print(f"  Language: en (English)")
        
        # Create farmer user with phone 7987386670
        farmer_user = {
            "email": "farmer@krashaq.ai",
            "name": "Test Farmer",
            "password_hash": get_password_hash("farmer123"),
            "phone": "7987386670",
            "role": "farmer",
            "language": "hi",
            "location": {
                "state": "Maharashtra",
                "district": "Pune",
                "tehsil": "Haveli",
                "locality": "Kothrud",
                "pincode": "411038"
            },
            "soil_moisture": 45,
            "crop": "wheat",
            "is_active": True,
            "two_factor_enabled": False,
            "phone_verified": False,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        await users_collection.insert_one(farmer_user)
        print(f"✓ Created farmer user: farmer@krashaq.ai / farmer123")
        print(f"  Phone: 7987386670")
        print(f"  Language: hi (Hindi)")
        print(f"  Soil Moisture: 45%")
        
        # Create supplier user
        supplier_user = {
            "email": "supplier@krashaq.ai",
            "name": "Test Supplier",
            "password_hash": get_password_hash("supplier123"),
            "phone": "8765432109",
            "role": "pestisides-supplier",
            "language": "en",
            "location": {
                "state": "Maharashtra",
                "district": "Mumbai",
                "tehsil": "Andheri",
                "locality": "Andheri West",
                "pincode": "400058"
            },
            "is_active": True,
            "two_factor_enabled": False,
            "phone_verified": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        await users_collection.insert_one(supplier_user)
        print(f"✓ Created supplier user: supplier@krashaq.ai / supplier123")
        print(f"  Phone: 8765432109")
        print(f"  Language: en (English)")
        print(f"  Role: pestisides-supplier")
        
        # Create scheduler config
        scheduler_config = {
            "job_name": "daily_irrigation_alerts",
            "schedule_type": "interval",
            "interval_minutes": 1,
            "enabled": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        await scheduler_configs_collection.insert_one(scheduler_config)
        print("✓ Created scheduler config: interval every 1 minute")
        
        print("\n" + "=" * 50)
        print("MONGODB DATABASE SEEDING COMPLETED SUCCESSFULLY")
        print("=" * 50)
        print("\nLogin Credentials:")
        print("  Admin: admin@krashaq.ai / admin123")
        print("  Farmer: farmer@krashaq.ai / farmer123")
        print("  Supplier: supplier@krashaq.ai / supplier123")
        print("\nUser Details:")
        print("  Admin Phone: 9876543210 (Role: admin, Language: en)")
        print("  Farmer Phone: 7987386670 (Role: farmer, Language: hi, Soil Moisture: 45%)")
        print("  Supplier Phone: 8765432109 (Role: pestisides-supplier, Language: en)")
        
    except Exception as e:
        print(f"✗ Error seeding database: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        await close_mongodb_connection()


if __name__ == "__main__":
    asyncio.run(seed_database())
