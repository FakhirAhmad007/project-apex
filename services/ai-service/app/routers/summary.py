from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.ml.summary import generate_daily_summary
from app.models.models import Branch, Order, OrderItem, Product, SummaryCache, WasteLog
from app.routers.procurement import _compute_alerts

router = APIRouter(prefix="/summary", tags=["summary"])


def _gather_facts(db: Session) -> dict:
    yesterday = date.today() - timedelta(days=1)
    orders = (
        db.query(Order)
        .filter(Order.created_at >= datetime.combine(yesterday, datetime.min.time()))
        .filter(Order.created_at < datetime.combine(date.today(), datetime.min.time()))
        .all()
    )
    products = {p.id: p.name for p in db.query(Product).all()}
    branches = {b.id: b.name for b in db.query(Branch).all()}

    revenue = sum(o.total for o in orders)
    qty_by_product: dict[int, int] = {}
    rev_by_branch: dict[int, float] = {}
    for o in orders:
        rev_by_branch[o.branch_id] = rev_by_branch.get(o.branch_id, 0) + o.total
        items = db.query(OrderItem).filter(OrderItem.order_id == o.id).all()
        for it in items:
            qty_by_product[it.product_id] = qty_by_product.get(it.product_id, 0) + it.quantity

    top_products = sorted(qty_by_product.items(), key=lambda x: x[1], reverse=True)[:3]
    top_products_named = [f"{products.get(pid, pid)} ({qty} sold)" for pid, qty in top_products]
    top_branch_id = max(rev_by_branch, key=rev_by_branch.get) if rev_by_branch else None
    top_branch = branches.get(top_branch_id) if top_branch_id else None

    waste = db.query(WasteLog).filter(WasteLog.date == yesterday).limit(3).all()
    waste_events = [f"{products.get(w.product_id, 'item')} at {branches.get(w.branch_id, 'a branch')} ({w.quantity} units, {w.reason})" for w in waste]

    alerts = _compute_alerts(db)

    return {
        "for_date": str(yesterday),
        "revenue": revenue,
        "order_count": len(orders),
        "top_products": top_products_named,
        "top_branch": top_branch,
        "waste_events": waste_events,
        "low_stock_count": len(alerts),
    }


@router.get("/daily")
def get_summary(db: Session = Depends(get_db)):
    row = db.query(SummaryCache).order_by(SummaryCache.id.desc()).first()
    if not row:
        return {"text": None}
    return {
        "text": row.text,
        "date": str(row.for_date),
        "revenue": row.revenue,
        "orderCount": row.order_count,
        "computedAt": row.computed_at.isoformat(),
    }


@router.post("/daily/refresh")
def refresh_summary(db: Session = Depends(get_db)):
    facts = _gather_facts(db)
    text = generate_daily_summary(facts)

    now = datetime.utcnow()
    row = db.query(SummaryCache).order_by(SummaryCache.id.desc()).first()
    if row:
        row.text = text
        row.for_date = date.fromisoformat(facts["for_date"])
        row.revenue = facts["revenue"]
        row.order_count = facts["order_count"]
        row.computed_at = now
    else:
        row = SummaryCache(
            text=text,
            for_date=date.fromisoformat(facts["for_date"]),
            revenue=facts["revenue"],
            order_count=facts["order_count"],
            computed_at=now,
        )
        db.add(row)
    db.commit()
    return {"text": text, "date": facts["for_date"], "revenue": facts["revenue"], "orderCount": facts["order_count"], "computedAt": now.isoformat()}
