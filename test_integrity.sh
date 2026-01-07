#!/bin/bash
echo "=== Testing Integrity Check System ==="
echo ""

# Login as admin
echo "1. Login as admin..."
TOKEN=$(curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}' | jq -r '.access_token')

if [ "$TOKEN" = "null" ]; then
  echo "❌ Login failed"
  exit 1
fi
echo "✅ Logged in successfully"

# Get summary before check
echo ""
echo "2. Get integrity summary (before check)..."
curl -s -X GET http://localhost:8000/admin/admin/integrity-checks/summary \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# Run integrity check on all documents
echo ""
echo "3. Running integrity check on all documents..."
curl -s -X POST http://localhost:8000/admin/admin/run-integrity-check \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}' | jq '.'

# Get summary after check
echo ""
echo "4. Get integrity summary (after check)..."
curl -s -X GET http://localhost:8000/admin/admin/integrity-checks/summary \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# Get all integrity checks
echo ""
echo "5. Get all integrity checks..."
curl -s -X GET "http://localhost:8000/admin/admin/integrity-checks?limit=10" \
  -H "Authorization: Bearer $TOKEN" | jq '.[] | {id, document_id, status, checked_at}'

# Get alerts
echo ""
echo "6. Get alerts..."
curl -s -X GET "http://localhost:8000/admin/admin/alerts?limit=5" \
  -H "Authorization: Bearer $TOKEN" | jq '.[] | {id, alert_type, severity, message, acknowledged}'

echo ""
echo "=== Test Complete ==="
