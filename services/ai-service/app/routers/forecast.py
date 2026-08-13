from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.ml.forecasting import compute_forecast_all
from app.models.models import ForecastCache

router = APIRouter(prefix="/forecast", tags=["forecast"])


@router.get("/weekly")
def get_forecast(db: Session = Depends(get_db)):
    row = db.query(ForecastCache).order_by(ForecastCache.id.desc()).first()
    if not row:
        return {"data": [], "computedAt": None}
    return {"data": row.data, "computedAt": row.computed_at.isoformat()}


@router.post("/weekly/refresh")
def refresh_forecast(db: Session = Depends(get_db)):
    data = compute_forecast_all(db)
    row = db.query(ForecastCache).order_by(ForecastCache.id.desc()).first()
    now = datetime.utcnow()
    if row:
        row.data = data
        row.computed_at = now
    else:
        row = ForecastCache(data=data, computed_at=now)
        db.add(row)
    db.commit()
    return {"data": data, "computedAt": now.isoformat()}
