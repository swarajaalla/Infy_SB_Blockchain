import hashlib
import os
from datetime import datetime
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database.models import (
    Document, IntegrityCheck, Alert, LedgerEntry,
    IntegrityStatusEnum, AlertSeverityEnum, EventTypeEnum
)

def compute_file_hash(file_path: str) -> str:
    """Compute SHA-256 hash of a file."""
    sha256_hash = hashlib.sha256()
    try:
        with open(file_path, "rb") as f:
            # Read file in chunks to handle large files
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()
    except Exception as e:
        raise Exception(f"Error computing hash for {file_path}: {str(e)}")

def run_integrity_check(
    db: Session,
    document_ids: Optional[List[int]] = None,
    user_role: Optional[str] = None
) -> dict:
    """
    Run integrity checks on specified documents or all documents.
    Admin and Auditor can check ALL documents across organizations.
    
    Args:
        db: Database session
        document_ids: Optional list of document IDs to check. If None, checks all.
        user_role: Role of user running check. Admin/Auditor get access to all docs.
        
    Returns:
        dict: Summary of checks with counts and failed document IDs
    """
    # Query documents - Admin/Auditor get ALL documents
    query = db.query(Document)
    if document_ids:
        query = query.filter(Document.id.in_(document_ids))
    
    documents = query.all()
    
    # If no documents, return empty results
    if not documents:
        return {
            "total_checked": 0,
            "passed": 0,
            "failed": 0,
            "failed_documents": [],
            "errors": [],
            "message": "No documents found to check"
        }
    
    results = {
        "total_checked": 0,
        "passed": 0,
        "failed": 0,
        "failed_documents": [],
        "errors": []
    }
    
    for doc in documents:
        try:
            # Create integrity check record
            integrity_check = IntegrityCheck(
                document_id=doc.id,
                check_type="SHA256",
                stored_hash=doc.hash,
                status=IntegrityStatusEnum.PENDING,
                checked_by="SYSTEM"
            )
            db.add(integrity_check)
            db.flush()  # Get the ID
            
            # Get the file path from file_url
            file_path = doc.file_url
            
            # Check if file_url is None or empty
            if not file_path:
                integrity_check.remarks = "No file URL specified"
                integrity_check.status = IntegrityStatusEnum.FAIL
                integrity_check.checked_at = datetime.utcnow()
                
                alert = Alert(
                    alert_type="MISSING_FILE_URL",
                    severity=AlertSeverityEnum.MEDIUM,
                    document_id=doc.id,
                    integrity_check_id=integrity_check.id,
                    message=f"Document has no file URL: {doc.doc_number}"
                )
                db.add(alert)
                
                results["failed"] += 1
                results["failed_documents"].append({
                    "id": doc.id,
                    "doc_number": doc.doc_number,
                    "reason": "No file URL"
                })
                continue
            
            # Handle S3 or local paths
            if file_path.startswith("s3://"):
                # For S3, we'd need to download and check
                # For now, mark as pending and skip
                integrity_check.remarks = "S3 files not yet supported"
                integrity_check.status = IntegrityStatusEnum.PENDING
                db.commit()
                continue
            
            # Handle local:// prefix
            if file_path.startswith("local://"):
                # Remove local:// prefix
                file_path = file_path.replace("local://", "")
                # Get the backend directory (three levels up from services/ -> app/ -> backend/)
                current_file = os.path.abspath(__file__)
                backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(current_file)))
                # Join with the relative path (uploads/filename)
                file_path = os.path.join(backend_dir, file_path)
            elif not file_path.startswith("/") and not file_path.startswith("s3://"):
                # Relative path without prefix - assume it's in uploads/
                current_file = os.path.abspath(__file__)
                backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(current_file)))
                file_path = os.path.join(backend_dir, file_path)
            
            # Check if file exists locally
            if not os.path.exists(file_path):
                integrity_check.remarks = f"File not found: {file_path}"
                integrity_check.status = IntegrityStatusEnum.FAIL
                integrity_check.checked_at = datetime.utcnow()
                
                # Create alert
                alert = Alert(
                    alert_type="FILE_NOT_FOUND",
                    severity=AlertSeverityEnum.HIGH,
                    document_id=doc.id,
                    integrity_check_id=integrity_check.id,
                    message=f"Document file not found: {doc.doc_number} ({file_path})"
                )
                db.add(alert)
                
                results["failed"] += 1
                results["failed_documents"].append({
                    "id": doc.id,
                    "doc_number": doc.doc_number,
                    "reason": "File not found"
                })
                db.commit()
                continue
            
            # Compute current hash
            computed_hash = compute_file_hash(file_path)
            integrity_check.computed_hash = computed_hash
            integrity_check.checked_at = datetime.utcnow()
            
            # Compare hashes
            if computed_hash == doc.hash:
                # PASS - Hashes match
                integrity_check.status = IntegrityStatusEnum.PASS
                integrity_check.remarks = "Integrity verified successfully"
                results["passed"] += 1
            else:
                # FAIL - Hashes don't match
                integrity_check.status = IntegrityStatusEnum.FAIL
                integrity_check.remarks = "Hash mismatch detected"
                results["failed"] += 1
                results["failed_documents"].append({
                    "id": doc.id,
                    "doc_number": doc.doc_number,
                    "stored_hash": doc.hash,
                    "computed_hash": computed_hash,
                    "reason": "Hash mismatch"
                })
                
                # Create ledger entry for integrity failure
                ledger_entry = LedgerEntry(
                    document_id=doc.id,
                    user_id=doc.owner_id,  # Use document owner
                    event_type=EventTypeEnum.INTEGRITY_FAILED,
                    description=f"Integrity check failed for document {doc.doc_number}. "
                            f"Stored hash: {doc.hash[:16]}..., "
                            f"Computed hash: {computed_hash[:16]}...",
                    hash_before=doc.hash,
                    hash_after=computed_hash,
                    org_name=doc.org_name
                )
                db.add(ledger_entry)
                
                # Create high-severity alert
                alert = Alert(
                    alert_type="INTEGRITY_FAILURE",
                    severity=AlertSeverityEnum.CRITICAL,
                    document_id=doc.id,
                    integrity_check_id=integrity_check.id,
                    message=f"CRITICAL: Document integrity compromised for {doc.doc_number}. "
                            f"Hash mismatch detected. Possible tampering."
                )
                db.add(alert)
            
            results["total_checked"] += 1
            db.commit()
            
        except Exception as e:
            db.rollback()
            error_msg = f"Error checking document {doc.id}: {str(e)}"
            results["errors"].append(error_msg)
            print(f"[INTEGRITY CHECK ERROR] {error_msg}")
    
    return results

def get_integrity_checks(
    db: Session,
    document_id: Optional[int] = None,
    status: Optional[IntegrityStatusEnum] = None,
    skip: int = 0,
    limit: int = 100
) -> List[IntegrityCheck]:
    """Get integrity check records with optional filters."""
    query = db.query(IntegrityCheck)
    
    if document_id:
        query = query.filter(IntegrityCheck.document_id == document_id)
    
    if status:
        query = query.filter(IntegrityCheck.status == status)
    
    return query.order_by(IntegrityCheck.checked_at.desc()).offset(skip).limit(limit).all()

def get_alerts(
    db: Session,
    acknowledged: Optional[bool] = None,
    alert_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 100
) -> List[Alert]:
    """Get alerts with optional filters."""
    query = db.query(Alert)
    
    if acknowledged is not None:
        query = query.filter(Alert.acknowledged == acknowledged)
    
    if alert_type:
        query = query.filter(Alert.alert_type == alert_type)
    
    return query.order_by(Alert.created_at.desc()).offset(skip).limit(limit).all()

def acknowledge_alert(db: Session, alert_id: int, user_id: int) -> Alert:
    """Mark an alert as acknowledged."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise ValueError(f"Alert {alert_id} not found")
    
    alert.acknowledged = True
    alert.acknowledged_by_id = user_id
    alert.acknowledged_at = datetime.utcnow()
    db.commit()
    db.refresh(alert)
    
    return alert
