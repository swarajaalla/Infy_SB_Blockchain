#!/bin/bash

BASE_URL="http://localhost:8000"

# Login
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@ledger.com", "password": "password123"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.access_token')

echo "Testing manual ledger entry creation..."
echo "========================================="

# Create manual ledger entry
curl -s -X POST "$BASE_URL/ledger/entries" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "document_id": 13,
    "event_type": "VERIFIED",
    "description": "Manual verification test entry",
    "hash_after": "manual_test_hash_abc123"
  }' | jq .

echo -e "\n========================================="
echo "Getting all entries after manual creation..."
curl -s -X GET "$BASE_URL/ledger/entries" \
  -H "Authorization: Bearer $TOKEN" | jq .
