import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import Customer, Review
from app.schemas.schemas import ReviewCreate, ReviewOut

router = APIRouter(prefix="/api/reviews", tags=["reviews"])


@router.get("", response_model=list[ReviewOut])
def list_reviews(product_id: int | None = None, db: Session = Depends(get_db)):
    """Public — product pages show reviews without requiring login."""
    q = db.query(Review)
    if product_id:
        q = q.filter(Review.product_id == product_id)
    return q.order_by(Review.created_at.desc()).all()


@router.post("", response_model=ReviewOut)
def create_review(payload: ReviewCreate, db: Session = Depends(get_db)):
    """Public submission. Writes the review, then calls the AI service's sentiment
    endpoint over the internal HTTP contract and stores the classification result.
    The AI service itself never writes to the database — this keeps it strictly
    read-only, as specified in the architecture doc."""
    customer = db.query(Customer).filter(Customer.phone == payload.customer_phone).first()
    if not customer:
        customer = Customer(name=payload.customer_name, phone=payload.customer_phone)
        db.add(customer)
        db.flush()

    review = Review(
        product_id=payload.product_id,
        customer_id=customer.id,
        rating=payload.rating,
        text=payload.text,
    )
    db.add(review)
    db.commit()
    db.refresh(review)

    try:
        with httpx.Client(timeout=8.0) as client:
            resp = client.post(
                f"{settings.ai_service_url}/sentiment/classify",
                json={"text": payload.text, "rating": payload.rating},
            )
            resp.raise_for_status()
            review.sentiment = resp.json()["label"]
            db.commit()
            db.refresh(review)
    except httpx.HTTPError:
        # AI service unavailable — review is still saved, sentiment stays null
        # until the AI service's own batch job or a manual retry picks it up.
        pass

    return review


@router.get("/pending-count", dependencies=[Depends(get_current_user)])
def pending_count(db: Session = Depends(get_db)):
    count = db.query(Review).filter(Review.sentiment.is_(None)).count()
    return {"pending": count}


@router.post("/classify-pending", dependencies=[Depends(get_current_user)])
def classify_pending(db: Session = Depends(get_db)):
    """Batches unclassified reviews to the AI service's stateless classifier and
    writes the results back here. The AI service returns labels only — it never
    writes to this database — so this write step lives in the Business API."""
    pending = db.query(Review).filter(Review.sentiment.is_(None)).limit(20).all()
    if not pending:
        return {"classified": 0}

    items = [{"id": r.id, "text": r.text, "rating": r.rating} for r in pending]
    try:
        with httpx.Client(timeout=30.0) as client:
            resp = client.post(f"{settings.ai_service_url}/sentiment/classify-batch", json={"items": items})
            resp.raise_for_status()
            results = resp.json()["results"]
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"AI service unavailable: {exc}")

    by_id = {r["id"]: r["label"] for r in results}
    for review in pending:
        if review.id in by_id:
            review.sentiment = by_id[review.id]
    db.commit()
    return {"classified": len(by_id)}
