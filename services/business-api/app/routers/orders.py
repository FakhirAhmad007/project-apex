from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.models import Customer, Inventory, Order, OrderItem, Product
from app.schemas.schemas import OrderCreate, OrderOut, OrderStatusUpdate

router = APIRouter(prefix="/api/orders", tags=["orders"])


@router.post("", response_model=OrderOut)
def create_order(payload: OrderCreate, db: Session = Depends(get_db)):
    """Public checkout — no login required, matches the storefront's COD-simulation flow."""
    if not payload.items:
        raise HTTPException(status_code=400, detail="An order needs at least one item")

    customer = db.query(Customer).filter(Customer.phone == payload.customer_phone).first()
    if not customer:
        customer = Customer(
            name=payload.customer_name,
            phone=payload.customer_phone,
            address=payload.delivery_address,
        )
        db.add(customer)
        db.flush()

    order = Order(
        customer_id=customer.id,
        branch_id=payload.branch_id,
        delivery_address=payload.delivery_address,
        status="pending",
    )
    db.add(order)
    db.flush()

    total = 0.0
    for line in payload.items:
        product = db.query(Product).filter(Product.id == line.product_id).first()
        if not product:
            raise HTTPException(status_code=400, detail=f"Product {line.product_id} not found")
        unit_price = product.price
        total += unit_price * line.quantity
        db.add(
            OrderItem(
                order_id=order.id,
                product_id=product.id,
                quantity=line.quantity,
                unit_price=unit_price,
            )
        )
        inv = (
            db.query(Inventory)
            .filter(Inventory.product_id == product.id, Inventory.branch_id == payload.branch_id)
            .first()
        )
        if inv:
            inv.quantity = max(0, inv.quantity - line.quantity)

    order.total = total
    db.commit()
    db.refresh(order)
    return order


@router.get("/track", response_model=list[OrderOut])
def track_orders(phone: str, db: Session = Depends(get_db)):
    """Public — customers look up their own orders by phone number."""
    customer = db.query(Customer).filter(Customer.phone == phone).first()
    if not customer:
        return []
    return (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.customer_id == customer.id)
        .order_by(Order.created_at.desc())
        .limit(20)
        .all()
    )


@router.get("", response_model=list[OrderOut], dependencies=[Depends(get_current_user)])
def list_orders(db: Session = Depends(get_db)):
    return (
        db.query(Order)
        .options(joinedload(Order.items))
        .order_by(Order.created_at.desc())
        .limit(200)
        .all()
    )


@router.put("/{order_id}/status", response_model=OrderOut, dependencies=[Depends(get_current_user)])
def update_order_status(order_id: int, payload: OrderStatusUpdate, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    order.status = payload.status
    db.commit()
    db.refresh(order)
    return order
