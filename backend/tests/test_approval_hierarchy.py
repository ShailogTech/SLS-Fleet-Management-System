"""
Test suite for SLS Fleet Management - Approval Hierarchy Changes:
1. Admin/Superuser can ONLY view and add comments - NOT check/approve
2. Checker can ONLY perform 'check' action (forward to approver or return to maker)
3. Approver can ONLY perform 'approve' action (final approval or reject)
4. Admin comment endpoint POST /api/approvals/{id}/comment
5. Role-based access to approval queue
"""

import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_CREDS = {"email": "admin@sls.com", "password": "admin123"}
MAKER_CREDS = {"email": "maker@sls.com", "password": "maker123"}
CHECKER_CREDS = {"email": "checker@sls.com", "password": "checker123"}
APPROVER_CREDS = {"email": "approver@sls.com", "password": "approver123"}


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
# Setup: Create a new vehicle as Maker to generate pending approval
# =============================================================================

@pytest.fixture(scope="module")
def created_vehicle_approval(api_client):
    """Create a vehicle to generate a pending approval for testing"""
    token = get_auth_token(api_client, MAKER_CREDS)
    if not token:
        pytest.skip("Maker login failed - cannot create test data")
    
    vehicle_no = f"TEST{datetime.now().strftime('%H%M%S')}"
    vehicle_data = {
        "vehicle_no": vehicle_no,
        "owner_name": "Test Owner for Approval Testing",
        "make": "TEST MANUFACTURER",
        "vehicle_type": "Test Vehicle",
        "plant": "Test Plant",
        "status": "pending"
    }
    
    response = api_client.post(
        f"{BASE_URL}/api/vehicles",
        json=vehicle_data,
        headers={"Authorization": f"Bearer {token}"}
    )
    
    if response.status_code not in [200, 201]:
        pytest.skip(f"Failed to create test vehicle: {response.text}")
    
    vehicle = response.json()
    print(f"Created test vehicle: {vehicle.get('id')}, vehicle_no: {vehicle_no}")
    
    # Get the approval ID for this vehicle
    checker_token = get_auth_token(api_client, CHECKER_CREDS)
    queue_response = api_client.get(
        f"{BASE_URL}/api/approvals/queue",
        headers={"Authorization": f"Bearer {checker_token}"}
    )
    
    if queue_response.status_code == 200:
        approvals = queue_response.json()
        for approval in approvals:
            if approval.get("entity_id") == vehicle.get("id"):
                return {"vehicle_id": vehicle.get("id"), "approval_id": approval.get("id")}
    
    return {"vehicle_id": vehicle.get("id"), "approval_id": None}


# =============================================================================
# Test 1: Admin CANNOT perform check action (403)
# =============================================================================

class TestAdminBlockedFromCheck:
    """Admin/superuser should NOT be able to perform check action"""

    def test_admin_cannot_check_approval(self, api_client, created_vehicle_approval):
        """Admin trying to check should get 403"""
        token = get_auth_token(api_client, ADMIN_CREDS)
        if not token:
            pytest.skip("Admin login failed")
        
        approval_id = created_vehicle_approval.get("approval_id")
        if not approval_id:
            # Try to get any pending approval
            queue_response = api_client.get(
                f"{BASE_URL}/api/approvals/queue",
                headers={"Authorization": f"Bearer {token}"}
            )
            if queue_response.status_code == 200:
                approvals = [a for a in queue_response.json() if a.get("status") == "pending"]
                if approvals:
                    approval_id = approvals[0].get("id")
        
        if not approval_id:
            pytest.skip("No pending approval available for testing")
        
        # Admin tries to check - should fail with 403
        response = api_client.post(
            f"{BASE_URL}/api/approvals/{approval_id}/check",
            json={"action": "approve", "comment": "Admin trying to check"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        data = response.json()
        assert "Only checkers can perform this action" in data.get("detail", ""), f"Wrong error message: {data}"
        print("PASS: Admin correctly blocked from check action with 403")


# =============================================================================
# Test 2: Admin CANNOT perform approve action (403)
# =============================================================================

class TestAdminBlockedFromApprove:
    """Admin/superuser should NOT be able to perform approve action"""

    def test_admin_cannot_approve(self, api_client):
        """Admin trying to approve should get 403"""
        token = get_auth_token(api_client, ADMIN_CREDS)
        if not token:
            pytest.skip("Admin login failed")
        
        # Get any checked approval from queue
        queue_response = api_client.get(
            f"{BASE_URL}/api/approvals/queue",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if queue_response.status_code != 200:
            pytest.skip("Failed to get approval queue")
        
        approvals = queue_response.json()
        checked_approvals = [a for a in approvals if a.get("status") == "checked"]
        
        # If no checked approvals, use any approval to test the 403
        test_approval_id = None
        if checked_approvals:
            test_approval_id = checked_approvals[0].get("id")
        elif approvals:
            # Even with pending approval, admin should get 403 on approve endpoint
            test_approval_id = approvals[0].get("id")
        
        if not test_approval_id:
            pytest.skip("No approval available for testing")
        
        # Admin tries to approve - should fail with 403
        response = api_client.post(
            f"{BASE_URL}/api/approvals/{test_approval_id}/approve",
            json={"action": "approve", "comment": "Admin trying to approve"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        data = response.json()
        assert "Only approvers can perform this action" in data.get("detail", ""), f"Wrong error message: {data}"
        print("PASS: Admin correctly blocked from approve action with 403")


# =============================================================================
# Test 3: Admin CAN add comments via POST /api/approvals/{id}/comment
# =============================================================================

class TestAdminCommentEndpoint:
    """Admin can add comments/queries to approvals"""

    def test_admin_can_add_comment(self, api_client):
        """Admin should successfully add comment to an approval"""
        token = get_auth_token(api_client, ADMIN_CREDS)
        if not token:
            pytest.skip("Admin login failed")
        
        # Get any approval
        queue_response = api_client.get(
            f"{BASE_URL}/api/approvals/queue",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if queue_response.status_code != 200:
            pytest.skip("Failed to get approval queue")
        
        approvals = queue_response.json()
        # Get a non-approved/rejected approval for comment
        active_approvals = [a for a in approvals if a.get("status") in ["pending", "checked"]]
        
        if not active_approvals:
            # If all processed, just use any approval
            if approvals:
                test_approval_id = approvals[0].get("id")
            else:
                pytest.skip("No approvals available")
        else:
            test_approval_id = active_approvals[0].get("id")
        
        # Admin adds comment
        comment_text = f"Test admin comment at {datetime.now().isoformat()}"
        response = api_client.post(
            f"{BASE_URL}/api/approvals/{test_approval_id}/comment",
            json={"comment": comment_text, "target_role": "checker"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "Comment added successfully" in data.get("message", ""), f"Wrong message: {data}"
        assert data.get("comment", {}).get("comment") == comment_text
        print(f"PASS: Admin successfully added comment to approval {test_approval_id}")

    def test_non_admin_cannot_use_comment_endpoint(self, api_client):
        """Non-admin users should not be able to use comment endpoint"""
        token = get_auth_token(api_client, MAKER_CREDS)
        if not token:
            pytest.skip("Maker login failed")
        
        # Try to get any approval via admin token first
        admin_token = get_auth_token(api_client, ADMIN_CREDS)
        queue_response = api_client.get(
            f"{BASE_URL}/api/approvals/queue",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        if queue_response.status_code != 200 or not queue_response.json():
            pytest.skip("No approvals available")
        
        approval_id = queue_response.json()[0].get("id")
        
        # Maker tries to use comment endpoint
        response = api_client.post(
            f"{BASE_URL}/api/approvals/{approval_id}/comment",
            json={"comment": "Maker trying to comment"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 403, f"Expected 403 for maker, got {response.status_code}"
        print("PASS: Non-admin correctly blocked from comment endpoint")


# =============================================================================
# Test 4: Checker CAN perform check action
# =============================================================================

class TestCheckerActions:
    """Checker should be able to verify and forward/return approvals"""

    def test_checker_can_access_pending_approvals(self, api_client):
        """Checker should see pending approvals in queue"""
        token = get_auth_token(api_client, CHECKER_CREDS)
        if not token:
            pytest.skip("Checker login failed")
        
        response = api_client.get(
            f"{BASE_URL}/api/approvals/queue",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        approvals = response.json()
        
        # Checker should only see pending approvals
        for approval in approvals:
            assert approval.get("status") == "pending", f"Checker should only see pending, got: {approval.get('status')}"
        
        print(f"PASS: Checker can see {len(approvals)} pending approvals")

    def test_checker_cannot_approve_directly(self, api_client):
        """Checker trying to use approve endpoint should get 403"""
        token = get_auth_token(api_client, CHECKER_CREDS)
        if not token:
            pytest.skip("Checker login failed")
        
        # Get any approval
        queue_response = api_client.get(
            f"{BASE_URL}/api/approvals/queue",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        if queue_response.status_code != 200 or not queue_response.json():
            pytest.skip("No approvals available")
        
        approval_id = queue_response.json()[0].get("id")
        
        # Checker tries to use approve endpoint (should be blocked)
        response = api_client.post(
            f"{BASE_URL}/api/approvals/{approval_id}/approve",
            json={"action": "approve", "comment": "Checker trying to approve"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("PASS: Checker correctly blocked from approve endpoint")


# =============================================================================
# Test 5: Approver CAN perform approve action on checked items
# =============================================================================

class TestApproverActions:
    """Approver should be able to give final approval on checked items"""

    def test_approver_can_access_checked_approvals(self, api_client):
        """Approver should see checked approvals in queue"""
        token = get_auth_token(api_client, APPROVER_CREDS)
        if not token:
            pytest.skip("Approver login failed")
        
        response = api_client.get(
            f"{BASE_URL}/api/approvals/queue",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        approvals = response.json()
        
        # Approver should only see checked approvals
        for approval in approvals:
            assert approval.get("status") == "checked", f"Approver should only see checked, got: {approval.get('status')}"
        
        print(f"PASS: Approver can see {len(approvals)} checked approvals")

    def test_approver_cannot_check(self, api_client):
        """Approver trying to use check endpoint should get 403"""
        token = get_auth_token(api_client, APPROVER_CREDS)
        if not token:
            pytest.skip("Approver login failed")
        
        # Get any pending approval via checker
        checker_token = get_auth_token(api_client, CHECKER_CREDS)
        queue_response = api_client.get(
            f"{BASE_URL}/api/approvals/queue",
            headers={"Authorization": f"Bearer {checker_token}"}
        )
        
        if queue_response.status_code != 200 or not queue_response.json():
            pytest.skip("No pending approvals available")
        
        approval_id = queue_response.json()[0].get("id")
        
        # Approver tries to use check endpoint (should be blocked)
        response = api_client.post(
            f"{BASE_URL}/api/approvals/{approval_id}/check",
            json={"action": "approve", "comment": "Approver trying to check"},
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}"
        print("PASS: Approver correctly blocked from check endpoint")


# =============================================================================
# Test 6: Approval Queue filters by role
# =============================================================================

class TestApprovalQueueFiltering:
    """Test that approval queue returns appropriate items per role"""

    def test_admin_sees_all_approvals(self, api_client):
        """Admin should see all approvals (not just pending or checked)"""
        token = get_auth_token(api_client, ADMIN_CREDS)
        if not token:
            pytest.skip("Admin login failed")
        
        response = api_client.get(
            f"{BASE_URL}/api/approvals/queue",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        approvals = response.json()
        
        # Admin can see all statuses
        statuses = set(a.get("status") for a in approvals)
        print(f"PASS: Admin sees {len(approvals)} approvals with statuses: {statuses}")

    def test_maker_cannot_access_queue(self, api_client):
        """Maker should NOT have access to approval queue"""
        token = get_auth_token(api_client, MAKER_CREDS)
        if not token:
            pytest.skip("Maker login failed")
        
        response = api_client.get(
            f"{BASE_URL}/api/approvals/queue",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 403, f"Expected 403 for maker, got {response.status_code}"
        print("PASS: Maker correctly blocked from approval queue")


# =============================================================================
# Test 7: Full approval workflow (Maker -> Checker -> Approver)
# =============================================================================

class TestFullApprovalWorkflow:
    """Test the complete approval workflow"""

    def test_full_workflow_vehicle_approval(self, api_client):
        """
        Complete workflow test:
        1. Maker creates vehicle -> creates pending approval
        2. Checker verifies and forwards to approver
        3. Approver gives final approval
        """
        # Step 1: Maker creates vehicle
        maker_token = get_auth_token(api_client, MAKER_CREDS)
        if not maker_token:
            pytest.skip("Maker login failed")
        
        vehicle_no = f"FLOW{datetime.now().strftime('%H%M%S')}"
        vehicle_data = {
            "vehicle_no": vehicle_no,
            "owner_name": "Workflow Test Owner",
            "make": "WORKFLOW TEST",
            "vehicle_type": "Test",
            "plant": "Test Plant"
        }
        
        create_response = api_client.post(
            f"{BASE_URL}/api/vehicles",
            json=vehicle_data,
            headers={"Authorization": f"Bearer {maker_token}"}
        )
        
        if create_response.status_code not in [200, 201]:
            pytest.skip(f"Failed to create vehicle: {create_response.text}")
        
        vehicle_id = create_response.json().get("id")
        print(f"Step 1 PASS: Maker created vehicle {vehicle_id}")
        
        # Step 2: Checker finds and verifies
        checker_token = get_auth_token(api_client, CHECKER_CREDS)
        queue_response = api_client.get(
            f"{BASE_URL}/api/approvals/queue",
            headers={"Authorization": f"Bearer {checker_token}"}
        )
        
        assert queue_response.status_code == 200
        pending_approvals = queue_response.json()
        
        # Find the approval for our vehicle
        approval_id = None
        for approval in pending_approvals:
            if approval.get("entity_id") == vehicle_id:
                approval_id = approval.get("id")
                break
        
        if not approval_id:
            pytest.skip("Approval not found for created vehicle")
        
        # Checker forwards to approver
        check_response = api_client.post(
            f"{BASE_URL}/api/approvals/{approval_id}/check",
            json={"action": "approve", "comment": "Verified by checker"},
            headers={"Authorization": f"Bearer {checker_token}"}
        )
        
        assert check_response.status_code == 200, f"Checker check failed: {check_response.text}"
        assert check_response.json().get("status") == "checked"
        print(f"Step 2 PASS: Checker verified and forwarded to approver")
        
        # Step 3: Approver gives final approval
        approver_token = get_auth_token(api_client, APPROVER_CREDS)
        approve_response = api_client.post(
            f"{BASE_URL}/api/approvals/{approval_id}/approve",
            json={"action": "approve", "comment": "Final approval granted"},
            headers={"Authorization": f"Bearer {approver_token}"}
        )
        
        assert approve_response.status_code == 200, f"Approver approval failed: {approve_response.text}"
        assert approve_response.json().get("status") == "approved"
        print(f"Step 3 PASS: Approver gave final approval")
        
        # Verify vehicle is now active
        vehicle_response = api_client.get(
            f"{BASE_URL}/api/vehicles/{vehicle_id}",
            headers={"Authorization": f"Bearer {maker_token}"}
        )
        
        if vehicle_response.status_code == 200:
            vehicle_status = vehicle_response.json().get("status")
            assert vehicle_status == "active", f"Vehicle should be active, got: {vehicle_status}"
            print(f"WORKFLOW COMPLETE: Vehicle {vehicle_id} is now active")


# =============================================================================
# Test 8: Approval includes attached documents
# =============================================================================

class TestApprovalDocuments:
    """Test that approval queue returns attached documents"""

    def test_approval_includes_documents_field(self, api_client):
        """Approvals in queue should include documents array"""
        token = get_auth_token(api_client, ADMIN_CREDS)
        if not token:
            pytest.skip("Admin login failed")
        
        response = api_client.get(
            f"{BASE_URL}/api/approvals/queue",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        approvals = response.json()
        
        if not approvals:
            pytest.skip("No approvals to test")
        
        # Check first approval has documents field
        first_approval = approvals[0]
        assert "documents" in first_approval, "Approval should include 'documents' field"
        assert isinstance(first_approval["documents"], list), "documents should be a list"
        print(f"PASS: Approval includes documents array with {len(first_approval['documents'])} items")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
