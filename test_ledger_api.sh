#!/bin/bash

BASE_URL="http://localhost:8000"
echo "========================================="
echo "TESTING LEDGER API"
echo "========================================="

# 1. Register a test user (or use existing)
echo -e "\n1️⃣ Registering test user..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@ledger.com",
    "password": "password123",
    "role": "corporate",
    "org_name": "TestOrg"
  }')
echo "$REGISTER_RESPONSE" | jq . 2>/dev/null || echo "$REGISTER_RESPONSE"

# 2. Login to get token
echo -e "\n2️⃣ Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@ledger.com",
    "password": "password123"
  }')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.access_token')
USER_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.user.id')
echo "Token: $TOKEN"
echo "User ID: $USER_ID"

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Login failed, exiting..."
  exit 1
fi

# 3. Create a test document (to have something to log)
echo -e "\n3️⃣ Creating a test document..."
DOC_RESPONSE=$(curl -s -X POST "$BASE_URL/documents/" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "doc_type": "INVOICE",
    "doc_number": "INV-001",
    "hash": "test_hash_'$(date +%s)'",
    "issued_at": "'$(date -Iseconds)'"
  }')
echo "$DOC_RESPONSE" | jq .
DOC_ID=$(echo "$DOC_RESPONSE" | jq -r '.id')
echo "Document ID: $DOC_ID"

# 4. Create a manual ledger entry
echo -e "\n4️⃣ Creating manual ledger entry..."
CREATE_ENTRY=$(curl -s -X POST "$BASE_URL/ledger/entries" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "document_id": '$DOC_ID',
    "event_type": "VERIFIED",
    "description": "Manual verification test",
    "hash_after": "test_verification_hash_123"
  }')
echo "$CREATE_ENTRY" | jq .

# 5. Get all ledger entries
echo -e "\n5️⃣ Getting all ledger entries..."
ALL_ENTRIES=$(curl -s -X GET "$BASE_URL/ledger/entries?limit=10" \
  -H "Authorization: Bearer $TOKEN")
echo "$ALL_ENTRIES" | jq .

# 6. Get entries for specific document
echo -e "\n6️⃣ Getting ledger entries for document $DOC_ID..."
DOC_ENTRIES=$(curl -s -X GET "$BASE_URL/ledger/documents/$DOC_ID/entries" \
  -H "Authorization: Bearer $TOKEN")
echo "$DOC_ENTRIES" | jq .

# 7. Get ledger statistics
echo -e "\n7️⃣ Getting ledger statistics..."
STATS=$(curl -s -X GET "$BASE_URL/ledger/stats" \
  -H "Authorization: Bearer $TOKEN")
echo "$STATS" | jq .

# 8. Test filtering by event type
echo -e "\n8️⃣ Getting entries filtered by event type (CREATED)..."
FILTERED=$(curl -s -X GET "$BASE_URL/ledger/entries?event_type=CREATED&limit=5" \
  -H "Authorization: Bearer $TOKEN")
echo "$FILTERED" | jq .

echo -e "\n========================================="
echo "✅ LEDGER API TESTING COMPLETE"
echo "========================================="
