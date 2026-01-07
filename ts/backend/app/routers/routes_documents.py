from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Form, Request
from sqlalchemy.orm import Session
from app.core.dependencies import get_db, get_current_user
from app.database import models, schemas
from datetime import datetime

from app.database.models import Document, LedgerEntry
from app.utils.hashing import generate_sha256
from app.core.s3 import upload_file_to_s3

router = APIRouter()


def create_ledger_entry(
    db: Session,
    document_id: int,
    user_id: int,
    event_type: str,
    org_name: str,
    description: str = None,
    hash_after: str = None,
    request: Request = None
):
    """Helper function to create ledger entries automatically"""
    ip_address = request.client.host if request and request.client else None
    user_agent = request.headers.get("user-agent", None) if request else None
    
    entry = LedgerEntry(
        document_id=document_id,
        user_id=user_id,
        event_type=event_type,
        description=description,
        hash_after=hash_after,
        ip_address=ip_address,
        user_agent=user_agent,
        org_name=org_name
    )
    db.add(entry)
    return entry


@router.post("/", response_model=schemas.DocumentOut)
def create_doc(
    payload: schemas.DocumentCreate,
    request: Request,
    current=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create document metadata only (without file upload).
    Note: Hash must be provided if document already exists elsewhere.
    """
    doc = models.Document(
        owner_id=current["id"],
        doc_type=payload.doc_type,
        doc_number=payload.doc_number,
        file_url=payload.file_url,
        hash=payload.hash,
        issued_at=payload.issued_at,
        org_name=current["org_name"]
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    
    # Create ledger entry
    create_ledger_entry(
        db=db,
        document_id=doc.id,
        user_id=current["id"],
        event_type="CREATED",
        org_name=current["org_name"],
        description=f"Document metadata created: {payload.doc_type} - {payload.doc_number}",
        hash_after=payload.hash,
        request=request
    )
    db.commit()
    
    return doc


@router.get("/")
def list_docs(current=Depends(get_current_user), db: Session = Depends(get_db)):
    if current["role"] == "auditor":
        return db.query(models.Document).all()
    return db.query(models.Document).filter(models.Document.org_name == current["org_name"]).all()


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    doc_type: str = Form(...),
    doc_number: str = Form(...),
    issued_at: datetime = Form(...),
    trade_id: int = Form(None),
    request: Request = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user),
):
    """
    Upload document file + automatically generate hash + save metadata.
    This is the primary endpoint for document creation with file upload.
    Returns the hash code which is required to access the document later.
    
    If trade_id is provided, automatically updates trade status to DOCUMENTS_UPLOADED.
    """
    file_bytes = await file.read()

    # 1️⃣ Hash - Generate unique identifier
    file_hash = generate_sha256(file_bytes)
    
    # Check if document with this hash already exists
    existing_doc = db.query(Document).filter(Document.hash == file_hash).first()
    if existing_doc:
        raise HTTPException(
            status_code=400, 
            detail=f"Document with this hash already exists (ID: {existing_doc.id})"
        )

    # 2️⃣ Validate trade_id if provided
    trade = None
    if trade_id:
        trade = db.query(models.Trade).filter(models.Trade.id == trade_id).first()
        if not trade:
            raise HTTPException(status_code=404, detail=f"Trade with ID {trade_id} not found")
        
        # Verify user is part of the trade
        if current_user["id"] not in [trade.buyer_id, trade.seller_id]:
            raise HTTPException(status_code=403, detail="You are not authorized to upload documents for this trade")

    # 3️⃣ Try to upload to S3, fallback to local storage
    try:
        file_url = upload_file_to_s3(file_bytes, file.filename)
    except Exception as e:
        # Fallback: Store locally if S3 not configured
        import os
        import uuid
        upload_dir = "uploads"
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, f"{uuid.uuid4()}_{file.filename}")
        with open(file_path, "wb") as f:
            f.write(file_bytes)
        file_url = f"local://{file_path}"

    # 4️⃣ Save metadata
    document = Document(
        owner_id=current_user["id"],
        doc_type=doc_type,
        doc_number=doc_number,
        file_url=file_url,
        hash=file_hash,
        issued_at=issued_at,
        org_name=current_user["org_name"],
        trade_id=trade_id
    )

    db.add(document)
    db.commit()
    db.refresh(document)
    
    # 5️⃣ Create ledger entry for document upload
    create_ledger_entry(
        db=db,
        document_id=document.id,
        user_id=current_user["id"],
        event_type="UPLOADED",
        org_name=current_user["org_name"],
        description=f"Document uploaded: {file.filename} ({doc_type} - {doc_number})" + 
                   (f" for Trade {trade.trade_number}" if trade else ""),
        hash_after=file_hash,
        request=request
    )
    
    # 6️⃣ AUTO-UPDATE TRADE STATUS TO DOCUMENTS_UPLOADED
    if trade:
        # Auto-update trade status based on current status and uploader
        old_status = trade.status
        should_update = False
        
        # If seller uploads document, auto-advance through workflow
        if current_user["id"] == trade.seller_id:
            if trade.status == models.TradeStatusEnum.INITIATED:
                # Seller uploading doc from INITIATED → auto-advance to SELLER_CONFIRMED then DOCUMENTS_UPLOADED
                trade.status = models.TradeStatusEnum.DOCUMENTS_UPLOADED
                should_update = True
            elif trade.status == models.TradeStatusEnum.SELLER_CONFIRMED:
                trade.status = models.TradeStatusEnum.DOCUMENTS_UPLOADED
                should_update = True
            elif trade.status == models.TradeStatusEnum.DOCUMENTS_UPLOADED:
                # Already in correct status, just log it
                should_update = True
        
        if should_update:
            # Add status history
            status_history = models.TradeStatusHistory(
                trade_id=trade.id,
                status=trade.status,
                changed_by_id=current_user["id"],
                remarks=f"Document uploaded: {doc_type} - {doc_number} (auto-status update from {old_status.value})"
            )
            db.add(status_history)
            
            # Create ledger entry for status change
            if old_status != trade.status:
                create_ledger_entry(
                    db=db,
                    document_id=document.id,
                    user_id=current_user["id"],
                    event_type="TRADE_STATUS_UPDATE",
                    org_name=current_user["org_name"],
                    description=f"Trade {trade.trade_number} status auto-updated: {old_status.value} → {trade.status.value}",
                    hash_after=file_hash,
                    request=request
                )
    
    db.commit()

    return {
        "message": "Document uploaded successfully" + (" and trade status updated" if trade else ""),
        "document_id": document.id,
        "hash": file_hash,
        "file_url": file_url,
        "doc_type": doc_type,
        "doc_number": doc_number,
        "trade_id": trade_id,
        "trade_status": trade.status.value if trade else None
    }


@router.get("/hash/{hash_code}", response_model=schemas.DocumentOut)
def get_document_by_hash(
    hash_code: str,
    request: Request,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Retrieve document metadata using hash code.
    This is the secure way to access document information.
    """
    document = db.query(Document).filter(Document.hash == hash_code).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found with provided hash")
    
    # Check access permissions
    if current_user["role"] != "auditor":
        if document.org_name != current_user["org_name"]:
            raise HTTPException(status_code=403, detail="Not authorized to access this document")
    
    # Log access event
    create_ledger_entry(
        db=db,
        document_id=document.id,
        user_id=current_user["id"],
        event_type="ACCESSED",
        org_name=current_user["org_name"],
        description=f"Document accessed via hash: {hash_code[:8]}...",
        hash_after=hash_code,
        request=request
    )
    db.commit()
    
    return document


@router.post("/verify")
async def verify_document_hash(
    file: UploadFile = File(...),
    hash_code: str = None,
    request: Request = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Verify if an uploaded file matches the stored hash.
    Use this to check document integrity.
    """
    file_bytes = await file.read()
    calculated_hash = generate_sha256(file_bytes)
    
    # If hash_code provided, check against it
    if hash_code:
        is_match = calculated_hash == hash_code
        document = db.query(Document).filter(Document.hash == hash_code).first()
        
        # Log verification event if document exists
        if document:
            create_ledger_entry(
                db=db,
                document_id=document.id,
                user_id=current_user["id"],
                event_type="VERIFIED",
                org_name=current_user["org_name"],
                description=f"Document integrity verified: {'SUCCESS' if is_match else 'FAILED'}",
                hash_after=calculated_hash,
                request=request
            )
            db.commit()
        
        return {
            "calculated_hash": calculated_hash,
            "provided_hash": hash_code,
            "is_verified": is_match,
            "document_exists": document is not None,
            "document_id": document.id if document else None
        }
    
    # Otherwise, check if document exists in database
    document = db.query(Document).filter(Document.hash == calculated_hash).first()
    
    # Log verification event if document exists
    if document:
        create_ledger_entry(
            db=db,
            document_id=document.id,
            user_id=current_user["id"],
            event_type="VERIFIED",
            org_name=current_user["org_name"],
            description="Document integrity verified via file upload",
            hash_after=calculated_hash,
            request=request
        )
        db.commit()
    
    return {
        "calculated_hash": calculated_hash,
        "document_exists": document is not None,
        "document_id": document.id if document else None,
        "is_verified": document is not None
    }


@router.put("/{document_id}", response_model=schemas.DocumentOut)
async def update_document(
    document_id: int,
    file: UploadFile = File(None),
    doc_type: str = Form(None),
    doc_number: str = Form(None),
    issued_at: datetime = Form(None),
    request: Request = None,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """
    Update document and track hash changes in ledger.
    This creates a MODIFIED event with hash_before and hash_after.
    """
    # Get existing document
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.org_name == current_user["org_name"]
    ).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    # Store old hash for ledger
    old_hash = document.hash
    
    # Update metadata if provided
    if doc_type:
        document.doc_type = doc_type
    if doc_number:
        document.doc_number = doc_number
    if issued_at:
        document.issued_at = issued_at
    
    new_hash = old_hash
    description_parts = []
    
    # If new file uploaded, recalculate hash
    if file:
        file_bytes = await file.read()
        new_hash = generate_sha256(file_bytes)
        
        # Upload new file
        try:
            file_url = upload_file_to_s3(file_bytes, file.filename)
        except Exception as e:
            # Fallback: Store locally
            import os
            import uuid
            upload_dir = "uploads"
            os.makedirs(upload_dir, exist_ok=True)
            file_path = os.path.join(upload_dir, f"{uuid.uuid4()}_{file.filename}")
            with open(file_path, "wb") as f:
                f.write(file_bytes)
            file_url = f"local://{file_path}"
        
        document.file_url = file_url
        document.hash = new_hash
        description_parts.append(f"File updated: {file.filename}")
    
    if doc_type or doc_number:
        description_parts.append(f"Metadata updated")
    
    db.commit()
    db.refresh(document)
    
    # Create MODIFIED ledger entry with hash trail
    create_ledger_entry(
        db=db,
        document_id=document.id,
        user_id=current_user["id"],
        event_type="MODIFIED",
        org_name=current_user["org_name"],
        description=", ".join(description_parts) if description_parts else "Document modified",
        hash_after=new_hash,
        request=request
    )
    
    # If hash changed, also add hash_before to the entry
    if old_hash != new_hash:
        # Update the last entry to include hash_before
        last_entry = db.query(LedgerEntry).filter(
            LedgerEntry.document_id == document_id
        ).order_by(LedgerEntry.id.desc()).first()
        
        if last_entry:
            last_entry.hash_before = old_hash
    
    db.commit()
    
    return document
