from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db import get_db
from app.services.response_service import ResponseService


router = APIRouter(prefix="/api", tags=["responses"])
Action = Literal["BUY", "SELL", "HOLD"]


class SaveResponseRequest(BaseModel):
    survey_id: int
    action: Action
    reasoning: str = Field(min_length=1)


@router.post("/responses")
def save_response(request: SaveResponseRequest, db: Session = Depends(get_db)):
    service = ResponseService(db)
    try:
        response = service.save_response(request.survey_id, request.action, request.reasoning)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return {"ok": True, "response": response}
