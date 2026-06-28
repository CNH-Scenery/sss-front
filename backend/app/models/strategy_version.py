from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class StrategyVersion(Base):
    __tablename__ = "strategy_versions"
    __table_args__ = (UniqueConstraint("user_id", "version", name="uq_strategy_versions_user_version"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, index=True, default=1)
    version: Mapped[int] = mapped_column(Integer, index=True)
    code_text: Mapped[str] = mapped_column(Text)
    prompt_used: Mapped[str] = mapped_column(Text)
    source: Mapped[str] = mapped_column(String(32))
    validation_json: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
