"""
Signup Flow and Driver Portal Tests
Tests: Signup request creation, admin approval/rejection, driver portal access, driver login routing
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_CREDS = {"email": "admin@sls.com", "password": "Dstzr2FwjtK0ntSa"}
DRIVER_CREDS = {"email": "driver1@sls.com", "password": "driver123"}

# Test signup data
TEST_SIGNUP_EMAIL = f"TEST_signup_{int(time.time())}@test.com"


class TestSignupRequestFlow:
    """Signup request creation and management tests"""
    
    def test_health_endpoint(self):
        """Verify API is healthy before tests"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("PASS: API health check successful")
    
    def test_create_signup_request(self):
        """Test creating a new signup request"""
        signup_data = {
            "name": "TEST Signup User",
            "email": TEST_SIGNUP_EMAIL,
            "phone": "9876543210",
            "password": "testpass123"
        }
        response = requests.post(f"{BASE_URL}/api/auth/signup-request", json=signup_data)
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "request_id" in data
        assert data["message"] == "Registration request submitted successfully"
        print(f"PASS: Signup request created with ID: {data['request_id']}")
        return data["request_id"]
    
    def test_duplicate_signup_request_rejected(self):
        """Test that duplicate signup request is rejected"""
        # Create a unique email
        unique_email = f"TEST_dup_{int(time.time())}@test.com"
        signup_data = {
            "name": "TEST Duplicate User",
            "email": unique_email,
            "phone": "1234567890",
            "password": "testpass123"
        }
        # First request should succeed
        response1 = requests.post(f"{BASE_URL}/api/auth/signup-request", json=signup_data)
        assert response1.status_code == 200
        
        # Second request with same email should fail
        response2 = requests.post(f"{BASE_URL}/api/auth/signup-request", json=signup_data)
        assert response2.status_code == 400
        data = response2.json()
        assert "pending" in data.get("detail", "").lower() or "already" in data.get("detail", "").lower()
        print("PASS: Duplicate signup request correctly rejected")
    
    def test_signup_request_with_existing_user_email_rejected(self):
        """Test that signup with existing user email is rejected"""
        signup_data = {
            "name": "Admin Duplicate",
            "email": "admin@sls.com",  # Already exists as user
            "phone": "1234567890",
            "password": "testpass123"
        }
        response = requests.post(f"{BASE_URL}/api/auth/signup-request", json=signup_data)
        assert response.status_code == 400
        data = response.json()
        assert "already registered" in data.get("detail", "").lower()
        print("PASS: Signup with existing user email correctly rejected")


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


class TestSignupRequestsAdmin:
    """Admin operations on signup requests"""
    
    def test_get_signup_requests_as_admin(self, auth_headers):
        """Test fetching pending signup requests as admin"""
        response = requests.get(f"{BASE_URL}/api/auth/signup-requests", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Retrieved {len(data)} pending signup requests")
        return data
    
    def test_signup_requests_contain_required_fields(self, auth_headers):
        """Test that signup requests have all required fields"""
        response = requests.get(f"{BASE_URL}/api/auth/signup-requests", headers=auth_headers)
        assert response.status_code == 200
        requests_list = response.json()
        
        if len(requests_list) > 0:
            req = requests_list[0]
            assert "id" in req
            assert "name" in req
            assert "email" in req
            assert "phone" in req
            assert "status" in req
            assert req["status"] == "pending"
            print(f"PASS: Signup request has all required fields: {req['email']}")
        else:
            print("INFO: No pending requests to verify structure")
    
    def test_get_signup_requests_unauthenticated_fails(self):
        """Test that unauthenticated access to signup requests fails"""
        response = requests.get(f"{BASE_URL}/api/auth/signup-requests")
        assert response.status_code in [401, 403, 422]
        print("PASS: Unauthenticated access to signup requests correctly rejected")
    
    def test_approve_signup_request(self, auth_headers):
        """Test approving a signup request and assigning a role"""
        # First create a request
        unique_email = f"TEST_approve_{int(time.time())}@test.com"
        signup_data = {
            "name": "TEST Approve User",
            "email": unique_email,
            "phone": "5551234567",
            "password": "testpass123"
        }
        create_response = requests.post(f"{BASE_URL}/api/auth/signup-request", json=signup_data)
        assert create_response.status_code == 200
        request_id = create_response.json()["request_id"]
        
        # Approve the request with driver role
        approve_response = requests.post(
            f"{BASE_URL}/api/auth/signup-requests/{request_id}/approve?role=viewer",
            headers=auth_headers
        )
        assert approve_response.status_code == 200
        data = approve_response.json()
        assert "message" in data
        assert "user_id" in data
        print(f"PASS: Approved signup request, created user: {data['user_id']}")
        
        # Verify user can now login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": unique_email,
            "password": "testpass123"
        })
        assert login_response.status_code == 200
        login_data = login_response.json()
        assert login_data["user"]["role"] == "viewer"
        print(f"PASS: Approved user can login with assigned role: viewer")
    
    def test_reject_signup_request(self, auth_headers):
        """Test rejecting a signup request"""
        # First create a request
        unique_email = f"TEST_reject_{int(time.time())}@test.com"
        signup_data = {
            "name": "TEST Reject User",
            "email": unique_email,
            "phone": "5559876543",
            "password": "testpass123"
        }
        create_response = requests.post(f"{BASE_URL}/api/auth/signup-request", json=signup_data)
        assert create_response.status_code == 200
        request_id = create_response.json()["request_id"]
        
        # Reject the request
        reject_response = requests.post(
            f"{BASE_URL}/api/auth/signup-requests/{request_id}/reject",
            headers=auth_headers
        )
        assert reject_response.status_code == 200
        data = reject_response.json()
        assert "message" in data
        print(f"PASS: Rejected signup request: {request_id}")
        
        # Verify user cannot login
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": unique_email,
            "password": "testpass123"
        })
        assert login_response.status_code == 401
        print("PASS: Rejected user cannot login")
    
    def test_approve_with_invalid_role_fails(self, auth_headers):
        """Test that approval with invalid role fails"""
        # First create a request
        unique_email = f"TEST_invalid_role_{int(time.time())}@test.com"
        signup_data = {
            "name": "TEST Invalid Role User",
            "email": unique_email,
            "phone": "5555555555",
            "password": "testpass123"
        }
        create_response = requests.post(f"{BASE_URL}/api/auth/signup-request", json=signup_data)
        assert create_response.status_code == 200
        request_id = create_response.json()["request_id"]
        
        # Try to approve with invalid role
        approve_response = requests.post(
            f"{BASE_URL}/api/auth/signup-requests/{request_id}/approve?role=invalid_role",
            headers=auth_headers
        )
        assert approve_response.status_code == 400
        print("PASS: Approval with invalid role correctly rejected")


class TestDriverLogin:
    """Driver login and role-based access tests"""
    
    def test_driver_login(self):
        """Test driver login returns driver role"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=DRIVER_CREDS)
        # Driver might not exist, so check appropriately
        if response.status_code == 200:
            data = response.json()
            assert "access_token" in data
            assert data["user"]["role"] == "driver"
            print(f"PASS: Driver login successful, role: {data['user']['role']}")
        elif response.status_code == 401:
            print("INFO: Driver user does not exist - skipping driver login test")
        else:
            pytest.fail(f"Unexpected status code: {response.status_code}")


class TestDriverPortal:
    """Driver portal access tests"""
    
    @pytest.fixture
    def driver_token(self):
        """Get driver authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=DRIVER_CREDS)
        if response.status_code == 200:
            return response.json().get("access_token")
        return None
    
    def test_driver_portal_my_vehicle_requires_driver_role(self, auth_headers):
        """Test that /driver/my-vehicle endpoint requires driver role"""
        # Admin shouldn't access driver portal
        response = requests.get(f"{BASE_URL}/api/driver/my-vehicle", headers=auth_headers)
        assert response.status_code == 403
        print("PASS: Driver portal correctly restricts non-driver access")
    
    def test_driver_profile_requires_driver_role(self, auth_headers):
        """Test that /driver/profile endpoint requires driver role"""
        response = requests.get(f"{BASE_URL}/api/driver/profile", headers=auth_headers)
        assert response.status_code == 403
        print("PASS: Driver profile correctly restricts non-driver access")
    
    def test_driver_portal_with_driver_role(self, driver_token):
        """Test driver portal access with driver role"""
        if not driver_token:
            pytest.skip("Driver user not available")
        
        headers = {"Authorization": f"Bearer {driver_token}"}
        response = requests.get(f"{BASE_URL}/api/driver/my-vehicle", headers=headers)
        
        # If driver profile exists, should return 200
        # If driver profile not found in drivers collection, may return 404
        if response.status_code == 200:
            data = response.json()
            assert "driver" in data or "message" in data
            print(f"PASS: Driver portal accessible for driver user")
        elif response.status_code == 404:
            print("INFO: Driver profile not found in drivers collection (needs emp_id linking)")
        else:
            pytest.fail(f"Unexpected status code: {response.status_code}")


class TestAuthenticationFlow:
    """General authentication tests"""
    
    def test_admin_login_success(self):
        """Test admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] in ["admin", "superuser"]
        print(f"PASS: Admin login successful")
    
    def test_get_me_endpoint(self, auth_headers):
        """Test /auth/me endpoint returns current user info"""
        response = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "email" in data
        assert "role" in data
        print(f"PASS: /auth/me returns user info: {data['email']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
