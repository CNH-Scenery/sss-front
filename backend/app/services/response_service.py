import json
from datetime import datetime, timezone
from typing import Literal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.context_log import ContextLog
from app.models.response import SurveyResponse
from app.models.survey import Survey


Action = Literal["BUY", "SELL", "HOLD"]


class ResponseService:
    def __init__(self, db: Session):
        self.db = db

    def save_response(self, survey_id: int, action: Action, reasoning: str) -> dict[str, str | int]:
        survey = self.db.get(Survey, survey_id)
        if survey is None:
            raise ValueError("survey not found")

        now = datetime.now(timezone.utc)
        response = self.db.execute(
            select(SurveyResponse).where(SurveyResponse.user_id == 1, SurveyResponse.survey_id == survey_id)
        ).scalar_one_or_none()
        if response is None:
            response = SurveyResponse(user_id=1, survey_id=survey_id, action=action, reasoning_text=reasoning)
            self.db.add(response)
        else:
            response.action = action
            response.reasoning_text = reasoning
            response.created_at = now

        self.db.add(
            ContextLog(
                user_id=1,
                type="response",
                content_json=json.dumps(
                    {
                        "survey_id": survey_id,
                        "action": action,
                        "reasoning": reasoning,
                        "features": json.loads(survey.features_json),
                    },
                    ensure_ascii=False,
                ),
            )
        )
        self.db.commit()
        self.db.refresh(response)

        created_at = response.created_at
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        return {
            "survey_id": response.survey_id,
            "action": response.action,
            "reasoning": response.reasoning_text,
            "created_at": created_at.isoformat(),
        }
