#!/bin/bash
echo "Testing login flow..."
echo ""
echo "1. Testing auth endpoint (should work):"
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}' \
  -s | jq -r '.detail // "✅ Login successful!"'
echo ""
echo "2. Testing favicon (should return 404 not 401):"
curl -X GET http://localhost:8000/favicon.ico -s -o /dev/null -w "Status: %{http_code}\n"
