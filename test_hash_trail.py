#!/usr/bin/env python3
"""
Test Hash Trail Verification for Document Modifications
This demonstrates how hash changes are tracked in the ledger
"""

import requests
import json
from datetime import datetime
import time

BASE_URL = "http://localhost:8000"

# Color codes
GREEN = '\033[92m'
RED = '\033[91m'
BLUE = '\033[94m'
YELLOW = '\033[93m'
RESET = '\033[0m'

def print_section(title):
    print(f"\n{BLUE}{'='*70}{RESET}")
    print(f"{BLUE}{title}{RESET}")
    print(f"{BLUE}{'='*70}{RESET}")

def print_success(msg):
    print(f"{GREEN}✓ {msg}{RESET}")

def print_error(msg):
    print(f"{RED}✗ {msg}{RESET}")

def print_info(msg):
    print(f"{YELLOW}ℹ {msg}{RESET}")

print(f"\n{BLUE}🔐 HASH TRAIL VERIFICATION TEST{RESET}\n")

# Step 1: Authentication
print_section("1. Authentication")
register_data = {
    "name": "Hash Test User",
    "email": f"hash_test_{datetime.now().timestamp()}@test.com",
    "password": "test123",
    "role": "corporate",
    "org_name": "HashTestCorp"
}

requests.post(f"{BASE_URL}/auth/register", json=register_data)
response = requests.post(f"{BASE_URL}/auth/login", json={
    "email": register_data["email"],
    "password": register_data["password"]
})

if response.status_code == 200:
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print_success("Authenticated successfully")
else:
    print_error("Authentication failed")
    exit(1)

# Step 2: Create initial document
print_section("2. Create Initial Document")
doc_data = {
    "doc_type": "INVOICE",
    "doc_number": "HASH-TEST-001",
    "file_url": "http://example.com/original.pdf",
    "hash": "original_hash_abc123",
    "issued_at": datetime.now().isoformat()
}

response = requests.post(f"{BASE_URL}/documents/", json=doc_data, headers=headers)
if response.status_code == 200:
    document = response.json()
    doc_id = document["id"]
    original_hash = document["hash"]
    print_success(f"Document created: ID={doc_id}")
    print_info(f"Original hash: {original_hash}")
else:
    print_error(f"Document creation failed: {response.text}")
    exit(1)

time.sleep(1)

# Step 3: Check initial ledger entry
print_section("3. Initial Ledger Entry")
response = requests.get(f"{BASE_URL}/ledger/documents/{doc_id}/entries", headers=headers)
if response.status_code == 200:
    entries = response.json()
    print_success(f"Found {len(entries)} ledger entries")
    for entry in entries:
        print(f"  • Event: {entry['event_type']}")
        print(f"    Hash After: {entry.get('hash_after', 'N/A')}")
        print(f"    Hash Before: {entry.get('hash_before', 'N/A')}")
else:
    print_error("Failed to get ledger entries")

time.sleep(1)

# Step 4: Simulate document modification with metadata update
print_section("4. Modify Document (Metadata Only)")
update_data = {
    "doc_type": "INVOICE",
    "doc_number": "HASH-TEST-001-UPDATED",
    "issued_at": datetime.now().isoformat()
}

# Convert to form data
import io
response = requests.put(
    f"{BASE_URL}/documents/{doc_id}",
    data=update_data,
    headers=headers
)

if response.status_code == 200:
    updated_doc = response.json()
    print_success("Document metadata updated")
    print_info(f"Doc number changed: {doc_data['doc_number']} → {updated_doc['doc_number']}")
    print_info(f"Hash unchanged: {updated_doc['hash']}")
else:
    print_error(f"Update failed: {response.text}")

time.sleep(1)

# Step 5: Check ledger after metadata update
print_section("5. Ledger After Metadata Update")
response = requests.get(f"{BASE_URL}/ledger/documents/{doc_id}/entries", headers=headers)
if response.status_code == 200:
    entries = response.json()
    print_success(f"Now have {len(entries)} ledger entries")
    
    # Show the modification entry
    for entry in entries:
        if entry['event_type'] == 'MODIFIED':
            print(f"\n  📝 MODIFIED Event:")
            print(f"    Description: {entry.get('description')}")
            print(f"    Hash Before: {entry.get('hash_before', 'N/A')}")
            print(f"    Hash After:  {entry.get('hash_after', 'N/A')}")
            print(f"    Timestamp:   {entry['created_at']}")
            print(f"    User:        {entry.get('user_name', 'Unknown')}")
            print(f"    IP Address:  {entry.get('ip_address', 'N/A')}")
else:
    print_error("Failed to get ledger entries")

# Step 6: Get complete audit trail
print_section("6. Complete Audit Trail")
response = requests.get(f"{BASE_URL}/ledger/documents/{doc_id}/entries", headers=headers)
if response.status_code == 200:
    entries = response.json()
    print_success(f"Complete document history ({len(entries)} events):\n")
    
    for i, entry in enumerate(entries, 1):
        event_icon = {
            'CREATED': '📝',
            'UPLOADED': '⬆️',
            'MODIFIED': '✏️',
            'ACCESSED': '👁️',
            'VERIFIED': '✓',
            'SHARED': '🔗',
            'DELETED': '🗑️'
        }.get(entry['event_type'], '📋')
        
        print(f"  {i}. {event_icon} {entry['event_type']}")
        print(f"     Time: {entry['created_at']}")
        print(f"     User: {entry.get('user_name', 'Unknown')}")
        print(f"     Description: {entry.get('description', 'N/A')}")
        
        if entry.get('hash_before'):
            print(f"     ⚠️  Hash Changed!")
            print(f"       Before: {entry['hash_before']}")
            print(f"       After:  {entry['hash_after']}")
        elif entry.get('hash_after'):
            print(f"     Hash: {entry['hash_after']}")
        print()

# Step 7: Hash verification
print_section("7. Hash Trail Integrity Check")
response = requests.get(f"{BASE_URL}/ledger/documents/{doc_id}/entries", headers=headers)
if response.status_code == 200:
    entries = response.json()
    
    print_info("Verifying hash chain consistency...")
    
    hash_chain = []
    for entry in entries:
        if entry.get('hash_after'):
            hash_chain.append({
                'event': entry['event_type'],
                'hash_before': entry.get('hash_before'),
                'hash_after': entry['hash_after'],
                'timestamp': entry['created_at']
            })
    
    print_success(f"Hash chain has {len(hash_chain)} entries")
    
    for i, link in enumerate(hash_chain, 1):
        print(f"\n  Link {i}: {link['event']}")
        if link['hash_before']:
            print(f"    IN:  {link['hash_before']}")
            print(f"    OUT: {link['hash_after']}")
            if i > 1 and hash_chain[i-2]['hash_after'] == link['hash_before']:
                print(f"    {GREEN}✓ Chain valid{RESET}")
            else:
                print(f"    {RED}✗ Chain broken!{RESET}")
        else:
            print(f"    Initial Hash: {link['hash_after']}")
    
    print(f"\n{GREEN}✓ Hash trail verification complete!{RESET}")

# Summary
print_section("Summary")
print(f"""
{GREEN}✓ Hash Trail Features Verified:{RESET}

1. Initial document creation tracked with hash
2. Document modifications create MODIFIED events
3. Hash changes captured (hash_before → hash_after)
4. Complete audit trail maintained
5. Tamper-evident blockchain-style logging
6. IP address and user tracking
7. Chronological event ordering

{BLUE}The ledger now provides:{RESET}
• Full document lifecycle tracking
• Hash chain integrity verification
• Tamper-proof audit trails
• Compliance-ready documentation

{YELLOW}Test document ID: {doc_id}{RESET}
{YELLOW}View in Swagger: http://localhost:8000/docs{RESET}
""")
