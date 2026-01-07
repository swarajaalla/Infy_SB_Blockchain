from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.core.dependencies import get_db, get_current_user
from app.database.models import LedgerEntry, Document, User, EventTypeEnum
from app.database.schemas import LedgerEntryCreate, LedgerEntryOut

router = APIRouter()


@router.post("/entries", response_model=LedgerEntryOut, status_code=201)
def create_ledger_entry(
    entry_data: LedgerEntryCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new ledger entry for a document event.
    
    - **document_id**: ID of the document
    - **event_type**: Type of event (CREATED, UPLOADED, VERIFIED, ACCESSED, MODIFIED, SHARED, DELETED)
    - **description**: Optional description of the event
    - **hash_before**: Hash before the event (for MODIFIED events)
    - **hash_after**: Hash after the event
    - **metadata**: Additional metadata as JSON string
    """
    org_name = current_user["org_name"]
    
    # Verify document exists and belongs to the same org
    document = db.query(Document).filter(
        Document.id == entry_data.document_id,
        Document.org_name == org_name
    ).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found or access denied")
    
    # Validate event type
    try:
        EventTypeEnum(entry_data.event_type)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid event_type. Must be one of: {[e.value for e in EventTypeEnum]}")
    
    # Get request metadata
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", None)
    
    # Create ledger entry
    new_entry = LedgerEntry(
        document_id=entry_data.document_id,
        user_id=current_user["id"],
        event_type=entry_data.event_type,
        description=entry_data.description,
        hash_before=entry_data.hash_before,
        hash_after=entry_data.hash_after,
        ip_address=ip_address,
        user_agent=user_agent,
        event_metadata=entry_data.event_metadata,
        org_name=org_name
    )
    
    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)
    
    # Get user details from database
    user = db.query(User).filter(User.id == current_user["id"]).first()
    
    # Prepare output with user and document info
    entry_dict = {
        "id": new_entry.id,
        "document_id": new_entry.document_id,
        "user_id": new_entry.user_id,
        "event_type": new_entry.event_type,
        "description": new_entry.description,
        "hash_before": new_entry.hash_before,
        "hash_after": new_entry.hash_after,
        "ip_address": new_entry.ip_address,
        "user_agent": new_entry.user_agent,
        "event_metadata": new_entry.event_metadata,
        "created_at": new_entry.created_at,
        "org_name": new_entry.org_name,
        "user_name": user.name if user else None,
        "user_email": user.email if user else None,
        "doc_type": document.doc_type,
        "doc_number": document.doc_number
    }
    
    return entry_dict


@router.get("/entries", response_model=List[LedgerEntryOut])
def get_all_ledger_entries(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    document_id: Optional[int] = None,
    event_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all ledger entries with optional filters.
    
    - **skip**: Number of records to skip (pagination)
    - **limit**: Maximum number of records to return
    - **document_id**: Filter by document ID
    - **event_type**: Filter by event type
    """
    org_name = current_user["org_name"]
    
    query = db.query(LedgerEntry).filter(LedgerEntry.org_name == org_name)
    
    if document_id:
        query = query.filter(LedgerEntry.document_id == document_id)
    
    if event_type:
        try:
            EventTypeEnum(event_type)
            query = query.filter(LedgerEntry.event_type == event_type)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid event_type. Must be one of: {[e.value for e in EventTypeEnum]}")
    
    # Order by most recent first
    entries = query.order_by(LedgerEntry.created_at.desc()).offset(skip).limit(limit).all()
    
    # Enrich with user and document data
    result = []
    for entry in entries:
        user = db.query(User).filter(User.id == entry.user_id).first()
        document = db.query(Document).filter(Document.id == entry.document_id).first()
        
        entry_dict = {
            "id": entry.id,
            "document_id": entry.document_id,
            "user_id": entry.user_id,
            "event_type": entry.event_type,
            "description": entry.description,
            "hash_before": entry.hash_before,
            "hash_after": entry.hash_after,
            "ip_address": entry.ip_address,
            "user_agent": entry.user_agent,
            "event_metadata": entry.event_metadata,
            "created_at": entry.created_at,
            "org_name": entry.org_name,
            "user_name": user.name if user else None,
            "user_email": user.email if user else None,
            "doc_type": document.doc_type if document else None,
            "doc_number": document.doc_number if document else None
        }
        result.append(entry_dict)
    
    return result


@router.get("/entries/{entry_id}", response_model=LedgerEntryOut)
def get_ledger_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific ledger entry by ID.
    """
    org_name = current_user["org_name"]
    
    entry = db.query(LedgerEntry).filter(
        LedgerEntry.id == entry_id,
        LedgerEntry.org_name == org_name
    ).first()
    
    if not entry:
        raise HTTPException(status_code=404, detail="Ledger entry not found")
    
    # Enrich with user and document data
    user = db.query(User).filter(User.id == entry.user_id).first()
    document = db.query(Document).filter(Document.id == entry.document_id).first()
    
    entry_dict = {
        "id": entry.id,
        "document_id": entry.document_id,
        "user_id": entry.user_id,
        "event_type": entry.event_type,
        "description": entry.description,
        "hash_before": entry.hash_before,
        "hash_after": entry.hash_after,
        "ip_address": entry.ip_address,
        "user_agent": entry.user_agent,
        "event_metadata": entry.event_metadata,
        "created_at": entry.created_at,
        "org_name": entry.org_name,
        "user_name": user.name if user else None,
        "user_email": user.email if user else None,
        "doc_type": document.doc_type if document else None,
        "doc_number": document.doc_number if document else None
    }
    
    return entry_dict


@router.get("/documents/{document_id}/entries", response_model=List[LedgerEntryOut])
def get_document_ledger_entries(
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all ledger entries for a specific document (audit trail).
    Returns entries in chronological order (oldest first).
    """
    org_name = current_user["org_name"]
    
    # Verify document exists and belongs to the same org
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.org_name == org_name
    ).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found or access denied")
    
    # Get all entries for this document
    entries = db.query(LedgerEntry).filter(
        LedgerEntry.document_id == document_id,
        LedgerEntry.org_name == org_name
    ).order_by(LedgerEntry.created_at.asc()).all()
    
    # Enrich with user data
    result = []
    for entry in entries:
        user = db.query(User).filter(User.id == entry.user_id).first()
        
        entry_dict = {
            "id": entry.id,
            "document_id": entry.document_id,
            "user_id": entry.user_id,
            "event_type": entry.event_type,
            "description": entry.description,
            "hash_before": entry.hash_before,
            "hash_after": entry.hash_after,
            "ip_address": entry.ip_address,
            "user_agent": entry.user_agent,
            "event_metadata": entry.event_metadata,
            "created_at": entry.created_at,
            "org_name": entry.org_name,
            "user_name": user.name if user else None,
            "user_email": user.email if user else None,
            "doc_type": document.doc_type,
            "doc_number": document.doc_number
        }
        result.append(entry_dict)
    
    return result


@router.get("/stats")
def get_ledger_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get statistics about ledger entries for the organization.
    """
    org_name = current_user["org_name"]
    
    # Total entries
    total_entries = db.query(LedgerEntry).filter(LedgerEntry.org_name == org_name).count()
    
    # Entries by event type
    from sqlalchemy import func
    event_counts = db.query(
        LedgerEntry.event_type,
        func.count(LedgerEntry.id).label('count')
    ).filter(
        LedgerEntry.org_name == org_name
    ).group_by(LedgerEntry.event_type).all()
    
    event_stats = {event_type: count for event_type, count in event_counts}
    
    # Recent activity (last 24 hours)
    from datetime import timedelta
    yesterday = datetime.utcnow() - timedelta(days=1)
    recent_entries = db.query(LedgerEntry).filter(
        LedgerEntry.org_name == org_name,
        LedgerEntry.created_at >= yesterday
    ).count()
    
    # Most active documents
    active_docs = db.query(
        LedgerEntry.document_id,
        func.count(LedgerEntry.id).label('entry_count')
    ).filter(
        LedgerEntry.org_name == org_name
    ).group_by(LedgerEntry.document_id).order_by(func.count(LedgerEntry.id).desc()).limit(5).all()
    
    return {
        "total_entries": total_entries,
        "event_type_breakdown": event_stats,
        "recent_activity_24h": recent_entries,
        "most_active_documents": [{"document_id": doc_id, "entry_count": count} for doc_id, count in active_docs]
    }
