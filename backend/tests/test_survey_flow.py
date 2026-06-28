from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import sessionmaker

from app.db import Base, create_engine_from_url, get_db
from app.main import app
from app.api.surveys import get_candle_fetcher
from app.models.context_log import ContextLog
from app.models.response import SurveyResponse


KST = timezone(timedelta(hours=9))


def make_candles(count: int = 200):
    start = datetime(2026, 6, 1, 9, 0, tzinfo=KST)
    candles = []
    price = 100.0
    for i in range(count):
        close = price + (i % 9 - 4) * 0.2 + 0.4
        candles.append(
            {
                "ts": (start + timedelta(minutes=15 * i)).isoformat(),
                "o": price,
                "h": max(price, close) + 1.0,
                "l": min(price, close) - 1.0,
                "c": close,
                "v": 100.0 + i,
                "raw": {"i": i},
            }
        )
        price = close
    return candles


def make_client(tmp_path):
    engine = create_engine_from_url(f"sqlite:///{tmp_path / 'survey_flow.db'}")
    Base.metadata.create_all(engine)
    SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)

    def override_db():
        with SessionLocal() as db:
            yield db

    async def fake_fetcher(market: str, timeframe: str, count: int):
        return make_candles(count)

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_candle_fetcher] = lambda: fake_fetcher
    return TestClient(app), SessionLocal


def test_generate_surveys_returns_persisted_surveys_with_features(tmp_path):
    client, _ = make_client(tmp_path)

    response = client.post("/api/surveys/generate", json={"market": "KRW-BTC", "timeframe": "15", "n": 2})

    assert response.status_code == 200
    surveys = response.json()["surveys"]
    assert len(surveys) == 2
    assert surveys[0]["id"] == 1
    assert surveys[0]["market"] == "KRW-BTC"
    assert surveys[0]["timeframe"] == "15"
    assert surveys[0]["data_source"] == "upbit"
    assert len(surveys[0]["candles"]) >= 120
    assert {"close", "rsi14", "vol_ratio", "ma_align"}.issubset(surveys[0]["features"])

    read_response = client.get("/api/surveys/1")

    assert read_response.status_code == 200
    assert read_response.json()["id"] == 1
    assert read_response.json()["features"] == surveys[0]["features"]

    app.dependency_overrides.clear()


def test_save_response_upserts_latest_answer_and_writes_context_log(tmp_path):
    client, SessionLocal = make_client(tmp_path)
    client.post("/api/surveys/generate", json={"market": "KRW-BTC", "timeframe": "15", "n": 1})

    first = client.post(
        "/api/responses",
        json={"survey_id": 1, "action": "BUY", "reasoning": "RSI가 낮고 거래량이 증가했습니다."},
    )
    second = client.post(
        "/api/responses",
        json={"survey_id": 1, "action": "SELL", "reasoning": "반등이 약해서 정리합니다."},
    )

    assert first.status_code == 200
    assert second.status_code == 200
    assert second.json()["response"]["action"] == "SELL"

    with SessionLocal() as db:
        stored_responses = db.execute(select(SurveyResponse)).scalars().all()
        logs = db.execute(select(ContextLog)).scalars().all()

    assert len(stored_responses) == 1
    assert stored_responses[0].action == "SELL"
    assert len(logs) == 2
    assert {log.type for log in logs} == {"response"}

    app.dependency_overrides.clear()
