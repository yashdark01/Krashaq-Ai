"""
Integration tests for user/farmer routes.
"""
import pytest


@pytest.mark.integration
class TestUserRoutes:
    """Test user and farmer management routes."""
    
    def test_get_farmers_empty(self, test_client):
        """Test getting farmers when none exist."""
        response = test_client.get("/api/farmers")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_create_farmer(self, test_client, test_farmer_data):
        """Test creating a new farmer."""
        response = test_client.post("/api/farmers", json=test_farmer_data)
        
        assert response.status_code == 200
        data = response.json()
        assert "name" in data
        assert data["name"] == test_farmer_data["name"]
    
    def test_get_farmers_list(self, test_client, test_farmer_data):
        """Test getting list of farmers."""
        # Create a farmer first
        test_client.post("/api/farmers", json=test_farmer_data)
        
        # Get farmers list
        response = test_client.get("/api/farmers")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
    
    def test_get_farmer_by_id(self, test_client, test_farmer_data):
        """Test getting a specific farmer by ID."""
        # Create a farmer
        create_response = test_client.post("/api/farmers", json=test_farmer_data)
        farmer_id = create_response.json()["_id"]
        
        # Get farmer by ID
        response = test_client.get(f"/api/farmers/{farmer_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["_id"] == farmer_id
    
    def test_update_farmer(self, test_client, test_farmer_data):
        """Test updating farmer information."""
        # Create a farmer
        create_response = test_client.post("/api/farmers", json=test_farmer_data)
        farmer_id = create_response.json()["_id"]
        
        # Update farmer
        update_data = {"name": "Updated Farmer Name"}
        response = test_client.put(f"/api/farmers/{farmer_id}", json=update_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Farmer Name"
    
    def test_delete_farmer(self, test_client, test_farmer_data):
        """Test deleting a farmer."""
        # Create a farmer
        create_response = test_client.post("/api/farmers", json=test_farmer_data)
        farmer_id = create_response.json()["_id"]
        
        # Delete farmer
        response = test_client.delete(f"/api/farmers/{farmer_id}")
        
        assert response.status_code == 200
        
        # Verify deletion
        get_response = test_client.get(f"/api/farmers/{farmer_id}")
        assert get_response.status_code == 404
