"""
MongoDB database connection module using Motor (async driver).
"""

import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# MongoDB connection
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
MONGODB_DB = os.getenv("MONGODB_DB", "krashaq")

# Global MongoDB client
client: AsyncIOMotorClient = None
database = None


async def connect_to_mongodb():
    """
    Connect to MongoDB and initialize the database.
    """
    global client, database
    
    try:
        client = AsyncIOMotorClient(MONGODB_URL)
        database = client[MONGODB_DB]
        
        # Test connection
        await client.admin.command('ping')
        print(f"✓ Connected to MongoDB: {MONGODB_DB}")
        
    except Exception as e:
        print(f"✗ Failed to connect to MongoDB: {str(e)}")
        raise


async def close_mongodb_connection():
    """
    Close MongoDB connection.
    """
    global client
    if client:
        client.close()
        print("✓ MongoDB connection closed")


def get_database():
    """
    Get the MongoDB database instance.
    """
    if database is None:
        raise RuntimeError("MongoDB not connected. Call connect_to_mongodb() first.")
    return database


def get_collection(collection_name: str):
    """
    Get a MongoDB collection.
    
    Args:
        collection_name: Name of the collection
    
    Returns:
        MongoDB collection
    """
    db = get_database()
    return db[collection_name]
