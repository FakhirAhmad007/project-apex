import logging
from datetime import date, timedelta

import pandas as pd
from prophet import Prophet
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.models import Branch, Order, OrderItem, Product

logging.getLogger("cmdstanpy").setLevel(logging.WARNING)
logging.getLogger("prophet").setLevel(logging.WARNING)

MIN_DAYS_FOR_PROPHET = 14  # below this, fall back to a simple average projection


def _daily_series(db: Session, branch_id: int, product_id: int) -> pd.DataFrame:
    rows = (
        db.query(
            func.date(Order.created_at).label("ds"),
            func.sum(OrderItem.quantity).label("y"),
        )
        .join(OrderItem, OrderItem.order_id == Order.id)
        .filter(Order.branch_id == branch_id, OrderItem.product_id == product_id)
        .group_by(func.date(Order.created_at))
        .order_by(func.date(Order.created_at))
        .all()
    )
    return pd.DataFrame(rows, columns=["ds", "y"])


def _forecast_one(df: pd.DataFrame) -> dict:
    if df.empty:
        return {"predictedQuantity": 0, "dailyAverage": 0, "dailyForecast": []}

    if len(df) < MIN_DAYS_FOR_PROPHET:
        # Not enough history for a seasonal model yet — use the plain average
        # as a defensible baseline rather than let Prophet overfit noise.
        avg = float(df["y"].mean())
        daily = [
            {"date": str(date.today() + timedelta(days=i)), "quantity": round(avg)}
            for i in range(1, 8)
        ]
        return {
            "predictedQuantity": round(avg * 7),
            "dailyAverage": round(avg, 1),
            "dailyForecast": daily,
            "model": "average (insufficient history for Prophet)",
        }

    df["ds"] = pd.to_datetime(df["ds"])
    model = Prophet(
        weekly_seasonality=True,
        yearly_seasonality=False,
        daily_seasonality=False,
        interval_width=0.8,
    )
    model.fit(df)
    future = model.make_future_dataframe(periods=7, include_history=False)
    forecast = model.predict(future)
    forecast["yhat"] = forecast["yhat"].clip(lower=0)

    daily = [
        {"date": row.ds.strftime("%Y-%m-%d"), "quantity": round(row.yhat)}
        for row in forecast.itertuples()
    ]
    total = sum(d["quantity"] for d in daily)
    return {
        "predictedQuantity": total,
        "dailyAverage": round(total / 7, 1),
        "dailyForecast": daily,
        "model": "prophet",
    }


def compute_forecast_all(db: Session) -> list[dict]:
    branches = db.query(Branch).all()
    products = db.query(Product).all()
    results = []
    for branch in branches:
        for product in products:
            df = _daily_series(db, branch.id, product.id)
            if df.empty:
                continue
            forecast = _forecast_one(df)
            results.append(
                {
                    "branchId": branch.id,
                    "branchName": branch.name,
                    "productId": product.id,
                    "productName": product.name,
                    "category": product.category,
                    **forecast,
                }
            )
    results.sort(key=lambda r: r["predictedQuantity"], reverse=True)
    return results
