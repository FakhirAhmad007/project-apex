import logging

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from app.core.database import SessionLocal
from app.ml.forecasting import compute_forecast_all
from app.ml.summary import generate_daily_summary
from app.models.models import AlertsCache, ForecastCache, SummaryCache
from app.routers.procurement import _compute_alerts
from app.routers.summary import _gather_facts
from datetime import date, datetime

logger = logging.getLogger("scheduler")

scheduler = BackgroundScheduler(timezone="Asia/Karachi")


def job_nightly_forecast():
    db = SessionLocal()
    try:
        data = compute_forecast_all(db)
        row = db.query(ForecastCache).order_by(ForecastCache.id.desc()).first()
        now = datetime.utcnow()
        if row:
            row.data, row.computed_at = data, now
        else:
            db.add(ForecastCache(data=data, computed_at=now))
        db.commit()
        logger.info("nightly-forecast: refreshed %d rows", len(data))
    finally:
        db.close()


def job_stock_check():
    db = SessionLocal()
    try:
        data = _compute_alerts(db)
        row = db.query(AlertsCache).order_by(AlertsCache.id.desc()).first()
        now = datetime.utcnow()
        if row:
            row.data, row.computed_at = data, now
        else:
            db.add(AlertsCache(data=data, computed_at=now))
        db.commit()
        logger.info("stock-check: %d alerts", len(data))
    finally:
        db.close()


def job_daily_summary():
    db = SessionLocal()
    try:
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
            db.add(
                SummaryCache(
                    text=text,
                    for_date=date.fromisoformat(facts["for_date"]),
                    revenue=facts["revenue"],
                    order_count=facts["order_count"],
                    computed_at=now,
                )
            )
        db.commit()
        logger.info("daily-summary: generated")
    finally:
        db.close()


def start_scheduler():
    scheduler.add_job(job_nightly_forecast, CronTrigger(hour=0, minute=30), id="nightly-forecast", replace_existing=True)
    scheduler.add_job(job_stock_check, CronTrigger(minute=0), id="stock-check", replace_existing=True)
    scheduler.add_job(job_daily_summary, CronTrigger(hour=7, minute=0), id="daily-summary", replace_existing=True)
    scheduler.start()
    logger.info("APScheduler started: nightly-forecast (00:30), stock-check (hourly), daily-summary (07:00)")
