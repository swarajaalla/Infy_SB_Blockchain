from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Optional[str] = "corporate"
    org_name: str

# class UserOut(BaseModel):
#     id: int
#     name: str
#     email: EmailStr
#     role: str
#     org_name: str
#     created_at: datetime
#     class Config:
#         orm_mode = True

# class Token(BaseModel):
#     access_token: str
#     token_type: str = "bearer"

class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: str
    org_name: str
    created_at: datetime
    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    user: UserOut



class LoginData(BaseModel):
    email: EmailStr
    password: str

class DocumentCreate(BaseModel):
    doc_type: str
    doc_number: Optional[str] = None
    file_url: Optional[str] = None
    hash: Optional[str] = None
    issued_at: Optional[datetime] = None   # <-- THIS MUST BE OPTIONAL

class DocumentOut(BaseModel):
    id: int
    owner_id: int
    doc_type: str
    doc_number: Optional[str]
    file_url: Optional[str]
    hash: Optional[str]
    issued_at: Optional[datetime]
    created_at: datetime
    org_name: str
    class Config:
        from_attributes = True

class LedgerEntryCreate(BaseModel):
    document_id: int
    event_type: str
    description: Optional[str] = None
    hash_before: Optional[str] = None
    hash_after: Optional[str] = None
    event_metadata: Optional[str] = None  # Renamed from metadata

class LedgerEntryOut(BaseModel):
    id: int
    document_id: int
    user_id: int
    event_type: str
    description: Optional[str]
    hash_before: Optional[str]
    hash_after: Optional[str]
    ip_address: Optional[str]
    user_agent: Optional[str]
    event_metadata: Optional[str]  # Renamed from metadata
    created_at: datetime
    org_name: str
    
    # Nested relations
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    doc_type: Optional[str] = None
    doc_number: Optional[str] = None
    
    class Config:
        from_attributes = True

# Trade Schemas
class TradeCreate(BaseModel):
    seller_email: str
    description: str
    amount: Decimal
    currency: str = "USD"

class TradeUpdate(BaseModel):
    status: Optional[str] = None
    remarks: Optional[str] = None

class TradeStatusHistoryOut(BaseModel):
    id: int
    status: str
    changed_by_id: int
    remarks: Optional[str]
    created_at: datetime
    class Config:
        from_attributes = True

class TradeOut(BaseModel):
    id: int
    trade_number: str
    buyer_id: int
    seller_id: int
    bank_id: Optional[int]
    description: str
    amount: Decimal
    currency: str
    status: str
    created_at: datetime
    updated_at: Optional[datetime]
    completed_at: Optional[datetime]
    buyer: UserOut
    seller: UserOut
    status_history: List[TradeStatusHistoryOut] = []
    class Config:
        from_attributes = True

# Integrity Check Schemas
class IntegrityCheckOut(BaseModel):
    id: int
    document_id: int
    check_type: str
    status: str
    stored_hash: str
    computed_hash: Optional[str]
    checked_at: Optional[datetime]
    checked_by: str
    remarks: Optional[str]
    created_at: datetime
    class Config:
        from_attributes = True

class IntegrityCheckCreate(BaseModel):
    document_ids: Optional[List[int]] = None  # If None, check all documents

# Alert Schemas
class AlertOut(BaseModel):
    id: int
    alert_type: str
    severity: str
    document_id: Optional[int]
    integrity_check_id: Optional[int]
    message: str
    created_at: datetime
    acknowledged: bool
    acknowledged_by_id: Optional[int]
    acknowledged_at: Optional[datetime]
    class Config:
        from_attributes = True

class AlertAcknowledge(BaseModel):
    alert_id: int