#!/usr/bin/env python3
"""Test script to check integrity API and identify 500 errors"""

import requests
import json

BASE_URL = "http://localhost:8000"

def login_as_admin():
    """Login as admin user"""
    # Try to login with admin credentials
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": "admin@test.com", "password": "admin123"}
    )
    
    if response.status_code == 200:
        data = response.json()
        return data.get("access_token")
    else:
        print(f"Login failed: {response.status_code}")
        print(f"Response: {response.text}")
        return None

def test_integrity_summary(token):
    """Test integrity summary endpoint"""
    print("\n=== Testing Integrity Summary ===")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/admin/integrity-checks/summary", headers=headers)
    
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    return response.status_code == 200

def test_get_integrity_checks(token):
    """Test get integrity checks endpoint"""
    print("\n=== Testing Get Integrity Checks ===")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/admin/integrity-checks", headers=headers)
    
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    return response.status_code == 200

def test_run_integrity_check(token):
    """Test run integrity check endpoint"""
    print("\n=== Testing Run Integrity Check ===")
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    response = requests.post(
        f"{BASE_URL}/admin/run-integrity-check",
        headers=headers,
        json={}
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code != 200:
        print("\n!!! ERROR DETECTED !!!")
        try:
            error_data = response.json()
            print(f"Error Detail: {error_data.get('detail', 'No detail provided')}")
        except:
            print(f"Raw error: {response.text}")
    
    return response.status_code == 200

def main():
    print("Starting Integrity API Test...")
    
    # Login
    token = login_as_admin()
    if not token:
        print("Failed to login. Exiting.")
        return
    
    print(f"✓ Login successful! Token: {token[:20]}...")
    
    # Test endpoints
    test_integrity_summary(token)
    test_get_integrity_checks(token)
    test_run_integrity_check(token)
    
    print("\n=== Test Complete ===")

if __name__ == "__main__":
    main()
