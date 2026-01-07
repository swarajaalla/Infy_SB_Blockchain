#!/bin/bash
# Quick Test Script for Ledger API

echo "🔥 Testing Ledger API..."

# Step 1: Register
echo -e "\n1️⃣ Registering user..."
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Test User",
    "email": "mytest@example.com",
    "password": "test123",
    "role": "corporate",
    "org_name": "MyCompany"
  }'

# Step 2: Login
echo -e "\n\n2️⃣ Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "mytest@example.com",
    "password": "test123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
echo "Token: ${TOKEN:0:30}..."

# Step 3: Create Document
echo -e "\n3️⃣ Creating document..."
DOC_RESPONSE=$(curl -s -X POST http://localhost:8000/documents/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "doc_type": "INVOICE",
    "doc_number": "MY-INV-001",
    "file_url": "http://example.com/invoice.pdf",
    "hash": "my_test_hash_123",
    "issued_at": "2025-12-23T10:00:00"
  }')

DOC_ID=$(echo $DOC_RESPONSE | grep -o '"id":[0-9]*' | cut -d':' -f2)
echo "Document ID: $DOC_ID"

# Step 4: Get All Ledger Entries
echo -e "\n4️⃣ Getting all ledger entries..."
curl -s -X GET http://localhost:8000/ledger/entries \
  -H "Authorization: Bearer $TOKEN" | python -m json.tool

# Step 5: Get Document Ledger
echo -e "\n5️⃣ Getting ledger for document #$DOC_ID..."
curl -s -X GET http://localhost:8000/ledger/documents/$DOC_ID/entries \
  -H "Authorization: Bearer $TOKEN" | python -m json.tool

# Step 6: Create Manual Entry
echo -e "\n6️⃣ Creating manual ledger entry..."
curl -s -X POST http://localhost:8000/ledger/entries \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"document_id\": $DOC_ID,
    \"event_type\": \"ACCESSED\",
    \"description\": \"Manually tested via curl\",
    \"hash_after\": \"my_test_hash_123\"
  }" | python -m json.tool

# Step 7: Get Statistics
echo -e "\n7️⃣ Getting ledger statistics..."
curl -s -X GET http://localhost:8000/ledger/stats \
  -H "Authorization: Bearer $TOKEN" | python -m json.tool

echo -e "\n\n✅ Test complete!"
