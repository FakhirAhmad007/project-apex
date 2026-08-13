import random
import string

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_roles
from app.models.models import Product
from app.schemas.schemas import ProductCreate, ProductOut

router = APIRouter(prefix="/api/products", tags=["products"])


def _generate_sku() -> str:
    return "SKU-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=6))


@router.get("", response_model=list[ProductOut])
def list_products(db: Session = Depends(get_db)):
    """Public — powers the storefront menu."""
    return db.query(Product).filter(Product.is_active == True).all()  # noqa: E712


@router.post("", response_model=ProductOut, dependencies=[Depends(require_roles("owner", "manager"))])
def create_product(payload: ProductCreate, db: Session = Depends(get_db)):
    product = Product(
        name=payload.name,
        category=payload.category,
        price=payload.price,
        emoji=payload.emoji,
        description=payload.description,
        sku=_generate_sku(),
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product
