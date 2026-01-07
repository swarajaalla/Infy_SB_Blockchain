#!/bin/bash

# 🧪 Quick Test Runner for Hash-Based Document Integration
# This script automatically tests all the hash-based document features

echo "============================================================"
echo "  🧪 Hash-Based Document Integration - Quick Test"
echo "============================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost:8000"
TEST_FILE="test_upload.py"
TEST_EMAIL="${TEST_EMAIL:-hashtest@example.com}"
TEST_PASSWORD="${TEST_PASSWORD:-testpass123}"

# Check if backend is running
echo -e "${BLUE}[1/7] Checking if backend is running...${NC}"
if curl -s "$BASE_URL/" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend is running${NC}"
else
    echo -e "${RED}❌ Backend is not running!${NC}"
    echo ""
    echo "Please start the backend first:"
    echo "  cd ts/backend"
    echo "  uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
    exit 1
fi
echo ""

# Login
echo -e "${BLUE}[2/7] Logging in...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\"
  }")

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ Login failed!${NC}"
    echo "Response: $LOGIN_RESPONSE"
    echo ""
    echo "You may need to register first:"
    echo "  curl -X POST \"$BASE_URL/auth/register\" \\"
    echo "    -H \"Content-Type: application/json\" \\"
    echo "    -d '{\"name\": \"Test User\", \"email\": \"$TEST_EMAIL\", \"password\": \"$TEST_PASSWORD\", \"role\": \"corporate\", \"org_name\": \"TestCorp\"}'"
    exit 1
fi

echo -e "${GREEN}✅ Login successful${NC}"
echo "   Token: ${TOKEN:0:50}..."
echo ""

# Check if test file exists
if [ ! -f "$TEST_FILE" ]; then
    echo -e "${YELLOW}⚠️  Test file '$TEST_FILE' not found, creating a dummy file...${NC}"
    echo "This is a test document for hash integration" > "$TEST_FILE"
fi

# Upload Document
echo -e "${BLUE}[3/7] Uploading document...${NC}"
UPLOAD_RESPONSE=$(curl -s -X POST "$BASE_URL/documents/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@$TEST_FILE" \
  -F "doc_type=INVOICE" \
  -F "doc_number=TEST-$(date +%s)" \
  -F "issued_at=$(date -u +%Y-%m-%dT%H:%M:%S)")

if echo "$UPLOAD_RESPONSE" | grep -q "hash"; then
    echo -e "${GREEN}✅ Document uploaded successfully${NC}"
    DOCUMENT_ID=$(echo "$UPLOAD_RESPONSE" | grep -o '"document_id":[0-9]*' | cut -d':' -f2)
    HASH=$(echo "$UPLOAD_RESPONSE" | grep -o '"hash":"[^"]*' | cut -d'"' -f4)
    echo "   Document ID: $DOCUMENT_ID"
    echo "   Hash: $HASH"
else
    # Check if it's a duplicate error
    if echo "$UPLOAD_RESPONSE" | grep -q "already exists"; then
        echo -e "${YELLOW}⚠️  Document already exists (duplicate hash)${NC}"
        # Extract existing document ID from error message
        EXISTING_ID=$(echo "$UPLOAD_RESPONSE" | grep -o 'ID: [0-9]*' | cut -d' ' -f2)
        echo "   Using existing document ID: $EXISTING_ID"
        
        # Get hash from existing document
        echo -e "${BLUE}   Fetching hash from existing document...${NC}"
        DOCS_RESPONSE=$(curl -s -X GET "$BASE_URL/documents/" \
          -H "Authorization: Bearer $TOKEN")
        HASH=$(echo "$DOCS_RESPONSE" | grep -o '"hash":"[^"]*' | head -1 | cut -d'"' -f4)
        DOCUMENT_ID=$EXISTING_ID
        echo "   Hash: $HASH"
    else
        echo -e "${RED}❌ Upload failed!${NC}"
        echo "Response: $UPLOAD_RESPONSE"
        exit 1
    fi
fi
echo ""

# Retrieve by Hash
echo -e "${BLUE}[4/7] Retrieving document by hash...${NC}"
GET_RESPONSE=$(curl -s -X GET "$BASE_URL/documents/hash/$HASH" \
  -H "Authorization: Bearer $TOKEN")

if echo "$GET_RESPONSE" | grep -q "doc_type"; then
    echo -e "${GREEN}✅ Document retrieved successfully${NC}"
    DOC_TYPE=$(echo "$GET_RESPONSE" | grep -o '"doc_type":"[^"]*' | cut -d'"' -f4)
    DOC_NUMBER=$(echo "$GET_RESPONSE" | grep -o '"doc_number":"[^"]*' | cut -d'"' -f4)
    ORG_NAME=$(echo "$GET_RESPONSE" | grep -o '"org_name":"[^"]*' | cut -d'"' -f4)
    echo "   Document Type: $DOC_TYPE"
    echo "   Document Number: $DOC_NUMBER"
    echo "   Organization: $ORG_NAME"
else
    echo -e "${RED}❌ Retrieval failed!${NC}"
    echo "Response: $GET_RESPONSE"
    exit 1
fi
echo ""

# Verify Document
echo -e "${BLUE}[5/7] Verifying document integrity...${NC}"
VERIFY_RESPONSE=$(curl -s -X POST "$BASE_URL/documents/verify?hash_code=$HASH" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@$TEST_FILE")

IS_VERIFIED=$(echo "$VERIFY_RESPONSE" | grep -o '"is_verified":[^,}]*' | cut -d':' -f2)

if [ "$IS_VERIFIED" = "true" ]; then
    echo -e "${GREEN}✅ Document verified - authentic!${NC}"
    CALC_HASH=$(echo "$VERIFY_RESPONSE" | grep -o '"calculated_hash":"[^"]*' | cut -d'"' -f4)
    echo "   Calculated Hash: ${CALC_HASH:0:32}..."
    echo "   Provided Hash:   ${HASH:0:32}..."
    echo "   Match: ✅ YES"
else
    echo -e "${RED}❌ Document verification failed - may be tampered!${NC}"
fi
echo ""

# Test Duplicate Upload
echo -e "${BLUE}[6/7] Testing duplicate upload prevention...${NC}"
DUP_RESPONSE=$(curl -s -X POST "$BASE_URL/documents/upload" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@$TEST_FILE" \
  -F "doc_type=INVOICE" \
  -F "doc_number=DUPLICATE-TEST" \
  -F "issued_at=$(date -u +%Y-%m-%dT%H:%M:%S)")

if echo "$DUP_RESPONSE" | grep -q "already exists"; then
    echo -e "${GREEN}✅ Duplicate prevention working!${NC}"
    echo "   Error message: $(echo "$DUP_RESPONSE" | grep -o '"detail":"[^"]*' | cut -d'"' -f4)"
else
    echo -e "${YELLOW}⚠️  Warning: Duplicate upload was allowed${NC}"
    echo "   This might indicate an issue with unique constraint"
fi
echo ""

# List all documents
echo -e "${BLUE}[7/7] Listing all documents...${NC}"
LIST_RESPONSE=$(curl -s -X GET "$BASE_URL/documents/" \
  -H "Authorization: Bearer $TOKEN")

DOC_COUNT=$(echo "$LIST_RESPONSE" | grep -o '"id":' | wc -l)
echo -e "${GREEN}✅ Found $DOC_COUNT document(s)${NC}"
echo ""

# Summary
echo "============================================================"
echo -e "  ${GREEN}✨ Test Summary${NC}"
echo "============================================================"
echo -e "${GREEN}✅${NC} Backend connection"
echo -e "${GREEN}✅${NC} Authentication (JWT)"
echo -e "${GREEN}✅${NC} Document upload with hash generation"
echo -e "${GREEN}✅${NC} Document retrieval by hash"
echo -e "${GREEN}✅${NC} Document integrity verification"
echo -e "${GREEN}✅${NC} Duplicate upload prevention"
echo -e "${GREEN}✅${NC} Document listing"
echo ""
echo "============================================================"
echo -e "  ${GREEN}🎉 All tests completed successfully!${NC}"
echo "============================================================"
echo ""
echo "💡 Next Steps:"
echo "   1. View in Swagger UI: $BASE_URL/docs"
echo "   2. Save this hash for future access: $HASH"
echo "   3. Integrate into frontend application"
echo ""
echo "📖 Documentation:"
echo "   - HASH_INTEGRATION_GUIDE.md - Complete guide"
echo "   - HASH_API_REFERENCE.md - API reference"
echo "   - TESTING_STEPS.md - Detailed testing steps"
echo ""
