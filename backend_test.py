import requests
import sys
from datetime import datetime
import json

class SLSAPITester:
    def __init__(self, base_url="https://tender-alloc.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.user_info = None
        
    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=30)

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    if isinstance(response_data, dict) and len(str(response_data)) < 200:
                        print(f"   Response: {response_data}")
                    elif isinstance(response_data, list):
                        print(f"   Response: List with {len(response_data)} items")
                except:
                    print(f"   Response: {response.text[:100]}...")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")

            return success, response.json() if response.text else {}

        except requests.exceptions.RequestException as e:
            print(f"❌ Failed - Network Error: {str(e)}")
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health endpoint"""
        success, response = self.run_test(
            "Health Check",
            "GET", 
            "health",
            200
        )
        return success

    def test_login(self, email="admin@sls.com", password="admin123"):
        """Test login and store token"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "auth/login",
            200,
            data={"email": email, "password": password}
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_info = response.get('user', {})
            print(f"   ✅ Logged in as: {self.user_info.get('name')} ({self.user_info.get('role')})")
            return True
        return False

    def test_dashboard_stats(self):
        """Test dashboard statistics endpoint"""
        success, response = self.run_test(
            "Dashboard Stats",
            "GET",
            "dashboard/stats", 
            200
        )
        
        if success:
            expected_fields = ['total_vehicles', 'active_drivers', 'active_tenders', 'pending_approvals']
            missing_fields = [field for field in expected_fields if field not in response]
            if missing_fields:
                print(f"   ⚠️  Missing fields: {missing_fields}")
            else:
                print(f"   ✅ All required stats fields present")
                
        return success

    def test_vehicles_list(self):
        """Test getting vehicles list"""
        success, response = self.run_test(
            "Vehicles List",
            "GET", 
            "vehicles",
            200
        )
        
        if success:
            print(f"   ✅ Found {len(response)} vehicles")
            
        return success, response

    def test_create_vehicle(self):
        """Test creating a new vehicle"""
        test_vehicle = {
            "vehicle_no": f"TEST{datetime.now().strftime('%H%M%S')}",
            "owner_name": "Test Owner",
            "capacity": "6X2",
            "make": "ASHOK LEYLAND", 
            "chassis_no": f"CHASSIS{datetime.now().strftime('%H%M%S')}",
            "engine_no": f"ENGINE{datetime.now().strftime('%H%M%S')}",
            "rto": "MH12",
            "plant": "Mumbai",
            "tender": "",
            "tender_no": "",
            "manager": "",
            "hypothecation": False,
            "finance_company": "",
            "phone": "9876543210",
            "documents": {
                "rc_expiry": "2025-12-31",
                "insurance_expiry": "2025-12-31",
                "fitness_expiry": "2025-12-31",
                "tax_expiry": "2025-12-31",
                "puc_expiry": "2025-12-31",
                "permit_expiry": "2025-12-31",
                "national_permit_expiry": "2025-12-31"
            }
        }
        
        success, response = self.run_test(
            "Create Vehicle",
            "POST",
            "vehicles",
            200,
            data=test_vehicle
        )
        
        if success:
            vehicle_id = response.get('id')
            print(f"   ✅ Created vehicle with ID: {vehicle_id}")
            print(f"   Status: {response.get('status', 'Unknown')}")
            return True, vehicle_id
            
        return False, None

    def test_approvals_queue(self):
        """Test approvals queue endpoint"""
        success, response = self.run_test(
            "Approvals Queue",
            "GET",
            "approvals/queue",
            200
        )
        
        if success:
            print(f"   ✅ Found {len(response)} items in approval queue")
            
        return success, response

    def test_user_profile(self):
        """Test getting current user profile"""
        success, response = self.run_test(
            "User Profile (/me)",
            "GET",
            "auth/me",
            200
        )
        
        if success:
            print(f"   ✅ User: {response.get('name')} ({response.get('role')})")
            
        return success

def main():
    """Run all backend API tests"""
    print("🚀 Starting SLS Fleet Management API Tests")
    print("=" * 50)
    
    # Initialize tester
    tester = SLSAPITester()
    
    # Test health check first
    if not tester.test_health_check():
        print("❌ Health check failed - API may be down")
        return 1
    
    # Test login
    if not tester.test_login():
        print("❌ Login failed - stopping tests")
        return 1
    
    # Test user profile
    tester.test_user_profile()
    
    # Test dashboard
    tester.test_dashboard_stats()
    
    # Test vehicles
    vehicles_success, vehicles_data = tester.test_vehicles_list()
    
    # Test vehicle creation (requires permissions)
    if tester.user_info.get('role') in ['maker', 'admin', 'superuser', 'office_incharge']:
        vehicle_created, vehicle_id = tester.test_create_vehicle()
    else:
        print("⏭️  Skipping vehicle creation - insufficient permissions")
    
    # Test approvals
    tester.test_approvals_queue()
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    success_rate = (tester.tests_passed / tester.tests_run) * 100 if tester.tests_run > 0 else 0
    print(f"📈 Success Rate: {success_rate:.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print(f"⚠️  {tester.tests_run - tester.tests_passed} tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())