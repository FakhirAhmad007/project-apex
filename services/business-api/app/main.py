from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import Base, engine
from app.routers import ai_proxy, auth, branches, inventory, orders, products, reviews, staff, waste

# For local/dev convenience only — in production, schema changes go through
# Alembic migrations (see alembic/ and scripts/simulate_business.py).
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Project APEX — Business API",
    description="Auth, catalog, orders, inventory — owned by the Digital Transformation Engineer role.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(branches.router)
app.include_router(products.router)
app.include_router(inventory.router)
app.include_router(orders.router)
app.include_router(waste.router)
app.include_router(reviews.router)
app.include_router(staff.router)
app.include_router(ai_proxy.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "business-api"}
