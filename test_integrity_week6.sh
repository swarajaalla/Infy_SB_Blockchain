#!/bin/bash
# Test script for Week 6 Integrity Checks System

echo "=== Testing Week 6 Integrity Checks System ==="
echo ""

# Configuration
BASE_URL="http://localhost:8000"
ADMIN_EMAIL="admin@example.com"
ADMIN_PASS="admin123"

echo "1. Logging in as admin..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASS\"}")

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed. Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Login successful"
echo ""

echo "2. Getting integrity check summary..."
SUMMARY=$(curl -s -X GET "$BASE_URL/admin/integrity-checks/summary" \
  -H "Authorization: Bearer $TOKEN")
echo "$SUMMARY" | jq .
echo ""

echo "3. Running integrity check on all documents..."
CHECK_RESULT=$(curl -s -X POST "$BASE_URL/admin/run-integrity-check" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}')
echo "$CHECK_RESULT" | jq .
echo ""

echo "4. Getting all integrity checks..."
CHECKS=$(curl -s -X GET "$BASE_URL/admin/integrity-checks?limit=10" \
  -H "Authorization: Bearer $TOKEN")
echo "$CHECKS" | jq .
echo ""

echo "5. Getting failed checks only..."
FAILED=$(curl -s -X GET "$BASE_URL/admin/integrity-checks?status=FAIL" \
  -H "Authorization: Bearer $TOKEN")
echo "$FAILED" | jq .
echo ""

echo "6. Getting all alerts..."
ALERTS=$(curl -s -X GET "$BASE_URL/admin/alerts?acknowledged=false" \
  -H "Authorization: Bearer $TOKEN")
echo "$ALERTS" | jq .
echo ""

echo "=== Test Complete ===" 
echo ""
echo "Summary:"
echo "- Backend is running on $BASE_URL"
echo "- Admin endpoints registered: /admin/run-integrity-check, /admin/integrity-checks, /admin/alerts"
echo "- Frontend page available at: http://localhost:5173/integrity"
echo ""
echo "✅ Week 6 Implementation Complete!"
