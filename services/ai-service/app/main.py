from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import Base, engine
from app.routers import forecast, procurement, sentiment, summary
from app.scheduler import start_scheduler

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Project APEX — AI Service",
    description="Forecasting, procurement alerts, sentiment, executive summaries — owned by the AI & Automation Engineer role.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(forecast.router)
app.include_router(procurement.router)
app.include_router(summary.router)
app.include_router(sentiment.router)


@app.on_event("startup")
def on_startup():
    start_scheduler()


@app.get("/health")
def health():
    return {"status": "ok", "service": "ai-service"}
