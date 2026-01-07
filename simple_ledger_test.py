#!/usr/bin/env python3
"""
Simple interactive test for Ledger API
Run: python simple_ledger_test.py
"""

import requests
import json

BASE_URL = "http://localhost:8000"

print("🔥 Interactive Ledger API Test\n")

# Step 1: Login credentials
print("Step 1: Enter credentials (or press Enter for defaults)")
email = input("Email [test@example.com]: ").strip() or "test@example.com"
password = input("Password [test123]: ").strip() or "test123"

# Try to register
print("\n📝 Registering user...")
register_data = {
    "name": "Test User",
    "email": email,
    "password": password,
    "role": "corporate",
    "org_name": "TestOrg"
}
requests.post(f"{BASE_URL}/auth/register", json=register_data)

# Login
print("🔐 Logging in...")
response = requests.post(f"{BASE_URL}/auth/login", json={"email": email, "password": password})
if response.status_code != 200:
    print(f"❌ Login failed: {response.text}")
    exit(1)

token = response.json()["access_token"]
headers = {"Authorization": f"Bearer {token}"}
print(f"✅ Logged in! Token: {token[:30]}...\n")

# Step 2: Create document
print("Step 2: Create a document (creates auto ledger entry)")
doc_data = {
    "doc_type": "INVOICE",
    "doc_number": f"INV-{input('Invoice number [001]: ').strip() or '001'}",
    "file_url": "http://example.com/test.pdf",
    "hash": "test_hash_12345",
    "issued_at": "2025-12-23T10:00:00"
}

response = requests.post(f"{BASE_URL}/documents/", json=doc_data, headers=headers)
if response.status_code == 200:
    doc = response.json()
    doc_id = doc["id"]
    print(f"✅ Document created: ID={doc_id}\n")
else:
    print(f"❌ Failed: {response.text}")
    exit(1)

# Step 3: View ledger entries
print("\n📋 All Ledger Entries:")
response = requests.get(f"{BASE_URL}/ledger/entries", headers=headers)
entries = response.json()
for i, entry in enumerate(entries[:5], 1):
    print(f"  {i}. [{entry['event_type']}] Doc #{entry['document_id']} - {entry.get('description', 'N/A')}")

# Step 4: View document-specific entries
print(f"\n📄 Ledger for Document #{doc_id}:")
response = requests.get(f"{BASE_URL}/ledger/documents/{doc_id}/entries", headers=headers)
entries = response.json()
for entry in entries:
    print(f"  • {entry['event_type']} at {entry['created_at']} by {entry.get('user_name', 'Unknown')}")

# Step 5: Create manual entry
print("\n✏️ Creating manual ledger entry...")
manual_entry = {
    "document_id": doc_id,
    "event_type": "ACCESSED",
    "description": "Manual test access via Python script",
    "hash_after": doc_data["hash"]
}
response = requests.post(f"{BASE_URL}/ledger/entries", json=manual_entry, headers=headers)
if response.status_code == 201:
    entry = response.json()
    print(f"✅ Manual entry created: ID={entry['id']}")
else:
    print(f"❌ Failed: {response.text}")

# Step 6: Get statistics
print("\n📊 Ledger Statistics:")
response = requests.get(f"{BASE_URL}/ledger/stats", headers=headers)
stats = response.json()
print(f"  • Total entries: {stats['total_entries']}")
print(f"  • Recent (24h): {stats['recent_activity_24h']}")
print(f"  • Event types: {list(stats['event_type_breakdown'].keys())}")

print("\n✅ Test complete! Check http://localhost:8000/docs for more endpoints.")
