from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from fastapi.security import HTTPBearer

# IMPORTANT: This import ensures middleware file loads
from app.middleware.org_context import org_context_middleware

# Routers
from app.routers import routes_auth, routes_users, routes_documents, routes_ledger, routes_trades, routes_admin

# Database initialization
from app.database.connection import Base, engine

print("🔥 main.py LOADED")


# Create DB tables
Base.metadata.create_all(bind=engine)

# Create FastAPI app with security scheme
app = FastAPI(
    title="ChainDocs Backend",
    description="Blockchain Document Management System with JWT, RBAC and Org Scoping",
    version="2.0",
    swagger_ui_parameters={
        "persistAuthorization": True
    }
)

# Security scheme for Swagger UI
security = HTTPBearer()

# Register CORS - MUST be before other middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# REGISTER MIDDLEWARE — THIS MUST RUN!
app.middleware("http")(org_context_middleware)
print("🔥 Middleware registered in main.py")


# ROUTES
app.include_router(routes_auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(routes_users.router, prefix="/users", tags=["Users"])
app.include_router(routes_documents.router, prefix="/documents", tags=["Documents"])
app.include_router(routes_ledger.router, prefix="/ledger", tags=["Ledger"])
app.include_router(routes_trades.router, prefix="/trades", tags=["Trades"])
app.include_router(routes_admin.router, prefix="/admin", tags=["Admin"])

print("🔥 Routers registered")


@app.get("/")
def root():
    return {"msg": "Backend is running successfully with Trade Transactions!"}


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title="ChainDocs Backend - Blockchain Document Management",
        version="2.0.0",
        description="""
## ChainDocs API

### Features:
- 🔐 JWT Authentication
- 👥 Role-Based Access Control (RBAC)
- 🏢 Organization Scoping
- 📄 Document Upload with SHA-256 Hashing
- 🔑 Hash-Based Document Access
- ✅ Document Integrity Verification
- ⛓️ Blockchain Integration Ready

### How to Authenticate:
1. Register a user at `/auth/register`
2. Login at `/auth/login` to get your JWT token
3. Click the **🔓 Authorize** button (top right)
4. Enter your token (without "Bearer" prefix)
5. Click **Authorize** and close the dialog
6. Now you can use all protected endpoints!

### Hash-Based Document Access:
1. Upload document → `/documents/upload` (returns unique hash)
2. Save the hash code from response
3. Access document → `/documents/hash/{hash_code}`
4. Verify integrity → `/documents/verify`

📖 See HASH_INTEGRATION_GUIDE.md for detailed documentation
        """,
        routes=app.routes,
    )

    # ADD THE BEARER AUTH SECURITY SCHEME
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "Enter your JWT token obtained from /auth/login"
        }
    }

    # Apply "BearerAuth" to all protected endpoints
    for path in openapi_schema["paths"]:
        for method in openapi_schema["paths"][path]:
            # skip public paths
            if path.startswith("/auth") or path in ["/", "/docs", "/openapi.json"]:
                continue

            openapi_schema["paths"][path][method]["security"] = [{"BearerAuth": []}]

    app.openapi_schema = openapi_schema
    return app.openapi_schema


app.openapi = custom_openapi
