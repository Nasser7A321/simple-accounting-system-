#!/usr/bin/env python3
"""
Backend API Testing for Arabic Accounting System
Tests all endpoints with proper authentication and role-based access
"""

import requests
import sys
import json
from datetime import datetime, timedelta
import uuid

class AccountingSystemTester:
    def __init__(self, base_url="https://fintrack-pro-5.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.admin_token = None
        self.accountant_token = None
        self.viewer_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_user_id = None
        self.created_transaction_id = None

    def log_test(self, name, success, details=""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
    def make_request(self, method, endpoint, data=None, token=None, expected_status=200):
        """Make HTTP request with proper headers"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'
            
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)
            
            success = response.status_code == expected_status
            return success, response
            
        except Exception as e:
            return False, str(e)

    def test_admin_login(self):
        """Test admin login with correct credentials"""
        print("\n🔐 Testing Admin Authentication...")
        
        success, response = self.make_request(
            'POST', 
            'auth/login',
            data={
                "username": "Nasser7A321",
                "password": "@Nasser7Ali321@"
            }
        )
        
        if success and hasattr(response, 'json'):
            try:
                data = response.json()
                if 'access_token' in data and 'user_info' in data:
                    self.admin_token = data['access_token']
                    user_info = data['user_info']
                    self.log_test("Admin Login", True, f"User: {user_info.get('full_name', 'N/A')}")
                    return True
                else:
                    self.log_test("Admin Login", False, "Missing token or user_info in response")
                    return False
            except Exception as e:
                self.log_test("Admin Login", False, f"JSON parsing error: {str(e)}")
                return False
        else:
            self.log_test("Admin Login", False, f"Request failed: {response}")
            return False

    def test_invalid_login(self):
        """Test login with invalid credentials"""
        success, response = self.make_request(
            'POST',
            'auth/login', 
            data={
                "username": "invalid_user",
                "password": "wrong_password"
            },
            expected_status=401
        )
        self.log_test("Invalid Login Rejection", success)

    def test_get_current_user(self):
        """Test getting current user info"""
        if not self.admin_token:
            self.log_test("Get Current User", False, "No admin token available")
            return
            
        success, response = self.make_request('GET', 'auth/me', token=self.admin_token)
        
        if success and hasattr(response, 'json'):
            try:
                user_data = response.json()
                expected_fields = ['id', 'username', 'email', 'full_name', 'role']
                has_all_fields = all(field in user_data for field in expected_fields)
                self.log_test("Get Current User", has_all_fields, 
                            f"Role: {user_data.get('role', 'N/A')}")
            except:
                self.log_test("Get Current User", False, "Invalid JSON response")
        else:
            self.log_test("Get Current User", False, "Request failed")

    def test_dashboard_stats(self):
        """Test dashboard statistics endpoint"""
        if not self.admin_token:
            self.log_test("Dashboard Stats", False, "No admin token available")
            return
            
        success, response = self.make_request('GET', 'dashboard/stats', token=self.admin_token)
        
        if success and hasattr(response, 'json'):
            try:
                stats = response.json()
                expected_fields = ['total_income', 'total_expenses', 'net_profit', 'total_users', 'total_transactions']
                has_all_fields = all(field in stats for field in expected_fields)
                self.log_test("Dashboard Stats", has_all_fields,
                            f"Users: {stats.get('total_users', 0)}, Transactions: {stats.get('total_transactions', 0)}")
            except:
                self.log_test("Dashboard Stats", False, "Invalid JSON response")
        else:
            self.log_test("Dashboard Stats", False, "Request failed")

    def test_create_user(self):
        """Test creating a new user (admin only)"""
        if not self.admin_token:
            self.log_test("Create User", False, "No admin token available")
            return
            
        print("\n👥 Testing User Management...")
        
        test_username = f"test_accountant_{datetime.now().strftime('%H%M%S')}"
        user_data = {
            "username": test_username,
            "email": f"{test_username}@test.com",
            "password": "TestPassword123!",
            "full_name": "محاسب تجريبي",
            "role": "accountant"
        }
        
        success, response = self.make_request(
            'POST', 
            'auth/register', 
            data=user_data, 
            token=self.admin_token,
            expected_status=200
        )
        
        if success and hasattr(response, 'json'):
            try:
                created_user = response.json()
                self.created_user_id = created_user.get('id')
                self.log_test("Create User", True, f"Created user: {created_user.get('username')}")
                
                # Test login with new user
                login_success, login_response = self.make_request(
                    'POST',
                    'auth/login',
                    data={
                        "username": test_username,
                        "password": "TestPassword123!"
                    }
                )
                
                if login_success and hasattr(login_response, 'json'):
                    login_data = login_response.json()
                    if 'access_token' in login_data:
                        self.accountant_token = login_data['access_token']
                        self.log_test("New User Login", True)
                    else:
                        self.log_test("New User Login", False, "No access token")
                else:
                    self.log_test("New User Login", False, "Login request failed")
                    
            except Exception as e:
                self.log_test("Create User", False, f"JSON parsing error: {str(e)}")
        else:
            self.log_test("Create User", False, "Request failed")

    def test_get_users(self):
        """Test getting users list"""
        if not self.admin_token:
            self.log_test("Get Users", False, "No admin token available")
            return
            
        success, response = self.make_request('GET', 'users', token=self.admin_token)
        
        if success and hasattr(response, 'json'):
            try:
                users = response.json()
                if isinstance(users, list) and len(users) > 0:
                    self.log_test("Get Users", True, f"Found {len(users)} users")
                else:
                    self.log_test("Get Users", False, "No users returned or invalid format")
            except:
                self.log_test("Get Users", False, "Invalid JSON response")
        else:
            self.log_test("Get Users", False, "Request failed")

    def test_transaction_management(self):
        """Test transaction CRUD operations"""
        if not self.admin_token:
            self.log_test("Transaction Management", False, "No admin token available")
            return
            
        print("\n💰 Testing Transaction Management...")
        
        # Test creating income transaction
        income_data = {
            "type": "income",
            "amount": 5000.0,
            "category": "راتب",
            "description": "راتب شهر يناير",
            "date": datetime.now().isoformat()
        }
        
        success, response = self.make_request(
            'POST',
            'transactions',
            data=income_data,
            token=self.admin_token,
            expected_status=200
        )
        
        if success and hasattr(response, 'json'):
            try:
                transaction = response.json()
                self.created_transaction_id = transaction.get('id')
                self.log_test("Create Income Transaction", True, 
                            f"Amount: {transaction.get('amount')} SAR")
            except:
                self.log_test("Create Income Transaction", False, "Invalid JSON response")
        else:
            self.log_test("Create Income Transaction", False, "Request failed")
            
        # Test creating expense transaction
        expense_data = {
            "type": "expense", 
            "amount": 1500.0,
            "category": "إيجار",
            "description": "إيجار المكتب لشهر يناير",
            "date": datetime.now().isoformat()
        }
        
        success, response = self.make_request(
            'POST',
            'transactions',
            data=expense_data,
            token=self.admin_token,
            expected_status=200
        )
        
        if success:
            self.log_test("Create Expense Transaction", True, "Amount: 1500 SAR")
        else:
            self.log_test("Create Expense Transaction", False, "Request failed")

    def test_get_transactions(self):
        """Test getting transactions list"""
        if not self.admin_token:
            self.log_test("Get Transactions", False, "No admin token available")
            return
            
        success, response = self.make_request('GET', 'transactions', token=self.admin_token)
        
        if success and hasattr(response, 'json'):
            try:
                transactions = response.json()
                if isinstance(transactions, list):
                    self.log_test("Get Transactions", True, f"Found {len(transactions)} transactions")
                else:
                    self.log_test("Get Transactions", False, "Invalid response format")
            except:
                self.log_test("Get Transactions", False, "Invalid JSON response")
        else:
            self.log_test("Get Transactions", False, "Request failed")

    def test_update_transaction(self):
        """Test updating a transaction"""
        if not self.admin_token or not self.created_transaction_id:
            self.log_test("Update Transaction", False, "No token or transaction ID available")
            return
            
        updated_data = {
            "type": "income",
            "amount": 5500.0,  # Updated amount
            "category": "راتب",
            "description": "راتب شهر يناير - محدث",
            "date": datetime.now().isoformat()
        }
        
        success, response = self.make_request(
            'PUT',
            f'transactions/{self.created_transaction_id}',
            data=updated_data,
            token=self.admin_token
        )
        
        if success:
            self.log_test("Update Transaction", True, "Updated amount to 5500 SAR")
        else:
            self.log_test("Update Transaction", False, "Request failed")

    def test_get_categories(self):
        """Test getting transaction categories"""
        success, response = self.make_request('GET', 'categories')
        
        if success and hasattr(response, 'json'):
            try:
                data = response.json()
                if 'categories' in data and isinstance(data['categories'], list):
                    categories = data['categories']
                    self.log_test("Get Categories", True, f"Found {len(categories)} categories")
                else:
                    self.log_test("Get Categories", False, "Invalid response format")
            except:
                self.log_test("Get Categories", False, "Invalid JSON response")
        else:
            self.log_test("Get Categories", False, "Request failed")

    def test_activity_logs(self):
        """Test getting activity logs"""
        if not self.admin_token:
            self.log_test("Get Activity Logs", False, "No admin token available")
            return
            
        print("\n📋 Testing Activity Logs...")
        
        success, response = self.make_request('GET', 'logs', token=self.admin_token)
        
        if success and hasattr(response, 'json'):
            try:
                logs = response.json()
                if isinstance(logs, list):
                    self.log_test("Get Activity Logs", True, f"Found {len(logs)} log entries")
                else:
                    self.log_test("Get Activity Logs", False, "Invalid response format")
            except:
                self.log_test("Get Activity Logs", False, "Invalid JSON response")
        else:
            self.log_test("Get Activity Logs", False, "Request failed")

    def test_role_permissions(self):
        """Test role-based access control"""
        if not self.accountant_token:
            self.log_test("Role Permissions", False, "No accountant token available")
            return
            
        print("\n🔒 Testing Role-Based Permissions...")
        
        # Accountant should NOT be able to create users
        user_data = {
            "username": "unauthorized_user",
            "email": "unauthorized@test.com", 
            "password": "TestPassword123!",
            "full_name": "Unauthorized User",
            "role": "viewer"
        }
        
        success, response = self.make_request(
            'POST',
            'auth/register',
            data=user_data,
            token=self.accountant_token,
            expected_status=403
        )
        
        self.log_test("Accountant Cannot Create Users", success, "Proper 403 Forbidden response")
        
        # Accountant SHOULD be able to create transactions
        transaction_data = {
            "type": "expense",
            "amount": 200.0,
            "category": "مكتب",
            "description": "أقلام ومستلزمات مكتبية",
            "date": datetime.now().isoformat()
        }
        
        success, response = self.make_request(
            'POST',
            'transactions',
            data=transaction_data,
            token=self.accountant_token,
            expected_status=200
        )
        
        self.log_test("Accountant Can Create Transactions", success)

    def test_cleanup(self):
        """Clean up test data"""
        if not self.admin_token:
            return
            
        print("\n🧹 Cleaning Up Test Data...")
        
        # Delete created transaction
        if self.created_transaction_id:
            success, response = self.make_request(
                'DELETE',
                f'transactions/{self.created_transaction_id}',
                token=self.admin_token
            )
            self.log_test("Delete Test Transaction", success)
            
        # Delete created user
        if self.created_user_id:
            success, response = self.make_request(
                'DELETE',
                f'users/{self.created_user_id}',
                token=self.admin_token
            )
            self.log_test("Delete Test User", success)

    def run_all_tests(self):
        """Run comprehensive backend API tests"""
        print("🚀 Starting Comprehensive Backend API Testing...")
        print(f"📍 Testing API at: {self.api_url}")
        print("=" * 60)
        
        # Authentication Tests
        if not self.test_admin_login():
            print("❌ Critical: Admin login failed. Cannot continue with other tests.")
            return False
            
        self.test_invalid_login()
        self.test_get_current_user()
        
        # Dashboard Tests
        self.test_dashboard_stats()
        
        # User Management Tests
        self.test_create_user()
        self.test_get_users()
        
        # Transaction Management Tests
        self.test_transaction_management()
        self.test_get_transactions()
        self.test_update_transaction()
        self.test_get_categories()
        
        # Activity Logs Tests
        self.test_activity_logs()
        
        # Permission Tests
        self.test_role_permissions()
        
        # Cleanup
        self.test_cleanup()
        
        # Final Results
        print("\n" + "=" * 60)
        print(f"📊 TEST RESULTS: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 ALL TESTS PASSED! Backend API is working correctly.")
            return True
        else:
            failed_tests = self.tests_run - self.tests_passed
            print(f"⚠️  {failed_tests} tests failed. Please check the issues above.")
            return False

def main():
    """Main test execution"""
    tester = AccountingSystemTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())