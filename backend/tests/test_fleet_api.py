"""
Fleet Management System - Backend API Tests
Tests: Auth, Users, Vehicles, Drivers, Tenders, Approvals, Alerts
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_CREDS = {"email": "admin@sls.com", "password": "Dstzr2FwjtK0ntSa"}
MAKER_CREDS = {"email": "maker@sls.com", "password": "maker123"}
CHECKER_CREDS = {"email": "checker@sls.com", "password": "checker123"}
APPROVER_CREDS = {"email": "approver@sls.com", "password": "approver123"}


class TestHealthAndAuth:
    """Health check and authentication tests"""
    
    def test_health_endpoint(self):
        """Test health endpoint is accessible"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print("PASS: Health endpoint working")
    
    def test_admin_login_success(self):
        """Test admin login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == ADMIN_CREDS["email"]
        print(f"PASS: Admin login successful, role: {data['user']['role']}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials returns 401"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@test.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("PASS: Invalid credentials rejected with 401")


@pytest.fixture(scope="session")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip("Admin authentication failed")


@pytest.fixture(scope="session")
def auth_headers(admin_token):
    """Get authenticated headers"""
    return {"Authorization": f"Bearer {admin_token}"}


class TestDashboard:
    """Dashboard and alerts API tests"""
    
    def test_get_dashboard_stats(self, auth_headers):
        """Test dashboard stats endpoint"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_vehicles" in data
        assert "total_drivers" in data
        assert "total_tenders" in data
        assert "pending_approvals" in data
        print(f"PASS: Dashboard stats - {data['total_vehicles']} vehicles, {data['total_drivers']} drivers")
    
    def test_get_alerts(self, auth_headers):
        """Test alerts endpoint"""
        response = requests.get(f"{BASE_URL}/api/dashboard/alerts", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Alerts endpoint returned {len(data)} alerts")


class TestUserManagement:
    """User CRUD operations"""
    
    def test_get_users_as_admin(self, auth_headers):
        """Test get all users (admin role)"""
        response = requests.get(f"{BASE_URL}/api/users", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"PASS: Retrieved {len(data)} users")
    
    def test_create_user(self, auth_headers):
        """Test user creation"""
        test_email = f"TEST_user_{int(time.time())}@test.com"
        user_data = {
            "email": test_email,
            "name": "TEST User",
            "phone": "1234567890",
            "password": "testpass123",
            "role": "viewer"
        }
        response = requests.post(f"{BASE_URL}/api/users", json=user_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["email"] == test_email
        assert data["name"] == "TEST User"
        assert data["role"] == "viewer"
        print(f"PASS: Created user {test_email}")
        return data
    
    def test_update_user(self, auth_headers):
        """Test user update"""
        # First get users to find one to update
        users_response = requests.get(f"{BASE_URL}/api/users", headers=auth_headers)
        if users_response.status_code != 200:
            pytest.skip("Could not fetch users")
        users = users_response.json()
        
        # Find a test user or the first non-admin user
        test_user = None
        for user in users:
            if isinstance(user, dict) and user.get("email", "").startswith("TEST_"):
                test_user = user
                break
        
        if test_user:
            update_data = {"name": "TEST Updated Name", "phone": "9876543210"}
            response = requests.put(f"{BASE_URL}/api/users/{test_user['id']}", json=update_data, headers=auth_headers)
            assert response.status_code == 200
            data = response.json()
            assert data["name"] == "TEST Updated Name"
            print(f"PASS: Updated user {test_user['id']}")
        else:
            pytest.skip("No test user found to update")


class TestVehicles:
    """Vehicle CRUD operations"""
    
    def test_get_vehicles(self, auth_headers):
        """Test get all vehicles"""
        response = requests.get(f"{BASE_URL}/api/vehicles", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Retrieved {len(data)} vehicles")
    
    def test_get_vehicle_by_id(self, auth_headers):
        """Test get specific vehicle"""
        # First get list to get a valid ID
        list_response = requests.get(f"{BASE_URL}/api/vehicles", headers=auth_headers)
        if list_response.status_code != 200:
            pytest.skip("Could not fetch vehicles list")
        vehicles = list_response.json()
        
        if len(vehicles) > 0:
            vehicle_id = vehicles[0]["id"]
            response = requests.get(f"{BASE_URL}/api/vehicles/{vehicle_id}", headers=auth_headers)
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == vehicle_id
            print(f"PASS: Retrieved vehicle {data['vehicle_no']}")
        else:
            pytest.skip("No vehicles available to test")
    
    def test_vehicle_filter_by_status(self, auth_headers):
        """Test vehicle filtering by status"""
        response = requests.get(f"{BASE_URL}/api/vehicles?status=active", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for vehicle in data:
            assert vehicle["status"] == "active"
        print(f"PASS: Status filter returned {len(data)} active vehicles")


class TestDrivers:
    """Driver CRUD operations"""
    
    def test_get_drivers(self, auth_headers):
        """Test get all drivers"""
        response = requests.get(f"{BASE_URL}/api/drivers", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Retrieved {len(data)} drivers")
    
    def test_get_driver_by_id(self, auth_headers):
        """Test get specific driver"""
        list_response = requests.get(f"{BASE_URL}/api/drivers", headers=auth_headers)
        if list_response.status_code != 200:
            pytest.skip("Could not fetch drivers list")
        drivers = list_response.json()
        
        if len(drivers) > 0:
            driver_id = drivers[0]["id"]
            response = requests.get(f"{BASE_URL}/api/drivers/{driver_id}", headers=auth_headers)
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == driver_id
            print(f"PASS: Retrieved driver {data['name']}")
        else:
            pytest.skip("No drivers available to test")
    
    def test_driver_filter_by_status(self, auth_headers):
        """Test driver filtering by status"""
        response = requests.get(f"{BASE_URL}/api/drivers?status=active", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        for driver in data:
            assert driver["status"] == "active"
        print(f"PASS: Status filter returned {len(data)} active drivers")


class TestTenders:
    """Tender CRUD operations"""
    
    def test_get_tenders(self, auth_headers):
        """Test get all tenders"""
        response = requests.get(f"{BASE_URL}/api/tenders", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Retrieved {len(data)} tenders")
    
    def test_get_tender_by_id(self, auth_headers):
        """Test get specific tender"""
        list_response = requests.get(f"{BASE_URL}/api/tenders", headers=auth_headers)
        if list_response.status_code != 200:
            pytest.skip("Could not fetch tenders list")
        tenders = list_response.json()
        
        if len(tenders) > 0:
            tender_id = tenders[0]["id"]
            response = requests.get(f"{BASE_URL}/api/tenders/{tender_id}", headers=auth_headers)
            assert response.status_code == 200
            data = response.json()
            assert data["id"] == tender_id
            print(f"PASS: Retrieved tender {data['tender_name']}")
        else:
            pytest.skip("No tenders available to test")
    
    def test_create_tender(self, auth_headers):
        """Test tender creation"""
        tender_data = {
            "tender_name": f"TEST Tender {int(time.time())}",
            "tender_no": f"TEST-{int(time.time())}",
            "client": "TEST Client",
            "start_date": "2026-01-01",
            "end_date": "2026-12-31"
        }
        response = requests.post(f"{BASE_URL}/api/tenders", json=tender_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["tender_name"] == tender_data["tender_name"]
        assert data["client"] == "TEST Client"
        print(f"PASS: Created tender {data['tender_no']}")
        return data["id"]


class TestApprovals:
    """Approval queue operations"""
    
    def test_get_approval_queue(self, auth_headers):
        """Test get approval queue"""
        response = requests.get(f"{BASE_URL}/api/approvals/queue", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Retrieved {len(data)} approval items")
    
    def test_approval_queue_contains_entity_data(self, auth_headers):
        """Test approval queue includes entity data"""
        response = requests.get(f"{BASE_URL}/api/approvals/queue", headers=auth_headers)
        data = response.json()
        
        if len(data) > 0:
            approval = data[0]
            assert "entity_type" in approval
            assert "entity_id" in approval
            assert "status" in approval
            print(f"PASS: Approval queue item has correct structure")
        else:
            print("INFO: No approvals in queue to verify structure")


class TestPlants:
    """Plant management tests"""
    
    def test_get_plants(self, auth_headers):
        """Test get all plants"""
        response = requests.get(f"{BASE_URL}/api/plants", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Retrieved {len(data)} plants")


class TestRoleBasedAccess:
    """Role-based access control tests"""
    
    def test_users_endpoint_requires_admin(self):
        """Test users endpoint requires admin role"""
        # Login as maker user (should have restricted access)
        response = requests.post(f"{BASE_URL}/api/auth/login", json=MAKER_CREDS)
        if response.status_code != 200:
            pytest.skip("Maker user not available for RBAC test")
        
        maker_token = response.json().get("access_token")
        headers = {"Authorization": f"Bearer {maker_token}"}
        
        users_response = requests.get(f"{BASE_URL}/api/users", headers=headers)
        # Maker should not have access to users endpoint
        assert users_response.status_code == 403
        print("PASS: Users endpoint correctly restricts non-admin access")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
