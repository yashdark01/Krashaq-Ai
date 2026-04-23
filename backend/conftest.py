"""
Pytest configuration and fixtures for Krashaq backend tests.
"""
import asyncio
import pytest
from typing import AsyncGenerator, Generator
from unittest.mock import AsyncMock, MagicMock
from fastapi.testclient import TestClient
from mongomock import MongoClient as MockMongoClient
import redis
from faker import Faker

from app.main import app
from app.db.mongodb import connect_to_mongodb, close_mongodb_connection, get_collection


# Faker instance for test data
fake = Faker()


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="function")
def mock_mongodb() -> Generator:
    """Mock MongoDB client for testing."""
    client = MockMongoClient()
    db = client["krashaq_test"]
    
    # Override the get_collection function to use mock database
    original_get_collection = get_collection
    
    def mock_get_collection(collection_name: str):
        return db[collection_name]
    
    # Monkey patch the get_collection function
    import app.db.mongodb
    app.db.mongodb.get_collection = mock_get_collection
    
    yield db
    
    # Cleanup
    client.drop_database("krashaq_test")
    app.db.mongodb.get_collection = original_get_collection


@pytest.fixture(scope="function")
def mock_redis() -> Generator:
    """Mock Redis client for testing."""
    # Use fakeredis for testing or mock the redis client
    try:
        import fakeredis
        client = fakeredis.FakeStrictRedis()
    except ImportError:
        # Fallback to mock if fakeredis not available
        client = MagicMock()
    
    yield client


@pytest.fixture(scope="function")
def test_client() -> Generator:
    """Create a test client for FastAPI app."""
    with TestClient(app) as client:
        yield client


@pytest.fixture(scope="function")
def auth_token(mock_mongodb) -> str:
    """Generate a valid auth token for testing."""
    from app.services.auth.jwt_service import create_access_token
    from datetime import timedelta
    
    # Create a test user
    users_collection = mock_mongodb["users"]
    test_user = {
        "_id": "test_user_id",
        "email": "test@example.com",
        "name": "Test User",
        "role": "admin",
        "language": "en"
    }
    users_collection.insert_one(test_user)
    
    # Create token
    token = create_access_token(
        data={"sub": test_user["_id"], "email": test_user["email"]},
        expires_delta=timedelta(minutes=30)
    )
    
    return token


@pytest.fixture(scope="function")
def auth_headers(auth_token: str) -> dict:
    """Generate auth headers for API requests."""
    return {"Authorization": f"Bearer {auth_token}"}


@pytest.fixture(scope="function")
def test_user_data():
    """Generate test user data."""
    return {
        "email": fake.email(),
        "name": fake.name(),
        "password": "TestPassword123!",
        "phone": fake.phone_number(),
        "location": {
            "state": "Madhya Pradesh",
            "district": "Bhopal",
            "tehsil": "Bhopal",
            "locality": "TT Nagar",
            "pincode": "462003"
        }
    }


@pytest.fixture(scope="function")
def test_farmer_data():
    """Generate test farmer data."""
    return {
        "name": fake.name(),
        "phone": fake.phone_number(),
        "location": {
            "state": "Maharashtra",
            "district": "Pune",
            "tehsil": "Pune",
            "locality": "Kothrud",
            "pincode": "411038"
        },
        "language": "hi",
        "soil_moisture": 45,
        "role": "farmer"
    }


@pytest.fixture(scope="function")
def mock_llm_response():
    """Mock LLM response for testing."""
    return {
        "content": "This is a test response from the LLM.",
        "tool_calls": [],
        "language": "en",
        "provider": "ollama"
    }


@pytest.fixture(scope="function")
def mock_weather_data():
    """Mock weather data for testing."""
    return {
        "location": {"name": "Delhi", "region": "Delhi", "country": "India"},
        "current": {
            "temp_c": 32.5,
            "temp_f": 90.5,
            "condition": {"text": "Sunny", "icon": "//cdn.weatherapi.com/weather/64x64/day/113.png"},
            "humidity": 45,
            "wind_kph": 15.2,
            "pressure_mb": 1012.0
        },
        "forecast": {
            "forecastday": [
                {
                    "date": "2024-01-15",
                    "day": {
                        "maxtemp_c": 35.0,
                        "mintemp_c": 22.0,
                        "daily_chance_of_rain": 10,
                        "totalprecip_mm": 0.0
                    }
                }
            ]
        }
    }


# Async fixtures
@pytest.fixture(scope="function")
async def async_mock_mongodb() -> AsyncGenerator:
    """Async mock MongoDB client for testing."""
    # For async tests, we'll use motor with mongomock
    # This is a simplified version - in production, use actual motor with test database
    client = MockMongoClient()
    db = client["krashaq_test_async"]
    
    yield db
    
    client.drop_database("krashaq_test_async")


@pytest.fixture(scope="function")
async def async_test_client():
    """Create an async test client for FastAPI app."""
    from httpx import AsyncClient, ASGITransport
    from app.main import app
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client
