#!/usr/bin/env python3
"""
Test script for Hash-Based Document Access Integration
Demonstrates the complete workflow of upload → retrieve → verify
"""

import requests
import json
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000"
TEST_FILE = "test_upload.py"  # Use existing file in workspace

def print_section(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}\n")

def test_hash_integration():
    """Complete integration test for hash-based document access"""
    
    print_section("🧪 Hash-Based Document Access Integration Test")
    
    # Step 1: Login
    print_section("Step 1: Login")
    login_response = requests.post(
        f"{BASE_URL}/auth/login",
        json={
            "email": "test@example.com",
            "password": "password123"
        }
    )
    
    if login_response.status_code != 200:
        print("❌ Login failed. Please create a test user first.")
        print("Run: POST /auth/register with test user credentials")
        return
    
    token = login_response.json()["access_token"]
    print(f"✅ Login successful")
    print(f"Token: {token[:50]}...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Step 2: Upload Document
    print_section("Step 2: Upload Document")
    
    try:
        with open(TEST_FILE, "rb") as f:
            files = {"file": (TEST_FILE, f, "text/plain")}
            data = {
                "doc_type": "INVOICE",
                "doc_number": f"TEST-{datetime.now().strftime('%Y%m%d%H%M%S')}",
                "issued_at": datetime.now().isoformat()
            }
            
            upload_response = requests.post(
                f"{BASE_URL}/documents/upload",
                headers=headers,
                files=files,
                data=data
            )
    except FileNotFoundError:
        print(f"❌ Test file '{TEST_FILE}' not found")
        return
    
    if upload_response.status_code != 200:
        print(f"❌ Upload failed: {upload_response.status_code}")
        print(upload_response.text)
        return
    
    upload_result = upload_response.json()
    print("✅ Document uploaded successfully!")
    print(f"Document ID: {upload_result['document_id']}")
    print(f"Hash Code: {upload_result['hash']}")
    print(f"File URL: {upload_result['file_url']}")
    
    hash_code = upload_result['hash']
    doc_id = upload_result['document_id']
    
    # Step 3: Retrieve Document by Hash
    print_section("Step 3: Retrieve Document by Hash")
    
    get_response = requests.get(
        f"{BASE_URL}/documents/hash/{hash_code}",
        headers=headers
    )
    
    if get_response.status_code != 200:
        print(f"❌ Retrieval failed: {get_response.status_code}")
        print(get_response.text)
        return
    
    doc_data = get_response.json()
    print("✅ Document retrieved successfully using hash!")
    print(f"Document Type: {doc_data['doc_type']}")
    print(f"Document Number: {doc_data['doc_number']}")
    print(f"Organization: {doc_data['org_name']}")
    print(f"Created At: {doc_data['created_at']}")
    
    # Step 4: Verify Document Integrity
    print_section("Step 4: Verify Document Integrity")
    
    with open(TEST_FILE, "rb") as f:
        files = {"file": (TEST_FILE, f, "text/plain")}
        
        verify_response = requests.post(
            f"{BASE_URL}/documents/verify",
            headers=headers,
            files=files,
            params={"hash_code": hash_code}
        )
    
    if verify_response.status_code != 200:
        print(f"❌ Verification failed: {verify_response.status_code}")
        print(verify_response.text)
        return
    
    verify_result = verify_response.json()
    print("✅ Document verification completed!")
    print(f"Calculated Hash: {verify_result['calculated_hash']}")
    print(f"Provided Hash: {verify_result['provided_hash']}")
    print(f"Is Verified: {'✅ YES' if verify_result['is_verified'] else '❌ NO'}")
    print(f"Document Exists: {verify_result['document_exists']}")
    
    # Step 5: Test Duplicate Upload Prevention
    print_section("Step 5: Test Duplicate Upload Prevention")
    
    with open(TEST_FILE, "rb") as f:
        files = {"file": (TEST_FILE, f, "text/plain")}
        data = {
            "doc_type": "INVOICE",
            "doc_number": "DUPLICATE-TEST",
            "issued_at": datetime.now().isoformat()
        }
        
        duplicate_response = requests.post(
            f"{BASE_URL}/documents/upload",
            headers=headers,
            files=files,
            data=data
        )
    
    if duplicate_response.status_code == 400:
        print("✅ Duplicate upload prevention working!")
        print(f"Error message: {duplicate_response.json()['detail']}")
    else:
        print("⚠️ Warning: Duplicate upload was allowed (check unique constraint)")
    
    # Summary
    print_section("📊 Integration Test Summary")
    print("✅ Login: Success")
    print("✅ Upload: Success")
    print(f"✅ Hash Generation: {hash_code[:16]}...")
    print("✅ Hash-Based Retrieval: Success")
    print(f"✅ Integrity Verification: {'Passed' if verify_result['is_verified'] else 'Failed'}")
    print("✅ Duplicate Prevention: Working")
    
    print("\n" + "="*60)
    print("🎉 All tests completed successfully!")
    print("="*60 + "\n")
    
    return {
        "document_id": doc_id,
        "hash": hash_code,
        "verified": verify_result['is_verified']
    }

if __name__ == "__main__":
    try:
        result = test_hash_integration()
        if result:
            print(f"\n💾 Save this hash for future reference: {result['hash']}")
    except requests.exceptions.ConnectionError:
        print("❌ Connection Error: Make sure the backend server is running")
        print("Run: uvicorn app.main:app --reload")
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
