print("🔥 ORG CONTEXT MIDDLEWARE LOADED")

from fastapi import Request
from fastapi.responses import JSONResponse
from jose import jwt, JWTError
from app.config import SECRET_KEY, ALGORITHM


async def org_context_middleware(request: Request, call_next):

    path = request.url.path
    
    # CRITICAL: Allow OPTIONS requests for CORS preflight
    if request.method == "OPTIONS":
        return await call_next(request)

    # Allow ONLY exact root path
    if path == "/":
        return await call_next(request)

    # Allow auth-related paths
    if path.startswith("/auth"):
        return await call_next(request)

    # Allow Swagger UI & OpenAPI & favicon
    if path in ["/docs", "/openapi.json", "/favicon.ico"]:
        return await call_next(request)

    # Debug: print every protected path
    print("🔒 Protected path accessed:", path)

    # Read Auth header
    auth = request.headers.get("authorization")
    print("AUTH HEADER RECEIVED:", auth)

    if not auth:
        return JSONResponse(status_code=401, content={"detail": "Missing authorization header"})

    try:
        scheme, token = auth.split()
        if scheme.lower() != "bearer":
            return JSONResponse(status_code=401, content={"detail": "Invalid auth scheme"})
    except:
        return JSONResponse(status_code=401, content={"detail": "Invalid authorization format"})

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        print("JWT PAYLOAD:", payload)
    except jwt.ExpiredSignatureError:
        return JSONResponse(status_code=401, content={"detail": "Token has expired. Please login again."})
    except jwt.JWTClaimsError as e:
        return JSONResponse(status_code=401, content={"detail": f"Invalid token claims: {str(e)}"})
    except JWTError as e:
        return JSONResponse(status_code=401, content={
            "detail": f"Invalid token: {str(e)}",
            "hint": "Make sure you're using the token from /auth/login and include 'Bearer ' prefix in Authorization header"
        })

    request.state.user = payload
    return await call_next(request)


def get_org_name(request: Request = None):
    """Helper function to get org_name from current request state"""
    from fastapi import Request as _Req
    from starlette.requests import Request as StarletteRequest
    
    # Try to get from request context
    try:
        from contextvars import ContextVar
        from starlette.middleware.base import RequestResponseEndpoint
        from starlette.requests import Request
        
        # In a typical request context, we can access request.state
        # But since this is called from route handlers, we use dependency injection instead
        # This function is just a fallback
        if request and hasattr(request, 'state') and hasattr(request.state, 'user'):
            return request.state.user.get('org_name')
    except:
        pass
    
    # If called without request (shouldn't happen), return None
    # Routes should pass the current_user's org_name directly
    return None
