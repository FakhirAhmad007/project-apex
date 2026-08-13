from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.models import AlertsCache, Branch, Inventory, Product

router = APIRouter(prefix="/procurement", tags=["procurement"])


def _compute_alerts(db: Session) -> list[dict]:
    rows = db.query(Inventory).filter(Inventory.quantity < Inventory.safety_threshold).all()
    products = {p.id: p for p in db.query(Product).all()}
    branches = {b.id: b for b in db.query(Branch).all()}

    alerts = []
    for inv in rows:
        product = products.get(inv.product_id)
        branch = branches.get(inv.branch_id)
        ratio = inv.quantity / inv.safety_threshold if inv.safety_threshold else 0
        alerts.append(
            {
                "productId": inv.product_id,
                "productName": product.name if product else "Unknown",
                "branchId": inv.branch_id,
                "branchName": branch.name if branch else "Unknown",
                "currentQuantity": inv.quantity,
                "safetyThreshold": inv.safety_threshold,
                "severity": "reorder_now" if ratio <= 0.4 else "reorder_soon",
            }
        )
    alerts.sort(key=lambda a: a["currentQuantity"] / max(1, a["safetyThreshold"]))
    return alerts


@router.get("/alerts")
def get_alerts(db: Session = Depends(get_db)):
    row = db.query(AlertsCache).order_by(AlertsCache.id.desc()).first()
    if not row:
        return {"data": [], "computedAt": None}
    return {"data": row.data, "computedAt": row.computed_at.isoformat()}


@router.post("/alerts/refresh")
def refresh_alerts(db: Session = Depends(get_db)):
    data = _compute_alerts(db)
    row = db.query(AlertsCache).order_by(AlertsCache.id.desc()).first()
    now = datetime.utcnow()
    if row:
        row.data = data
        row.computed_at = now
    else:
        row = AlertsCache(data=data, computed_at=now)
        db.add(row)
    db.commit()
    return {"data": data, "computedAt": now.isoformat()}
