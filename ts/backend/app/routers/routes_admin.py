from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database.connection import get_db
from app.database.models import User, RoleEnum, IntegrityStatusEnum
from app.database.schemas import (
    IntegrityCheckCreate, IntegrityCheckOut,
    AlertOut, AlertAcknowledge
)
from app.core.dependencies import get_current_user
from app.services import integrity_service

router = APIRouter(tags=["Admin"])

def require_admin_or_auditor(current_user: dict = Depends(get_current_user)):
    """Dependency to require admin or auditor role."""
    # current_user is a dict, not a User object
    user_role = current_user.get("role")
    if user_role not in ["admin", "auditor"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin or Auditor access required"
        )
    return current_user

@router.post("/run-integrity-check", response_model=dict)
def run_integrity_check(
    request: IntegrityCheckCreate,
    current_user: dict = Depends(require_admin_or_auditor),
    db: Session = Depends(get_db)
):
    """
    Run integrity checks on documents.
    Admin and Auditor can check ALL documents across all organizations.
    
    - **document_ids**: Optional list of document IDs. If None, checks all documents.
    - Returns summary with pass/fail counts and failed document details.
    
    **Security**: Only Admin and Auditor roles can trigger integrity checks.
    """
    try:
        results = integrity_service.run_integrity_check(
            db=db,
            document_ids=request.document_ids,
            user_role=current_user.get("role")
        )
        return {
            "success": True,
            "message": f"Integrity check completed. {results['passed']} passed, {results['failed']} failed.",
            "results": results
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error running integrity check: {str(e)}"
        )

@router.get("/integrity-checks", response_model=List[IntegrityCheckOut])
def get_integrity_checks(
    document_id: Optional[int] = None,
    status: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(require_admin_or_auditor),
    db: Session = Depends(get_db)
):
    """
    Get integrity check records.
    
    - **document_id**: Filter by document ID
    - **status**: Filter by status (PASS, FAIL, PENDING)
    - **skip**: Pagination offset
    - **limit**: Max records to return
    """
    try:
        status_enum = IntegrityStatusEnum[status] if status else None
    except KeyError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status: {status}. Must be PASS, FAIL, or PENDING."
        )
    
    checks = integrity_service.get_integrity_checks(
        db=db,
        document_id=document_id,
        status=status_enum,
        skip=skip,
        limit=limit
    )
    return checks

@router.get("/integrity-checks/summary", response_model=dict)
def get_integrity_summary(
    current_user: dict = Depends(require_admin_or_auditor),
    db: Session = Depends(get_db)
):
    """
    Get summary statistics of integrity checks.
    
    Returns counts of PASS, FAIL, and PENDING checks.
    """
    from app.database.models import IntegrityCheck
    
    total = db.query(IntegrityCheck).count()
    passed = db.query(IntegrityCheck).filter(
        IntegrityCheck.status == IntegrityStatusEnum.PASS
    ).count()
    failed = db.query(IntegrityCheck).filter(
        IntegrityCheck.status == IntegrityStatusEnum.FAIL
    ).count()
    pending = db.query(IntegrityCheck).filter(
        IntegrityCheck.status == IntegrityStatusEnum.PENDING
    ).count()
    
    return {
        "total_checks": total,
        "passed": passed,
        "failed": failed,
        "pending": pending,
        "pass_rate": round((passed / total * 100) if total > 0 else 0, 2)
    }

@router.get("/alerts", response_model=List[AlertOut])
def get_alerts(
    acknowledged: Optional[bool] = None,
    alert_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: dict = Depends(require_admin_or_auditor),
    db: Session = Depends(get_db)
):
    """
    Get alerts.
    
    - **acknowledged**: Filter by acknowledgement status
    - **alert_type**: Filter by alert type
    - **skip**: Pagination offset
    - **limit**: Max records to return
    """
    alerts = integrity_service.get_alerts(
        db=db,
        acknowledged=acknowledged,
        alert_type=alert_type,
        skip=skip,
        limit=limit
    )
    return alerts

@router.post("/alerts/{alert_id}/acknowledge", response_model=AlertOut)
def acknowledge_alert(
    alert_id: int,
    current_user: dict = Depends(require_admin_or_auditor),
    db: Session = Depends(get_db)
):
    """
    Acknowledge an alert.
    
    Marks the alert as acknowledged by the current user.
    """
    try:
        alert = integrity_service.acknowledge_alert(
            db=db,
            alert_id=alert_id,
            user_id=current_user.get("id")  # Access dict key instead of attribute
        )
        return alert
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
