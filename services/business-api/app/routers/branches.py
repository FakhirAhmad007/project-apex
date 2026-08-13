from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_roles
from app.models.models import Branch
from app.schemas.schemas import BranchCreate, BranchOut

router = APIRouter(prefix="/api/branches", tags=["branches"])


@router.get("", response_model=list[BranchOut])
def list_branches(db: Session = Depends(get_db)):
    """Public — the storefront needs this to populate the branch selector."""
    return db.query(Branch).filter(Branch.is_active == True).all()  # noqa: E712


@router.post("", response_model=BranchOut, dependencies=[Depends(require_roles("owner"))])
def create_branch(payload: BranchCreate, db: Session = Depends(get_db)):
    branch = Branch(name=payload.name, address=payload.address)
    db.add(branch)
    db.commit()
    db.refresh(branch)
    return branch
