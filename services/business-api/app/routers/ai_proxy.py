import httpx
from fastapi import APIRouter, Depends, HTTPException

from app.core.config import settings
from app.core.security import get_current_user

router = APIRouter(prefix="/api/ai", tags=["ai"])


async def _proxy_get(path: str):
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.get(f"{settings.ai_service_url}{path}")
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=502, detail=f"AI service unavailable: {exc}")


async def _proxy_post(path: str, json: dict | None = None):
    async with httpx.AsyncClient(timeout=180.0) as client:
        try:
            resp = await client.post(f"{settings.ai_service_url}{path}", json=json or {})
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=502, detail=f"AI service unavailable: {exc}")


@router.get("/forecast/weekly", dependencies=[Depends(get_current_user)])
async def forecast_weekly():
    return await _proxy_get("/forecast/weekly")


@router.post("/forecast/weekly/refresh", dependencies=[Depends(get_current_user)])
async def forecast_weekly_refresh():
    return await _proxy_post("/forecast/weekly/refresh")


@router.get("/procurement/alerts", dependencies=[Depends(get_current_user)])
async def procurement_alerts():
    return await _proxy_get("/procurement/alerts")


@router.post("/procurement/alerts/refresh", dependencies=[Depends(get_current_user)])
async def procurement_alerts_refresh():
    return await _proxy_post("/procurement/alerts/refresh")


@router.get("/summary/daily", dependencies=[Depends(get_current_user)])
async def summary_daily():
    return await _proxy_get("/summary/daily")


@router.post("/summary/daily/refresh", dependencies=[Depends(get_current_user)])
async def summary_daily_refresh():
    return await _proxy_post("/summary/daily/refresh")


@router.get("/sentiment/trend", dependencies=[Depends(get_current_user)])
async def sentiment_trend():
    return await _proxy_get("/sentiment/trend")
