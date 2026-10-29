"""GET/POST /forecast - Demand forecasting for campus resources."""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, List

router = APIRouter()

class ForecastRequest(BaseModel):
    resourceId: str
    historicalDailyDemand: List[int] = []
    horizonDays: int = 7

class ForecastResponse(BaseModel):
    resourceId: str
    predictedDemand: List[float]
    confidenceScore: float

@router.post("/forecast", response_model=ForecastResponse)
async def forecast_demand(payload: ForecastRequest) -> ForecastResponse:
    # TODO: Implement 7-day seasonal moving average demand forecast
    history = payload.historicalDailyDemand
    avg = sum(history) / len(history) if history else 3.0
    predictions = [round(avg * (1.0 + (i * 0.05)), 1) for i in range(payload.horizonDays)]
    return ForecastResponse(
        resourceId=payload.resourceId,
        predictedDemand=predictions,
        confidenceScore=0.85,
    )
