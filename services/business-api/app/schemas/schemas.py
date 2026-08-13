from datetime import datetime, date
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# ---------- Auth ----------
class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=8)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: str
    role: str
    branch_id: Optional[int] = None


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class RoleUpdate(BaseModel):
    role: str  # owner | manager | staff
    branch_id: Optional[int] = None


# ---------- Branch ----------
class BranchCreate(BaseModel):
    name: str
    address: str


class BranchOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    address: str
    is_active: bool


# ---------- Product ----------
class ProductCreate(BaseModel):
    name: str
    category: str
    price: float
    emoji: str = "🍰"
    description: str = ""


class ProductOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    category: str
    price: float
    sku: str
    emoji: str
    description: str
    is_active: bool


# ---------- Inventory ----------
class InventoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    product_id: int
    branch_id: int
    quantity: int
    safety_threshold: int
    updated_at: datetime


class InventoryUpdate(BaseModel):
    quantity: Optional[int] = None
    safety_threshold: Optional[int] = None


# ---------- Orders ----------
class OrderItemIn(BaseModel):
    product_id: int
    quantity: int


class OrderItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    product_id: int
    quantity: int
    unit_price: float


class OrderCreate(BaseModel):
    customer_name: str
    customer_phone: str
    delivery_address: str = ""
    branch_id: int
    items: list[OrderItemIn]


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    branch_id: int
    status: str
    total: float
    delivery_address: str
    created_at: datetime
    items: list[OrderItemOut] = []


class OrderStatusUpdate(BaseModel):
    status: str


# ---------- Waste ----------
class WasteCreate(BaseModel):
    product_id: int
    branch_id: int
    quantity: int
    reason: str


class WasteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    product_id: int
    branch_id: int
    quantity: int
    reason: str
    date: date


# ---------- Reviews ----------
class ReviewCreate(BaseModel):
    product_id: int
    customer_name: str
    customer_phone: str
    rating: int = Field(ge=1, le=5)
    text: str


class ReviewOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    product_id: int
    rating: int
    text: str
    sentiment: Optional[str] = None
    created_at: datetime
