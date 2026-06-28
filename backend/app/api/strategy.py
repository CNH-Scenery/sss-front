from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db import get_db
from app.services.strategy_service import StrategyService


router = APIRouter(prefix="/api", tags=["strategy"])


class RefineRequest(BaseModel):
    correction_text: str = Field(min_length=1)


@router.post("/strategy/codify")
async def codify_strategy(db: Session = Depends(get_db)) -> dict[str, Any]:
    return await StrategyService(db).codify()


@router.post("/strategy/refine")
async def refine_strategy(request: RefineRequest, db: Session = Depends(get_db)) -> dict[str, Any]:
    return await StrategyService(db).refine(request.correction_text)


@router.get("/strategy/{version}")
def get_strategy(version: int, db: Session = Depends(get_db)) -> dict[str, Any]:
    strategy = StrategyService(db).get_strategy(version)
    if strategy is None:
        raise HTTPException(status_code=404, detail="strategy not found")
    return strategy


@router.get("/strategy/{version}/consistency")
def get_strategy_consistency(version: int, db: Session = Depends(get_db)) -> dict[str, Any]:
    consistency = StrategyService(db).get_consistency(version)
    if consistency is None:
        raise HTTPException(status_code=404, detail="strategy not found")
    return consistency
