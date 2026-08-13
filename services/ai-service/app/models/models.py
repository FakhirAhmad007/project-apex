from datetime import datetime, date

from sqlalchemy import Column, Date, DateTime, Float, Integer, JSON, String, Text

from app.core.database import Base


# ---------- Read-only mirrors of Business API tables ----------
# Same table names/columns as services/business-api/app/models/models.py.
# This service only ever SELECTs from these — see database.py.

class Branch(Base):
    __tablename__ = "branches"
    id = Column(Integer, primary_key=True)
    name = Column(String(150))
    address = Column(String(255))
    is_active = Column(String)


class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True)
    name = Column(String(150))
    category = Column(String(60))
    price = Column(Float)
    is_active = Column(String)


class Inventory(Base):
    __tablename__ = "inventory"
    id = Column(Integer, primary_key=True)
    product_id = Column(Integer)
    branch_id = Column(Integer)
    quantity = Column(Integer)
    safety_threshold = Column(Integer)


class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True)
    branch_id = Column(Integer)
    total = Column(Float)
    created_at = Column(DateTime)


class OrderItem(Base):
    __tablename__ = "order_items"
    id = Column(Integer, primary_key=True)
    order_id = Column(Integer)
    product_id = Column(Integer)
    quantity = Column(Integer)


class WasteLog(Base):
    __tablename__ = "waste_logs"
    id = Column(Integer, primary_key=True)
    product_id = Column(Integer)
    branch_id = Column(Integer)
    quantity = Column(Integer)
    reason = Column(String(120))
    date = Column(Date)


class Review(Base):
    __tablename__ = "reviews"
    id = Column(Integer, primary_key=True)
    product_id = Column(Integer)
    rating = Column(Integer)
    text = Column(Text)
    sentiment = Column(String(20))


# ---------- This service's own cache tables (read + write) ----------

class ForecastCache(Base):
    __tablename__ = "ai_forecast_cache"
    id = Column(Integer, primary_key=True)
    data = Column(JSON)
    computed_at = Column(DateTime, default=datetime.utcnow)


class AlertsCache(Base):
    __tablename__ = "ai_alerts_cache"
    id = Column(Integer, primary_key=True)
    data = Column(JSON)
    computed_at = Column(DateTime, default=datetime.utcnow)


class SummaryCache(Base):
    __tablename__ = "ai_summary_cache"
    id = Column(Integer, primary_key=True)
    text = Column(Text)
    for_date = Column(Date)
    revenue = Column(Float)
    order_count = Column(Integer)
    computed_at = Column(DateTime, default=datetime.utcnow)
