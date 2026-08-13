from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.ml.sentiment import classify_sentiment
from app.models.models import Product, Review

router = APIRouter(prefix="/sentiment", tags=["sentiment"])


class ClassifyRequest(BaseModel):
    text: str
    rating: int


class ClassifyItem(BaseModel):
    id: int
    text: str
    rating: int


class ClassifyBatchRequest(BaseModel):
    items: list[ClassifyItem]


@router.post("/classify")
def classify_one(payload: ClassifyRequest):
    """Stateless — classifies and returns a label. Never writes to the database;
    the Business API is responsible for persisting the result."""
    return {"label": classify_sentiment(payload.text, payload.rating)}


@router.post("/classify-batch")
def classify_batch(payload: ClassifyBatchRequest):
    results = [{"id": item.id, "label": classify_sentiment(item.text, item.rating)} for item in payload.items]
    return {"results": results}


@router.get("/trend")
def sentiment_trend(db: Session = Depends(get_db)):
    reviews = db.query(Review).all()
    products = {p.id: p.name for p in db.query(Product).all()}

    counts = {"positive": 0, "neutral": 0, "negative": 0, "unclassified": 0}
    by_product: dict[int, dict] = {}
    for r in reviews:
        if not r.sentiment:
            counts["unclassified"] += 1
            continue
        counts[r.sentiment] = counts.get(r.sentiment, 0) + 1
        entry = by_product.setdefault(r.product_id, {"positive": 0, "neutral": 0, "negative": 0, "name": products.get(r.product_id, "Unknown")})
        entry[r.sentiment] += 1

    watchlist = [v["name"] for v in by_product.values() if v["negative"] > v["positive"]]
    return {"counts": counts, "watchlist": watchlist}
