from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_roles
from app.models.models import User
from app.schemas.schemas import RoleUpdate, UserOut

router = APIRouter(prefix="/api/staff", tags=["staff"])


@router.get("", response_model=list[UserOut], dependencies=[Depends(require_roles("owner", "manager", "staff"))])
def list_staff(db: Session = Depends(get_db)):
    return db.query(User).all()


@router.put("/{user_id}/role", response_model=UserOut, dependencies=[Depends(require_roles("owner"))])
def update_role(user_id: int, payload: RoleUpdate, db: Session = Depends(get_db)):
    if payload.role not in ("owner", "manager", "staff"):
        raise HTTPException(status_code=400, detail="role must be owner, manager, or staff")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = payload.role
    if payload.branch_id is not None:
        user.branch_id = payload.branch_id
    db.commit()
    db.refresh(user)
    return user
