from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.core.config import settings

# In production, DATABASE_URL for this service should point at a Postgres role
# with SELECT-only grants on the business tables (orders, order_items, products,
# branches, inventory, waste_logs, reviews) — see README "Read-only DB role" —
# and full read/write on this service's own cache tables below.
engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
