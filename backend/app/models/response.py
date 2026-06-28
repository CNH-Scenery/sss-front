from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class SurveyResponse(Base):
    __tablename__ = "responses"
    __table_args__ = (UniqueConstraint("user_id", "survey_id", name="uq_responses_user_survey"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, index=True, default=1)
    survey_id: Mapped[int] = mapped_column(ForeignKey("surveys.id"), index=True)
    action: Mapped[str] = mapped_column(String(8))
    reasoning_text: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
