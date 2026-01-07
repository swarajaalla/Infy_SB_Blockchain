from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, ForeignKey, Numeric, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.database.connection import Base
from pydantic import BaseModel

import enum

class RoleEnum(str, enum.Enum):
    bank = "bank"
    corporate = "corporate"
    auditor = "auditor"
    admin = "admin"

class DocTypeEnum(str, enum.Enum):
    LOC = "LOC"
    INVOICE = "INVOICE"
    BILL_OF_LADING = "BILL_OF_LADING"
    PO = "PO"
    COO = "COO"
    INSURANCE_CERT = "INSURANCE_CERT"

class EventTypeEnum(str, enum.Enum):
    CREATED = "CREATED"
    UPLOADED = "UPLOADED"
    VERIFIED = "VERIFIED"
    ACCESSED = "ACCESSED"
    MODIFIED = "MODIFIED"
    SHARED = "SHARED"
    DELETED = "DELETED"
    INTEGRITY_FAILED = "INTEGRITY_FAILED"

class TradeStatusEnum(str, enum.Enum):
    INITIATED = "INITIATED"
    SELLER_CONFIRMED = "SELLER_CONFIRMED"
    DOCUMENTS_UPLOADED = "DOCUMENTS_UPLOADED"
    BANK_REVIEWING = "BANK_REVIEWING"
    BANK_APPROVED = "BANK_APPROVED"
    PAYMENT_RELEASED = "PAYMENT_RELEASED"
    COMPLETED = "COMPLETED"
    DISPUTED = "DISPUTED"
    CANCELLED = "CANCELLED"

class IntegrityStatusEnum(str, enum.Enum):
    PASS = "PASS"
    FAIL = "FAIL"
    PENDING = "PENDING"

class AlertSeverityEnum(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    role = Column(Enum(RoleEnum), nullable=False)
    org_name = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    documents = relationship("Document", back_populates="owner")
    trades_as_buyer = relationship("Trade", foreign_keys="Trade.buyer_id", back_populates="buyer")
    trades_as_seller = relationship("Trade", foreign_keys="Trade.seller_id", back_populates="seller")

class Document(Base):
    __tablename__ = "documents"
    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    doc_type = Column(Enum(DocTypeEnum))
    doc_number = Column(String)
    file_url = Column(String)
    hash = Column(String, unique=True, index=True)  # Added unique constraint and index
    issued_at = Column(DateTime)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    org_name = Column(String, nullable=False)
    trade_id = Column(Integer, ForeignKey("trades.id"), nullable=True)
    owner = relationship("User", back_populates="documents")
    ledger_entries = relationship("LedgerEntry", back_populates="document")
    trade = relationship("Trade", back_populates="documents")
    integrity_checks = relationship("IntegrityCheck", back_populates="document")
    alerts = relationship("Alert", back_populates="document")

class LedgerEntry(Base):
    __tablename__ = "ledger_entries"
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    event_type = Column(Enum(EventTypeEnum), nullable=False)
    description = Column(Text, nullable=True)
    hash_before = Column(String, nullable=True)  # Hash before the event (for MODIFIED events)
    hash_after = Column(String, nullable=True)   # Hash after the event
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    event_metadata = Column(Text, nullable=True)  # JSON string for additional metadata (renamed from 'metadata')
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    org_name = Column(String, nullable=False, index=True)
    
    # Relationships
    document = relationship("Document", back_populates="ledger_entries")
    user = relationship("User")
    

class Trade(Base):
    __tablename__ = "trades"
    
    id = Column(Integer, primary_key=True, index=True)
    trade_number = Column(String, unique=True, nullable=False, index=True)
    
    # Parties
    buyer_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    seller_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    bank_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    # Trade Details
    description = Column(Text, nullable=False)
    amount = Column(Numeric(15, 2), nullable=False)
    currency = Column(String(3), default="USD")
    
    # Status
    status = Column(Enum(TradeStatusEnum), default=TradeStatusEnum.INITIATED)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    buyer = relationship("User", foreign_keys=[buyer_id], back_populates="trades_as_buyer")
    seller = relationship("User", foreign_keys=[seller_id], back_populates="trades_as_seller")
    documents = relationship("Document", back_populates="trade")
    status_history = relationship("TradeStatusHistory", back_populates="trade", order_by="TradeStatusHistory.created_at")

class TradeStatusHistory(Base):
    __tablename__ = "trade_status_history"
    
    id = Column(Integer, primary_key=True, index=True)
    trade_id = Column(Integer, ForeignKey("trades.id"), nullable=False)
    status = Column(Enum(TradeStatusEnum), nullable=False)
    changed_by_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    trade = relationship("Trade", back_populates="status_history")
    changed_by = relationship("User")

class IntegrityCheck(Base):
    __tablename__ = "integrity_checks"
    
    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    check_type = Column(String, default="SHA256", nullable=False)  # Type of integrity check
    status = Column(Enum(IntegrityStatusEnum), default=IntegrityStatusEnum.PENDING, nullable=False)
    stored_hash = Column(String, nullable=False)  # Hash stored in document record
    computed_hash = Column(String, nullable=True)  # Newly computed hash from file
    checked_at = Column(DateTime(timezone=True), nullable=True)  # When check was performed
    checked_by = Column(String, default="SYSTEM", nullable=False)  # Always SYSTEM for security
    remarks = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    document = relationship("Document", back_populates="integrity_checks")

class Alert(Base):
    __tablename__ = "alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    alert_type = Column(String, nullable=False)  # e.g., "INTEGRITY_FAILURE", "SUSPICIOUS_ACTIVITY"
    severity = Column(Enum(AlertSeverityEnum), default=AlertSeverityEnum.MEDIUM, nullable=False)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)  # Optional reference
    integrity_check_id = Column(Integer, ForeignKey("integrity_checks.id"), nullable=True)  # Link to check
    message = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    acknowledged = Column(Boolean, default=False, nullable=False)
    acknowledged_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    acknowledged_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    document = relationship("Document", back_populates="alerts")
    integrity_check = relationship("IntegrityCheck")
    acknowledged_by = relationship("User")

