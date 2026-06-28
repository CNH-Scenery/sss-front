from collections.abc import Awaitable, Callable
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db import get_db
from app.services.survey_service import SurveyService


router = APIRouter(prefix="/api", tags=["surveys"])
CandleFetcher = Callable[[str, str, int], Awaitable[list[dict[str, Any]]]]


class GenerateSurveyRequest(BaseModel):
    market: str = "KRW-BTC"
    timeframe: str = "15"
    n: int = Field(default=10, ge=1, le=20)


def get_candle_fetcher() -> CandleFetcher | None:
    return None


@router.post("/surveys/generate")
async def generate_surveys(
    request: GenerateSurveyRequest,
    db: Session = Depends(get_db),
    candle_fetcher: CandleFetcher | None = Depends(get_candle_fetcher),
) -> dict[str, list[dict[str, Any]]]:
    service = SurveyService(db=db, candle_fetcher=candle_fetcher)
    surveys = await service.generate_surveys(request.market, request.timeframe, request.n)
    return {"surveys": surveys}


@router.get("/surveys/{survey_id}")
def get_survey(survey_id: int, db: Session = Depends(get_db)) -> dict[str, Any]:
    service = SurveyService(db=db)
    survey = service.get_survey(survey_id)
    if survey is None:
        raise HTTPException(status_code=404, detail="survey not found")
    return survey
