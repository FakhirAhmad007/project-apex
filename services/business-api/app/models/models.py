from datetime import datetime, date

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.core.database import Base


class User(Base):
    """Staff accounts for RBAC — owner, manager, staff, each scoped to a branch."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default="staff")  # owner | manager | staff
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    branch = relationship("Branch", back_populates="users")


class Branch(Base):
    """Physical outlet; nearly every other table hangs off branch_id."""

    __tablename__ = "branches"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    address = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    users = relationship("User", back_populates="branch")
    inventory = relationship("Inventory", back_populates="branch")
    orders = relationship("Order", back_populates="branch")
    waste_logs = relationship("WasteLog", back_populates="branch")


class Customer(Base):
    """End consumers placing orders; no login required to browse the storefront."""

    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    phone = Column(String(30), unique=True, nullable=False, index=True)
    address = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    orders = relationship("Order", back_populates="customer")
    reviews = relationship("Review", back_populates="customer")


class Product(Base):
    """Catalog item, shared across branches; stock levels live in Inventory."""

    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(150), nullable=False)
    category = Column(String(60), nullable=False, index=True)
    price = Column(Float, nullable=False)
    sku = Column(String(40), unique=True, nullable=False)
    emoji = Column(String(10), default="🍰")
    description = Column(Text, default="")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    inventory = relationship("Inventory", back_populates="product")
    order_items = relationship("OrderItem", back_populates="product")
    waste_logs = relationship("WasteLog", back_populates="product")
    reviews = relationship("Review", back_populates="product")


class Inventory(Base):
    """Per-branch stock; safety_threshold is what triggers reorder alerts."""

    __tablename__ = "inventory"
    __table_args__ = (Index("ix_inventory_product_branch", "product_id", "branch_id"),)

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False)
    quantity = Column(Integer, default=0)
    safety_threshold = Column(Integer, default=15)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    product = relationship("Product", back_populates="inventory")
    branch = relationship("Branch", back_populates="inventory")


class Order(Base):
    """A checkout transaction; status drives the order-tracking view."""

    __tablename__ = "orders"
    __table_args__ = (Index("ix_orders_branch_created", "branch_id", "created_at"),)

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False)
    status = Column(String(30), default="pending")
    total = Column(Float, default=0)
    delivery_address = Column(String(255), default="")
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    customer = relationship("Customer", back_populates="orders")
    branch = relationship("Branch", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    """Line items per order — the raw data the forecasting model trains on."""

    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)

    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")


class WasteLog(Base):
    """Spoilage/damage tracking, independent of sales — feeds waste analytics."""

    __tablename__ = "waste_logs"
    __table_args__ = (Index("ix_waste_branch_created", "branch_id", "created_at"),)

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    branch_id = Column(Integer, ForeignKey("branches.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    reason = Column(String(120), nullable=False)
    date = Column(Date, default=date.today)
    created_at = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product", back_populates="waste_logs")
    branch = relationship("Branch", back_populates="waste_logs")


class Review(Base):
    """Feeds the sentiment analysis pipeline."""

    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    rating = Column(Integer, nullable=False)
    text = Column(Text, nullable=False)
    sentiment = Column(String(20), nullable=True)  # positive | neutral | negative | null
    created_at = Column(DateTime, default=datetime.utcnow)

    product = relationship("Product", back_populates="reviews")
    customer = relationship("Customer", back_populates="reviews")
