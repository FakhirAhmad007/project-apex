from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.models import Inventory, User
from app.schemas.schemas import InventoryOut, InventoryUpdate

router = APIRouter(prefix="/api/inventory", tags=["inventory"])


@router.get("", response_model=list[InventoryOut], dependencies=[Depends(get_current_user)])
def list_inventory(branch_id: int | None = None, db: Session = Depends(get_db)):
    q = db.query(Inventory)
    if branch_id:
        q = q.filter(Inventory.branch_id == branch_id)
    return q.all()


@router.put(
    "/{inventory_id}",
    response_model=InventoryOut,
    dependencies=[Depends(require_roles("owner", "manager", "staff"))],
)
def update_inventory(inventory_id: int, payload: InventoryUpdate, db: Session = Depends(get_db)):
    row = db.query(Inventory).filter(Inventory.id == inventory_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Inventory row not found")
    if payload.quantity is not None:
        row.quantity = payload.quantity
    if payload.safety_threshold is not None:
        row.safety_threshold = payload.safety_threshold
    db.commit()
    db.refresh(row)
    return row
