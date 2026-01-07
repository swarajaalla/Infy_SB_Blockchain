from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.connection import SessionLocal
from app.database import models, schemas
from app.auth.hashing import get_password_hash, verify_password
from app.auth.jwt_handler import create_access_token


router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/register", response_model=schemas.UserOut)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # check if user already exists
    existing = db.query(models.User).filter(models.User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")

    new_user = models.User(
        name=user.name,
        email=user.email,
        password=get_password_hash(user.password),
        role=user.role,
        org_name=user.org_name
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


@router.post("/login", response_model=schemas.Token)
def login(payload: schemas.LoginData, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == payload.email).first()

    # Check user exists first
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Then verify password
    if not verify_password(payload.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({
        "id": user.id,
        "email": user.email,
        "role": user.role,
        "org_name": user.org_name
    })

    return {
        "access_token": token,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "role": user.role,
            "org_name": user.org_name,
            "created_at": user.created_at
        }
    }
