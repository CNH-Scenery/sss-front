import json
import random
from collections.abc import Awaitable, Callable
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.survey import Survey
from app.services.candle_cache import CandleCache
from app.services.feature_engine import calculate_features
from app.services.upbit_client import UpbitClient


KST = timezone(timedelta(hours=9))
CandleFetcher = Callable[[str, str, int], Awaitable[list[dict[str, Any]]]]

SURVEY_SCENARIOS = [
    {
        "title": "급락 후 과매도 반등",
        "intent": "손실 공포 vs 역추세 매수 성향",
        "reason": "하락 후 거래량이 늘어난 구간에서 반등 판단 성향을 확인합니다.",
        "tags": ["과매도", "거래량 증가", "반등"],
    },
    {
        "title": "상승 추세 눌림목",
        "intent": "추세 추종 vs 확인 대기 성향",
        "reason": "이동평균 우위가 유지되는 눌림 구간에서 진입 판단을 확인합니다.",
        "tags": ["정배열", "눌림목", "추세"],
    },
    {
        "title": "박스권 하단 반발",
        "intent": "지지선 신뢰도와 관망 성향",
        "reason": "하단 가격대에서 반등하는 구간의 매수/관망 기준을 확인합니다.",
        "tags": ["박스권", "지지", "반등"],
    },
    {
        "title": "거래량 동반 돌파",
        "intent": "모멘텀 추격과 돌파 확인 성향",
        "reason": "이전 고점을 거래량과 함께 넘는 구간에서 추격 여부를 확인합니다.",
        "tags": ["돌파", "모멘텀", "거래량"],
    },
]


class SurveyService:
    def __init__(self, db: Session, candle_fetcher: CandleFetcher | None = None):
        self.db = db
        self.candle_fetcher = candle_fetcher

    async def generate_surveys(self, market: str, timeframe: str, n: int) -> list[dict[str, Any]]:
        count = max(200, 120 + n * 20)
        candles, data_source = await self._get_source_candles(market, timeframe, count)
        surveys = []
        spacing = max(1, (len(candles) - 120) // max(1, n))

        for index in range(n):
            end = min(len(candles) - 1, 119 + index * spacing)
            window = candles[max(0, end - 131) : end + 1]
            scenario = SURVEY_SCENARIOS[index % len(SURVEY_SCENARIOS)]
            features = calculate_features(window)
            survey = Survey(
                user_id=1,
                market=market,
                timeframe=timeframe,
                decision_ts=_parse_ts(window[-1]["ts"]),
                title=scenario["title"],
                intent=scenario["intent"],
                reason=scenario["reason"],
                tags_json=json.dumps(scenario["tags"], ensure_ascii=False),
                chart_payload_json=json.dumps(_chart_payload(window), ensure_ascii=False),
                features_json=json.dumps(features, ensure_ascii=False),
                data_source=data_source,
            )
            self.db.add(survey)
            self.db.flush()
            surveys.append(self._to_payload(survey))

        self.db.commit()
        return surveys

    def get_survey(self, survey_id: int) -> dict[str, Any] | None:
        survey = self.db.get(Survey, survey_id)
        return self._to_payload(survey) if survey else None

    async def _get_source_candles(self, market: str, timeframe: str, count: int) -> tuple[list[dict[str, Any]], str]:
        try:
            if self.candle_fetcher is not None:
                candles = await self.candle_fetcher(market, timeframe, count)
            else:
                settings = get_settings()
                async with UpbitClient(base_url=settings.upbit_base_url) as client:
                    candles = await CandleCache(self.db, client).get_candles(market, timeframe, count)
            if len(candles) >= 120:
                return candles, "upbit"
        except Exception:
            pass
        return _synthetic_candles(market, count), "synthetic"

    def _to_payload(self, survey: Survey) -> dict[str, Any]:
        decision_ts = survey.decision_ts
        if decision_ts.tzinfo is None:
            decision_ts = decision_ts.replace(tzinfo=KST)
        return {
            "id": survey.id,
            "market": survey.market,
            "timeframe": survey.timeframe,
            "decision_ts": decision_ts.astimezone(KST).isoformat(),
            "title": survey.title,
            "intent": survey.intent,
            "reason": survey.reason,
            "tags": json.loads(survey.tags_json),
            "candles": json.loads(survey.chart_payload_json),
            "features": json.loads(survey.features_json),
            "data_source": survey.data_source,
        }


def _chart_payload(candles: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {
            "ts": candle.get("ts"),
            "o": float(candle["o"]),
            "h": float(candle["h"]),
            "l": float(candle["l"]),
            "c": float(candle["c"]),
            "v": float(candle["v"]),
        }
        for candle in candles
    ]


def _synthetic_candles(market: str, count: int) -> list[dict[str, Any]]:
    rng = random.Random(f"{market}:{count}")
    bases = {"KRW-BTC": 92_000_000, "KRW-ETH": 5_200_000, "KRW-SOL": 245_000, "KRW-XRP": 780}
    price = float(bases.get(market, 100_000))
    start = datetime(2026, 1, 1, 9, 0, tzinfo=KST)
    candles = []
    for i in range(count):
        drift = 0.0004 if i % 70 < 35 else -0.0002
        change = drift + (rng.random() - 0.5) * 0.018
        open_price = price
        close = max(1.0, open_price * (1 + change))
        high = max(open_price, close) * (1 + rng.random() * 0.006)
        low = min(open_price, close) * (1 - rng.random() * 0.006)
        volume = round((0.7 + rng.random() * 1.8) * 1000, 4)
        candles.append(
            {
                "ts": (start + timedelta(minutes=15 * i)).isoformat(),
                "o": open_price,
                "h": high,
                "l": low,
                "c": close,
                "v": volume,
                "raw": {"source": "synthetic", "i": i},
            }
        )
        price = close
    return candles


def _parse_ts(value: str) -> datetime:
    parsed = datetime.fromisoformat(value)
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=KST)
    return parsed.astimezone(KST)
