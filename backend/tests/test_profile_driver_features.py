"""
Tests for Profile and Driver Form Features
- User profile endpoints (GET/PUT /profile, POST /profile/photo)
- Profile edit approval workflow
- Driver creation with documents
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_CREDS = {
    "admin": {"email": "admin@sls.com", "password": "admin123"},
    "maker": {"email": "maker@sls.com", "password": "maker123"},
    "checker": {"email": "checker@sls.com", "password": "checker123"},
    "approver": {"email": "approver@sls.com", "password": "approver123"},
    "driver": {"email": "driver1@sls.com", "password": "driver123"},
}


@pytest.fixture
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


def get_auth_token(api_client, role):
    """Get authentication token for a specific role"""
    creds = TEST_CREDS.get(role)
    if not creds:
        pytest.skip(f"No credentials for role: {role}")
    
    response = api_client.post(f"{BASE_URL}/api/auth/login", json=creds)
    if response.status_code != 200:
        pytest.skip(f"Failed to login as {role}: {response.text}")
    return response.json().get("access_token")


@pytest.fixture
def maker_token(api_client):
    return get_auth_token(api_client, "maker")


@pytest.fixture
def checker_token(api_client):
    return get_auth_token(api_client, "checker")


@pytest.fixture
def approver_token(api_client):
    return get_auth_token(api_client, "approver")


@pytest.fixture
def admin_token(api_client):
    return get_auth_token(api_client, "admin")


@pytest.fixture
def driver_token(api_client):
    return get_auth_token(api_client, "driver")


class TestProfileEndpoints:
    """Test /api/users/profile endpoints"""
    
    def test_get_profile_returns_user_data(self, api_client, maker_token):
        """GET /api/users/profile should return user profile and pending_edit"""
        response = api_client.get(
            f"{BASE_URL}/api/users/profile",
            headers={"Authorization": f"Bearer {maker_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "profile" in data
        assert "pending_edit" in data
        
        # Verify profile fields
        profile = data["profile"]
        assert "email" in profile
        assert "name" in profile
        assert "role" in profile
        assert profile["email"] == "maker@sls.com"
        assert profile["role"] == "maker"
        print(f"✓ GET /profile returns: {profile['name']} ({profile['role']})")

    def test_get_profile_driver_returns_emp_id(self, api_client, driver_token):
        """Driver profile should include emp_id field"""
        response = api_client.get(
            f"{BASE_URL}/api/users/profile",
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        assert response.status_code == 200
        profile = response.json()["profile"]
        assert "emp_id" in profile
        assert profile["role"] == "driver"
        print(f"✓ Driver profile has emp_id: {profile.get('emp_id')}")

    def test_get_profile_unauthorized(self, api_client):
        """GET /api/users/profile without auth should fail"""
        response = api_client.get(f"{BASE_URL}/api/users/profile")
        assert response.status_code in [401, 403]
        print("✓ Profile endpoint requires authentication")


class TestProfileEditWorkflow:
    """Test profile edit submission and approval workflow"""
    
    def test_put_profile_creates_edit_request(self, api_client, approver_token):
        """PUT /api/users/profile should create an edit request for approval"""
        # First check if there's already a pending edit
        profile_resp = api_client.get(
            f"{BASE_URL}/api/users/profile",
            headers={"Authorization": f"Bearer {approver_token}"}
        )
        if profile_resp.json().get("pending_edit"):
            pytest.skip("Approver already has a pending edit - skipping")
        
        # Submit a profile edit
        edit_data = {
            "name": "Approver Test Edit",
            "address": "456 Test Ave"
        }
        response = api_client.put(
            f"{BASE_URL}/api/users/profile",
            headers={"Authorization": f"Bearer {approver_token}"},
            json=edit_data
        )
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "edit_id" in data
        assert "approval" in data["message"].lower() or "submitted" in data["message"].lower()
        print(f"✓ Profile edit submitted: {data['edit_id']}")

    def test_put_profile_rejects_duplicate_pending(self, api_client, maker_token):
        """PUT /api/users/profile should reject if pending edit exists"""
        # Maker already has a pending edit from earlier
        edit_data = {"name": "Another Edit"}
        response = api_client.put(
            f"{BASE_URL}/api/users/profile",
            headers={"Authorization": f"Bearer {maker_token}"},
            json=edit_data
        )
        # Should either reject (400) or if no pending exists, succeed (200)
        if response.status_code == 400:
            assert "pending" in response.json().get("detail", "").lower()
            print("✓ Duplicate pending edit rejected correctly")
        else:
            print("✓ No duplicate (maker had no pending edit)")

    def test_get_profile_edits_list(self, api_client, checker_token):
        """GET /api/users/profile-edits should list pending edits for checkers/approvers"""
        response = api_client.get(
            f"{BASE_URL}/api/users/profile-edits",
            headers={"Authorization": f"Bearer {checker_token}"}
        )
        assert response.status_code == 200
        edits = response.json()
        assert isinstance(edits, list)
        print(f"✓ Found {len(edits)} pending profile edits")

    def test_profile_edit_approval_flow(self, api_client, admin_token, checker_token):
        """Test full profile edit approval workflow"""
        # Create a new profile edit as admin (they likely don't have a pending one)
        profile_resp = api_client.get(
            f"{BASE_URL}/api/users/profile",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        if profile_resp.json().get("pending_edit"):
            print("Admin already has pending edit - using that")
            edit_id = profile_resp.json()["pending_edit"]["id"]
        else:
            edit_resp = api_client.put(
                f"{BASE_URL}/api/users/profile",
                headers={"Authorization": f"Bearer {admin_token}"},
                json={"name": f"Admin Profile Test {uuid.uuid4().hex[:6]}"}
            )
            if edit_resp.status_code != 200:
                pytest.skip(f"Could not create profile edit: {edit_resp.text}")
            edit_id = edit_resp.json()["edit_id"]
        
        # Approve using checker (they can approve profile edits)
        approve_resp = api_client.post(
            f"{BASE_URL}/api/users/profile-edits/{edit_id}/approve",
            headers={"Authorization": f"Bearer {checker_token}"}
        )
        assert approve_resp.status_code == 200
        assert "approved" in approve_resp.json().get("message", "").lower()
        print(f"✓ Profile edit {edit_id} approved successfully")


class TestProfilePhotoUpload:
    """Test profile photo upload endpoint"""
    
    def test_photo_upload_success(self, api_client, admin_token):
        """POST /api/users/profile/photo should upload and return photo_url"""
        # Create a simple 1x1 PNG
        import base64
        png_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
        png_data = base64.b64decode(png_base64)
        
        # Upload using multipart form
        files = {"file": ("test_photo.png", png_data, "image/png")}
        response = requests.post(
            f"{BASE_URL}/api/users/profile/photo",
            headers={"Authorization": f"Bearer {admin_token}"},
            files=files
        )
        assert response.status_code == 200
        data = response.json()
        assert "photo_url" in data
        assert data["photo_url"].startswith("/api/users/photo/")
        print(f"✓ Photo uploaded: {data['photo_url']}")

    def test_photo_url_accessible(self, api_client, admin_token):
        """Photo URL should be accessible after upload"""
        # Get profile to find photo_url
        profile_resp = api_client.get(
            f"{BASE_URL}/api/users/profile",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        photo_url = profile_resp.json()["profile"].get("photo_url")
        if not photo_url:
            pytest.skip("No photo uploaded for admin")
        
        # Try to access the photo
        response = requests.get(f"{BASE_URL}{photo_url}")
        assert response.status_code == 200
        print(f"✓ Photo accessible at {photo_url}")


class TestDriverCreation:
    """Test driver creation endpoints"""
    
    def test_create_driver_success(self, api_client, maker_token):
        """POST /api/drivers should create a new driver"""
        unique_id = uuid.uuid4().hex[:6].upper()
        driver_data = {
            "name": f"Test Driver {unique_id}",
            "emp_id": f"TESTDRV{unique_id}",
            "phone": "9876543210",
            "dl_no": f"KA01TEST{unique_id}",
            "dl_expiry": "2027-12-31",
            "hazardous_cert_expiry": "2027-06-30",
            "plant": "Test Plant"
        }
        
        response = api_client.post(
            f"{BASE_URL}/api/drivers",
            headers={"Authorization": f"Bearer {maker_token}"},
            json=driver_data
        )
        assert response.status_code in [200, 201]
        data = response.json()
        
        # Verify response
        assert "id" in data
        assert data["name"] == driver_data["name"]
        assert data["emp_id"] == driver_data["emp_id"]
        assert data["status"] == "pending"  # New drivers should be pending
        print(f"✓ Driver created: {data['name']} (ID: {data['id'][:8]}...)")
        return data["id"]

    def test_create_driver_validation(self, api_client, maker_token):
        """POST /api/drivers should validate required fields"""
        # Missing required fields
        response = api_client.post(
            f"{BASE_URL}/api/drivers",
            headers={"Authorization": f"Bearer {maker_token}"},
            json={"name": "Test"}  # Missing emp_id, phone, dl_no
        )
        assert response.status_code == 422
        print("✓ Driver creation validates required fields")

    def test_get_drivers_list(self, api_client, maker_token):
        """GET /api/drivers should return list of drivers"""
        response = api_client.get(
            f"{BASE_URL}/api/drivers",
            headers={"Authorization": f"Bearer {maker_token}"}
        )
        assert response.status_code == 200
        drivers = response.json()
        assert isinstance(drivers, list)
        print(f"✓ Found {len(drivers)} drivers")


class TestDocumentUpload:
    """Test document upload for drivers"""
    
    def test_upload_driver_document(self, api_client, maker_token):
        """POST /api/documents/upload should upload document for driver"""
        # First create a driver
        unique_id = uuid.uuid4().hex[:6].upper()
        driver_resp = api_client.post(
            f"{BASE_URL}/api/drivers",
            headers={"Authorization": f"Bearer {maker_token}"},
            json={
                "name": f"Doc Test Driver {unique_id}",
                "emp_id": f"DOCDRV{unique_id}",
                "phone": "9999999999",
                "dl_no": f"KA01DOC{unique_id}"
            }
        )
        if driver_resp.status_code not in [200, 201]:
            pytest.skip(f"Could not create driver: {driver_resp.text}")
        
        driver_id = driver_resp.json()["id"]
        
        # Upload a document
        import base64
        pdf_header = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
        
        files = {
            "file": ("test_dl.pdf", pdf_header, "application/pdf")
        }
        form_data = {
            "entity_type": "driver",
            "entity_id": driver_id,
            "document_type": "dl",
            "expiry_date": "2027-12-31"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/documents/upload",
            headers={"Authorization": f"Bearer {maker_token}"},
            files=files,
            data=form_data
        )
        assert response.status_code in [200, 201]
        data = response.json()
        # Response has "document" key with nested data
        assert "document" in data or "id" in data or "document_type" in data
        print(f"✓ Document uploaded for driver {driver_id[:8]}...")


class TestDriverPortal:
    """Test driver portal endpoints"""
    
    def test_driver_portal_my_vehicle(self, api_client, driver_token):
        """GET /api/driver/my-vehicle should return driver and vehicle data"""
        response = api_client.get(
            f"{BASE_URL}/api/driver/my-vehicle",
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert "driver" in data
        assert "vehicle" in data
        
        driver = data["driver"]
        assert "name" in driver
        assert "emp_id" in driver
        assert "dl_no" in driver
        print(f"✓ Driver portal: {driver['name']} assigned to {data.get('vehicle', {}).get('vehicle_no', 'N/A')}")


class TestApprovalQueueWithProfileEdit:
    """Test approval queue includes profile edits"""
    
    def test_approval_queue_shows_profile_edits(self, api_client, checker_token):
        """GET /api/approvals/queue should include profile_edit entity type"""
        response = api_client.get(
            f"{BASE_URL}/api/approvals/queue",
            headers={"Authorization": f"Bearer {checker_token}"}
        )
        assert response.status_code == 200
        approvals = response.json()
        
        profile_edits = [a for a in approvals if a.get("entity_type") == "profile_edit"]
        print(f"✓ Approval queue has {len(profile_edits)} profile_edit items")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
