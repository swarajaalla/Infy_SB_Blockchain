# ChainDocs - Blockchain Document Management System

This project offers transparent, tamper-evident tracking of trade finance artifacts (LoCs, invoices, shipping docs) with a ledger-style explorer and risk insights.

## ✨ Features

- 🔐 **JWT Authentication** with role-based access control (RBAC)
- 🏢 **Organization Scoping** - Multi-tenant architecture
- 📄 **Document Management** with SHA-256 hash generation
- 🔑 **Hash-Based Document Access** - Secure and tamper-proof
- ✅ **Document Integrity Verification** - Cryptographic verification
- ⛓️ **Blockchain Integration Ready** - Immutable audit trail
- 🔍 **Duplicate Prevention** - Hash-based uniqueness
- 📊 **Audit & Risk Analytics** - Real-time insights

## 🆕 Hash-Based Document Access

The system now uses cryptographic hashes (SHA-256) to access and verify documents:

1. **Upload Document** → Automatically generates unique hash
2. **Store Hash** → Use for future document access
3. **Retrieve Document** → Access using hash code
4. **Verify Integrity** → Confirm document hasn't been tampered with

### Quick Start
```bash
# Upload document
POST /documents/upload → Returns hash code

# Access document by hash
GET /documents/hash/{hash_code}

# Verify document integrity
POST /documents/verify?hash_code={hash}
```

## 📚 Documentation

- **[🔐 Hash Integration Guide](HASH_INTEGRATION_GUIDE.md)** - Complete implementation guide
- **[📋 API Reference](HASH_API_REFERENCE.md)** - Quick reference card
- **[✅ Implementation Summary](IMPLEMENTATION_SUMMARY.md)** - What's been implemented
- **[📖 Swagger Guide](SWAGGER_GUIDE.md)** - API documentation

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- PostgreSQL (or SQLite for development)
- Node.js 16+ (for frontend)

### Backend Setup
```bash
cd ts/backend
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend Setup
```bash
cd ts/frontend
npm install
npm run dev
```

### Test the Integration
```bash
# Run automated hash integration test
python test_hash_integration.py
```

### Access Swagger UI
```
http://localhost:8000/docs
```

## 🧪 Testing

### Quick Test (Easiest)
```bash
./quick_test.sh
```

### Automated Test
```bash
python test_hash_integration.py
```

### Manual Testing
1. **Swagger UI**: http://localhost:8000/docs
2. **Step-by-Step Guide**: See [TESTING_STEPS.md](TESTING_STEPS.md)
3. **API Reference**: See [HASH_API_REFERENCE.md](HASH_API_REFERENCE.md)

## 🔐 Security Features

- JWT-based authentication
- Role-based access control (Bank, Corporate, Auditor, Admin)
- Organization-level data isolation
- SHA-256 cryptographic hashing
- Tamper detection via hash verification
- Duplicate upload prevention

## 📁 Project Structure

```
ts/
├── backend/
│   ├── app/
│   │   ├── auth/          # Authentication & JWT
│   │   ├── core/          # S3, dependencies
│   │   ├── database/      # Models, schemas
│   │   ├── middleware/    # Org context
│   │   ├── routers/       # API endpoints
│   │   └── utils/         # Hashing, permissions
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/          # API integration
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   └── context/      # Auth context
│   └── package.json
```

## 🎯 Use Cases

1. **Trade Finance**: Letter of Credit, Invoice, Bill of Lading
2. **Document Verification**: Tamper-proof document tracking
3. **Audit Trail**: Immutable record of document history
4. **Risk Management**: Real-time risk analytics
5. **Compliance**: Regulatory compliance tracking

## 🤝 Contributing

See individual documentation files for specific implementation details.

## 📝 License

This project is part of the Infosys SpringBoard program.
