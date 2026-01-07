from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import uuid
from datetime import datetime

from app.core.dependencies import get_db, get_current_user
from app.database import models, schemas

router = APIRouter()

def generate_trade_number():
    """Generate unique trade reference number"""
    return f"TRD-{uuid.uuid4().hex[:8].upper()}"

@router.post("/", response_model=schemas.TradeOut)
def create_trade(
    payload: schemas.TradeCreate,
    current=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Buyer initiates a new trade transaction
    
    How to use:
    1. Login as a buyer (corporate or bank user)
    2. POST to /trades with:
       - seller_email: email of the seller
       - description: what's being traded
       - amount: trade amount (e.g., 50000.00)
       - currency: USD/EUR/GBP
    """
    
    # Verify current user is buyer (corporate or bank)
    if current["role"] not in ["corporate", "bank"]:
        raise HTTPException(403, "Only corporate or bank users can initiate trades")
    
    # Find seller by email
    seller = db.query(models.User).filter(models.User.email == payload.seller_email).first()
    if not seller:
        raise HTTPException(404, f"Seller with email {payload.seller_email} not found")
    
    if seller.id == current["id"]:
        raise HTTPException(400, "Cannot create trade with yourself")
    
    # Create trade
    trade = models.Trade(
        trade_number=generate_trade_number(),
        buyer_id=current["id"],
        seller_id=seller.id,
        description=payload.description,
        amount=payload.amount,
        currency=payload.currency,
        status=models.TradeStatusEnum.INITIATED
    )
    
    db.add(trade)
    db.commit()
    db.refresh(trade)
    
    # Add status history
    history = models.TradeStatusHistory(
        trade_id=trade.id,
        status=models.TradeStatusEnum.INITIATED,
        changed_by_id=current["id"],
        remarks="Trade initiated by buyer"
    )
    db.add(history)
    db.commit()
    db.refresh(trade)
    
    return trade

@router.get("/", response_model=List[schemas.TradeOut])
def list_trades(
    current=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List trades based on user role - buyers see their purchases, sellers see their sales"""
    
    user_id = current["id"]
    role = current["role"]
    
    # Auditors and admins see all trades
    if role in ["auditor", "admin"]:
        return db.query(models.Trade).all()
    
    # Banks see trades where they are involved
    if role == "bank":
        return db.query(models.Trade).filter(
            (models.Trade.buyer_id == user_id) | 
            (models.Trade.seller_id == user_id) |
            (models.Trade.bank_id == user_id)
        ).all()
    
    # Corporate users see only their trades (as buyer or seller)
    return db.query(models.Trade).filter(
        (models.Trade.buyer_id == user_id) | (models.Trade.seller_id == user_id)
    ).all()

@router.get("/{trade_id}", response_model=schemas.TradeOut)
def get_trade(
    trade_id: int,
    current=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get specific trade details with full status history"""
    
    trade = db.query(models.Trade).filter(models.Trade.id == trade_id).first()
    if not trade:
        raise HTTPException(404, "Trade not found")
    
    # Check access permissions
    user_id = current["id"]
    role = current["role"]
    
    # Banks can view all trades for review purposes
    # Auditors and admins can view all trades
    # Corporate users can only view their own trades
    if role not in ["auditor", "admin", "bank"]:
        if trade.buyer_id != user_id and trade.seller_id != user_id:
            raise HTTPException(403, "You don't have access to this trade")
    
    return trade

@router.patch("/{trade_id}/status", response_model=schemas.TradeOut)
def update_trade_status(
    trade_id: int,
    payload: schemas.TradeUpdate,
    current=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update trade status with business logic validation
    
    Status Flow:
    - INITIATED → SELLER_CONFIRMED (seller confirms)
    - SELLER_CONFIRMED → DOCUMENTS_UPLOADED (seller uploads docs)
    - DOCUMENTS_UPLOADED → BANK_REVIEWING (bank reviews)
    - BANK_REVIEWING → BANK_APPROVED (bank approves)
    - BANK_APPROVED → PAYMENT_RELEASED (bank releases payment)
    - PAYMENT_RELEASED → COMPLETED (buyer/seller confirms)
    """
    
    trade = db.query(models.Trade).filter(models.Trade.id == trade_id).first()
    if not trade:
        raise HTTPException(404, "Trade not found")
    
    user_id = current["id"]
    role = current["role"]
    current_status = trade.status
    new_status = payload.status
    
    # Define allowed status transitions based on role
    allowed_transitions = {
        "INITIATED": {
            "seller": ["SELLER_CONFIRMED", "DOCUMENTS_UPLOADED", "CANCELLED"],
            "buyer": ["CANCELLED"],
        },
        "SELLER_CONFIRMED": {
            "seller": ["DOCUMENTS_UPLOADED"],
            "buyer": ["CANCELLED"],
        },
        "DOCUMENTS_UPLOADED": {
            "bank": ["BANK_REVIEWING"],
            "seller": ["DOCUMENTS_UPLOADED"],  # Can re-upload
        },
        "BANK_REVIEWING": {
            "bank": ["BANK_APPROVED", "DISPUTED"],
        },
        "BANK_APPROVED": {
            "bank": ["PAYMENT_RELEASED"],
        },
        "PAYMENT_RELEASED": {
            "buyer": ["COMPLETED"],
            "seller": ["COMPLETED"],
            "bank": ["COMPLETED"],  # Bank can also mark as completed
        },
        "DISPUTED": {
            "admin": ["BANK_REVIEWING", "CANCELLED"],
        },
    }
    
    # Validate user is part of the trade or has appropriate role
    if role not in ["admin", "auditor"]:
        # Banks can update any trade (to review/approve)
        if role != "bank" and user_id not in [trade.buyer_id, trade.seller_id, trade.bank_id]:
            raise HTTPException(403, "You are not authorized to update this trade")
    
    # Determine user's role in trade
    trade_role = None
    if user_id == trade.buyer_id:
        trade_role = "buyer"
    elif user_id == trade.seller_id:
        trade_role = "seller"
    elif user_id == trade.bank_id or role == "bank":
        trade_role = "bank"
    elif role == "admin":
        trade_role = "admin"
    
    # Debug logging
    print(f"DEBUG: user_id={user_id}, trade.buyer_id={trade.buyer_id}, trade.seller_id={trade.seller_id}, trade_role={trade_role}")
    print(f"DEBUG: current_status={current_status.value}, new_status={new_status}")
    print(f"DEBUG: allowed_transitions for {current_status.value}: {allowed_transitions.get(current_status.value, {})}")
    
    # Validate status transition
    if current_status.value in allowed_transitions:
        if trade_role not in allowed_transitions[current_status.value]:
            raise HTTPException(403, f"You (trade_role={trade_role}) cannot change status from {current_status.value}")
        
        if new_status not in allowed_transitions[current_status.value][trade_role]:
            raise HTTPException(400, f"Invalid status transition from {current_status.value} to {new_status} for role {trade_role}. Allowed: {allowed_transitions[current_status.value][trade_role]}")
    
    # Update trade status
    trade.status = models.TradeStatusEnum[new_status]
    
    # Auto-assign bank when moving to BANK_REVIEWING
    if new_status == "BANK_REVIEWING" and trade.bank_id is None and role == "bank":
        trade.bank_id = user_id
    
    if new_status == "COMPLETED":
        trade.completed_at = datetime.utcnow()
    
    # Add status history
    history = models.TradeStatusHistory(
        trade_id=trade.id,
        status=models.TradeStatusEnum[new_status],
        changed_by_id=user_id,
        remarks=payload.remarks or f"Status changed to {new_status}"
    )
    
    db.add(history)
    db.commit()
    db.refresh(trade)
    
    return trade

@router.post("/{trade_id}/assign-bank")
def assign_bank_to_trade(
    trade_id: int,
    bank_email: str,
    current=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Buyer assigns a bank to the trade for financing/review"""
    
    trade = db.query(models.Trade).filter(models.Trade.id == trade_id).first()
    if not trade:
        raise HTTPException(404, "Trade not found")
    
    # Only buyer can assign bank
    if trade.buyer_id != current["id"]:
        raise HTTPException(403, "Only the buyer can assign a bank")
    
    bank = db.query(models.User).filter(
        models.User.email == bank_email,
        models.User.role == "bank"
    ).first()
    
    if not bank:
        raise HTTPException(404, "Bank not found")
    
    trade.bank_id = bank.id
    db.commit()
    
    return {"message": f"Bank {bank.name} assigned to trade {trade.trade_number}"}
