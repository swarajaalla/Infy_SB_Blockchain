#!/bin/bash

echo "======================================"
echo "  Frontend-Backend Diagnostic Tool"
echo "======================================"
echo ""

# Check if backend is running
echo "1️⃣ Checking Backend (Port 8000)..."
if lsof -i :8000 > /dev/null 2>&1; then
    echo "   ✅ Backend is running on port 8000"
    BACKEND_PID=$(lsof -t -i :8000 | head -1)
    echo "   PID: $BACKEND_PID"
else
    echo "   ❌ Backend is NOT running on port 8000"
    echo "   Please start backend: cd ts/backend && uvicorn app.main:app --reload"
    exit 1
fi

# Check if frontend is running
echo ""
echo "2️⃣ Checking Frontend (Port 5173)..."
if lsof -i :5173 > /dev/null 2>&1; then
    echo "   ✅ Frontend is running on port 5173"
    FRONTEND_PID=$(lsof -t -i :5173 | head -1)
    echo "   PID: $FRONTEND_PID"
else
    echo "   ❌ Frontend is NOT running on port 5173"
    echo "   Please start frontend: cd ts/frontend && npm run dev"
    exit 1
fi

# Test backend health
echo ""
echo "3️⃣ Testing Backend Health..."
HEALTH=$(curl -s http://localhost:8000/)
if echo "$HEALTH" | grep -q "Backend is running"; then
    echo "   ✅ Backend is responding correctly"
    echo "   Response: $HEALTH"
else
    echo "   ❌ Backend responded but with unexpected content"
    echo "   Response: $HEALTH"
fi

# Test CORS
echo ""
echo "4️⃣ Testing CORS Configuration..."
CORS_HEADER=$(curl -s -I -X OPTIONS http://localhost:8000/auth/login \
    -H "Origin: http://localhost:5173" \
    -H "Access-Control-Request-Method: POST" | grep -i "access-control-allow-origin")

if [ -n "$CORS_HEADER" ]; then
    echo "   ✅ CORS is configured"
    echo "   $CORS_HEADER"
else
    echo "   ⚠️  No CORS header found (might be okay)"
fi

# Test database
echo ""
echo "5️⃣ Checking Database..."
if [ -f "ts/backend/chain_docs.db" ]; then
    echo "   ✅ Database file exists"
    USER_COUNT=$(sqlite3 ts/backend/chain_docs.db "SELECT COUNT(*) FROM users;" 2>/dev/null)
    if [ $? -eq 0 ]; then
        echo "   ✅ Database is accessible"
        echo "   Users in database: $USER_COUNT"
        echo ""
        echo "   Sample users:"
        sqlite3 ts/backend/chain_docs.db "SELECT '   ' || email || ' (' || role || ')' FROM users LIMIT 5;"
    else
        echo "   ❌ Cannot query database"
    fi
else
    echo "   ❌ Database file not found"
fi

# Test login endpoint
echo ""
echo "6️⃣ Testing Login Endpoint..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"test123"}')

if echo "$LOGIN_RESPONSE" | grep -q "access_token"; then
    echo "   ✅ Login endpoint works!"
    echo "   User: $(echo $LOGIN_RESPONSE | jq -r '.user.email' 2>/dev/null)"
    TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.access_token' 2>/dev/null)
    echo "   Token: ${TOKEN:0:30}..."
    
    # Test protected endpoint
    echo ""
    echo "7️⃣ Testing Protected Endpoint with Token..."
    DOCS_RESPONSE=$(curl -s -X GET http://localhost:8000/documents/ \
        -H "Authorization: Bearer $TOKEN")
    
    if echo "$DOCS_RESPONSE" | grep -q "detail"; then
        echo "   ⚠️  Protected endpoint returned error:"
        echo "   $(echo $DOCS_RESPONSE | jq -r '.detail' 2>/dev/null)"
    else
        echo "   ✅ Protected endpoint accessible with token"
    fi
else
    echo "   ❌ Login failed"
    echo "   Response: $LOGIN_RESPONSE"
fi

# Check frontend API configuration
echo ""
echo "8️⃣ Checking Frontend API Configuration..."
if grep -q "localhost:8000" ts/frontend/src/api/*.js 2>/dev/null; then
    echo "   ✅ Frontend is configured to use localhost:8000"
    echo "   Files using localhost:8000:"
    grep -l "localhost:8000" ts/frontend/src/api/*.js | sed 's/^/   - /'
else
    echo "   ❌ Frontend API configuration might be wrong"
fi

echo ""
echo "======================================"
echo "  Diagnostic Complete!"
echo "======================================"
echo ""
echo "📝 Summary:"
echo "   • Backend: http://localhost:8000"
echo "   • Frontend: http://localhost:5173"
echo "   • Test credentials: test@example.com / test123"
echo ""
echo "🌐 Open in browser:"
echo "   http://localhost:5173"
echo ""
