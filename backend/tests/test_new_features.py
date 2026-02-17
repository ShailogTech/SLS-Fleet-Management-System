"""
Test suite for SLS Fleet Management - New Features:
1. My Submissions endpoint (GET /api/approvals/my-submissions)
2. Document metadata and upload endpoints (POST /api/documents/metadata, /api/documents/upload)
3. Driver Portal document access (GET /api/driver/my-vehicle)
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_CREDS = {"email": "admin@sls.com", "password": "admin123"}
MAKER_CREDS = {"email": "maker@sls.com", "password": "maker123"}
CHECKER_CREDS = {"email": "checker@sls.com", "password": "checker123"}
APPROVER_CREDS = {"email": "approver@sls.com", "password": "approver123"}
DRIVER_CREDS = {"email": "driver1@sls.com", "password": "driver123"}


@pytest.fixture(scope="module")
def api_client():
    """Shared requests session"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


def get_auth_token(client, credentials):
    """Helper to get auth token"""
    response = client.post(f"{BASE_URL}/api/auth/login", json=credentials)
    if response.status_code == 200:
        return response.json().get("access_token")
    return None


# =============================================================================
# Feature 1: My Submissions Endpoint Tests
# =============================================================================

class TestMySubmissionsEndpoint:
    """Tests for GET /api/approvals/my-submissions"""

    def test_my_submissions_with_maker_auth(self, api_client):
        """Maker should be able to access my-submissions endpoint"""
        token = get_auth_token(api_client, MAKER_CREDS)
        if not token:
            pytest.skip("Maker login failed - skipping test")
        
        response = api_client.get(
            f"{BASE_URL}/api/approvals/my-submissions",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Maker has {len(data)} submissions")

    def test_my_submissions_with_admin_auth(self, api_client):
        """Admin should be able to access my-submissions endpoint"""
        token = get_auth_token(api_client, ADMIN_CREDS)
        if not token:
            pytest.skip("Admin login failed - skipping test")
        
        response = api_client.get(
            f"{BASE_URL}/api/approvals/my-submissions",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"Admin has {len(data)} submissions")

    def test_my_submissions_without_auth(self, api_client):
        """Unauthenticated request should fail"""
        response = api_client.get(f"{BASE_URL}/api/approvals/my-submissions")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"

    def test_my_submissions_data_structure(self, api_client):
        """Verify response data structure when maker has submissions"""
        token = get_auth_token(api_client, MAKER_CREDS)
        if not token:
            pytest.skip("Maker login failed - skipping test")
        
        response = api_client.get(
            f"{BASE_URL}/api/approvals/my-submissions",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        
        if len(data) > 0:
            submission = data[0]
            # Check expected fields in submission
            assert "id" in submission, "Submission should have 'id'"
            assert "entity_type" in submission, "Submission should have 'entity_type'"
            assert "entity_id" in submission, "Submission should have 'entity_id'"
            assert "status" in submission, "Submission should have 'status'"
            assert "created_at" in submission, "Submission should have 'created_at'"
            print(f"First submission: id={submission['id']}, type={submission['entity_type']}, status={submission['status']}")
        else:
            print("Maker has no submissions - data structure cannot be verified")


# =============================================================================
# Feature 2: Document Upload Flow Tests
# =============================================================================

class TestDocumentMetadataEndpoint:
    """Tests for POST /api/documents/metadata (save details only)"""

    def test_create_document_metadata_as_maker(self, api_client):
        """Maker should be able to create document metadata without file"""
        token = get_auth_token(api_client, MAKER_CREDS)
        if not token:
            pytest.skip("Maker login failed - skipping test")
        
        test_entity_id = f"TEST-{uuid.uuid4().hex[:8]}"
        response = api_client.post(
            f"{BASE_URL}/api/documents/metadata",
            data={
                "entity_type": "vehicle",
                "entity_id": test_entity_id,
                "document_type": "insurance",
                "document_number": "INS-TEST-001",
                "expiry_date": "2026-12-31",
                "issuing_authority": "Test Insurance Co"
            },
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/x-www-form-urlencoded"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "document" in data, "Response should contain 'document'"
        assert data["document"]["status"] == "pending_upload", "Document status should be 'pending_upload'"
        assert data["document"]["document_type"] == "insurance"
        assert data["document"]["document_number"] == "INS-TEST-001"
        print(f"Created document metadata: {data['document']['id']}")
        return data["document"]["id"]

    def test_create_metadata_with_all_fields(self, api_client):
        """Test creating metadata with all optional fields"""
        token = get_auth_token(api_client, MAKER_CREDS)
        if not token:
            pytest.skip("Maker login failed - skipping test")
        
        test_entity_id = f"TEST-{uuid.uuid4().hex[:8]}"
        response = api_client.post(
            f"{BASE_URL}/api/documents/metadata",
            data={
                "entity_type": "vehicle",
                "entity_id": test_entity_id,
                "document_type": "rc",
                "document_number": "RC-TEST-001",
                "issue_date": "2024-01-01",
                "expiry_date": "2026-12-31",
                "issuing_authority": "RTO Test"
            },
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/x-www-form-urlencoded"}
        )
        assert response.status_code == 200
        data = response.json()
        doc = data["document"]
        assert doc["issue_date"] == "2024-01-01"
        assert doc["expiry_date"] == "2026-12-31"
        assert doc["issuing_authority"] == "RTO Test"
        print(f"Document with all fields created successfully")

    def test_metadata_requires_auth(self, api_client):
        """Unauthenticated request should fail"""
        response = api_client.post(
            f"{BASE_URL}/api/documents/metadata",
            data={
                "entity_type": "vehicle",
                "entity_id": "test-id",
                "document_type": "insurance"
            }
        )
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"

    def test_metadata_requires_document_type(self, api_client):
        """Document type is required"""
        token = get_auth_token(api_client, MAKER_CREDS)
        if not token:
            pytest.skip("Maker login failed - skipping test")
        
        # Missing document_type should cause validation error
        response = api_client.post(
            f"{BASE_URL}/api/documents/metadata",
            data={
                "entity_type": "vehicle",
                "entity_id": "test-id"
            },
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/x-www-form-urlencoded"}
        )
        assert response.status_code == 422, f"Expected 422 for missing required field, got {response.status_code}"


class TestDocumentUploadEndpoint:
    """Tests for POST /api/documents/upload (with file)"""

    def test_upload_document_with_file_as_maker(self, api_client):
        """Maker should be able to upload document with file and metadata"""
        token = get_auth_token(api_client, MAKER_CREDS)
        if not token:
            pytest.skip("Maker login failed - skipping test")
        
        test_entity_id = f"TEST-{uuid.uuid4().hex[:8]}"
        
        # Create a temporary file
        files = {
            'file': ('test_document.pdf', b'%PDF-1.4 fake pdf content for testing', 'application/pdf')
        }
        data = {
            "entity_type": "vehicle",
            "entity_id": test_entity_id,
            "document_type": "puc",
            "document_number": "PUC-TEST-001",
            "expiry_date": "2026-06-30"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/documents/upload",
            files=files,
            data=data,
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        result = response.json()
        assert "document" in result
        assert result["document"]["status"] == "uploaded"
        assert result["document"]["filename"] == "test_document.pdf"
        assert result["document"]["file_url"] is not None
        print(f"Uploaded document: {result['document']['id']}, file_url: {result['document']['file_url']}")

    def test_upload_invalid_file_type(self, api_client):
        """Should reject non-allowed file types"""
        token = get_auth_token(api_client, MAKER_CREDS)
        if not token:
            pytest.skip("Maker login failed - skipping test")
        
        files = {
            'file': ('test.exe', b'fake exe content', 'application/octet-stream')
        }
        data = {
            "entity_type": "vehicle",
            "entity_id": "test-id",
            "document_type": "insurance"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/documents/upload",
            files=files,
            data=data,
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 400, f"Expected 400 for invalid file type, got {response.status_code}"


class TestGetDocumentsEndpoint:
    """Tests for GET /api/documents/{entity_type}/{entity_id}"""

    def test_get_documents_for_entity(self, api_client):
        """Should retrieve documents for an entity"""
        token = get_auth_token(api_client, MAKER_CREDS)
        if not token:
            pytest.skip("Maker login failed - skipping test")
        
        # First, create a document
        test_entity_id = f"TEST-{uuid.uuid4().hex[:8]}"
        create_response = api_client.post(
            f"{BASE_URL}/api/documents/metadata",
            data={
                "entity_type": "vehicle",
                "entity_id": test_entity_id,
                "document_type": "tax",
                "document_number": "TAX-TEST-001"
            },
            headers={"Authorization": f"Bearer {token}", "Content-Type": "application/x-www-form-urlencoded"}
        )
        assert create_response.status_code == 200
        
        # Now retrieve documents
        get_response = api_client.get(
            f"{BASE_URL}/api/documents/vehicle/{test_entity_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert get_response.status_code == 200, f"Expected 200, got {get_response.status_code}"
        docs = get_response.json()
        assert isinstance(docs, list)
        assert len(docs) >= 1, "Should have at least one document"
        assert docs[0]["document_type"] == "tax"
        print(f"Retrieved {len(docs)} documents for entity {test_entity_id}")

    def test_get_documents_empty_entity(self, api_client):
        """Should return empty list for entity with no documents"""
        token = get_auth_token(api_client, MAKER_CREDS)
        if not token:
            pytest.skip("Maker login failed - skipping test")
        
        response = api_client.get(
            f"{BASE_URL}/api/documents/vehicle/nonexistent-entity-id-12345",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        docs = response.json()
        assert isinstance(docs, list)
        assert len(docs) == 0, "Should return empty list for nonexistent entity"


# =============================================================================
# Feature 3: Driver Portal Document Access Tests
# =============================================================================

class TestDriverPortal:
    """Tests for Driver Portal endpoints"""

    def test_driver_my_vehicle_endpoint(self, api_client):
        """Driver should be able to access their vehicle info"""
        token = get_auth_token(api_client, DRIVER_CREDS)
        if not token:
            pytest.skip("Driver login failed - skipping test")
        
        response = api_client.get(
            f"{BASE_URL}/api/driver/my-vehicle",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        # Could be 200 with data or 404 if driver not configured
        if response.status_code == 404:
            print("Driver profile not found - expected if emp_id not linked")
            pytest.skip("Driver profile not linked via emp_id")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Should have driver info
        assert "driver" in data, "Response should have 'driver' field"
        
        # May or may not have vehicle
        if data.get("vehicle"):
            print(f"Driver vehicle: {data['vehicle'].get('vehicle_no')}")
        
        # Should have documents list (may be empty)
        if "documents" in data:
            print(f"Driver has {len(data.get('documents', []))} vehicle documents")

    def test_driver_endpoint_non_driver_access(self, api_client):
        """Non-driver users should not access driver endpoint"""
        token = get_auth_token(api_client, MAKER_CREDS)
        if not token:
            pytest.skip("Maker login failed - skipping test")
        
        response = api_client.get(
            f"{BASE_URL}/api/driver/my-vehicle",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 403, f"Expected 403 for non-driver, got {response.status_code}"

    def test_driver_profile_endpoint(self, api_client):
        """Driver should be able to access their profile"""
        token = get_auth_token(api_client, DRIVER_CREDS)
        if not token:
            pytest.skip("Driver login failed - skipping test")
        
        response = api_client.get(
            f"{BASE_URL}/api/driver/profile",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if response.status_code == 404:
            pytest.skip("Driver profile not found")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "user" in data, "Response should have 'user' field"
        print(f"Driver profile retrieved successfully")


# =============================================================================
# Auth & Role Tests
# =============================================================================

class TestAuthAndRoles:
    """Test authentication and role-based access"""

    def test_maker_login(self, api_client):
        """Maker should be able to login"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json=MAKER_CREDS)
        assert response.status_code == 200, f"Maker login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data.get("user", {}).get("role") == "maker"
        print("Maker login successful")

    def test_admin_login(self, api_client):
        """Admin should be able to login"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json=ADMIN_CREDS)
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        print("Admin login successful")

    def test_checker_login(self, api_client):
        """Checker should be able to login"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json=CHECKER_CREDS)
        assert response.status_code == 200, f"Checker login failed: {response.text}"
        print("Checker login successful")

    def test_approver_login(self, api_client):
        """Approver should be able to login"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json=APPROVER_CREDS)
        assert response.status_code == 200, f"Approver login failed: {response.text}"
        print("Approver login successful")

    def test_driver_login(self, api_client):
        """Driver should be able to login"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json=DRIVER_CREDS)
        assert response.status_code == 200, f"Driver login failed: {response.text}"
        data = response.json()
        assert data.get("user", {}).get("role") == "driver"
        print("Driver login successful")


# =============================================================================
# Approval Queue Access Tests (Checker/Approver should NOT have My Submissions)
# =============================================================================

class TestApprovalQueueAccess:
    """Test that approval queue is accessible to checker/approver"""

    def test_checker_can_access_approval_queue(self, api_client):
        """Checker should access approval queue, not my-submissions"""
        token = get_auth_token(api_client, CHECKER_CREDS)
        if not token:
            pytest.skip("Checker login failed")
        
        response = api_client.get(
            f"{BASE_URL}/api/approvals/queue",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Checker should access queue: {response.text}"
        print("Checker can access approval queue")

    def test_approver_can_access_approval_queue(self, api_client):
        """Approver should access approval queue, not my-submissions"""
        token = get_auth_token(api_client, APPROVER_CREDS)
        if not token:
            pytest.skip("Approver login failed")
        
        response = api_client.get(
            f"{BASE_URL}/api/approvals/queue",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200, f"Approver should access queue: {response.text}"
        print("Approver can access approval queue")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
