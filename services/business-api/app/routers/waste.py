from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import WasteLog
from app.schemas.schemas import WasteCreate, WasteOut

router = APIRouter(prefix="/api/waste", tags=["waste"])


@router.get("", response_model=list[WasteOut], dependencies=[Depends(get_current_user)])
def list_waste(db: Session = Depends(get_db)):
    return db.query(WasteLog).order_by(WasteLog.date.desc()).limit(500).all()


@router.post("", response_model=WasteOut, dependencies=[Depends(get_current_user)])
def log_waste(payload: WasteCreate, db: Session = Depends(get_db)):
    entry = WasteLog(
        product_id=payload.product_id,
        branch_id=payload.branch_id,
        quantity=payload.quantity,
        reason=payload.reason,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry
