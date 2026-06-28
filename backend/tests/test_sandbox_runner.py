import pytest

from app.services.sandbox_runner import (
    StrategyExecutionError,
    StrategyValidationError,
    run_strategy,
    validate_strategy_code,
)


SAFE_CODE = """
def decide(features: dict, position: dict) -> dict:
    rsi = float(features.get("rsi14", 50))
    holding = bool(position.get("holding", False))
    if (not holding) and rsi < 42:
        return {"action": "BUY", "reason": "low rsi"}
    return {"action": "HOLD", "reason": "wait"}
"""


def test_run_strategy_executes_safe_decide_function():
    result = run_strategy(SAFE_CODE, {"rsi14": 31}, {"holding": False, "entry_price": None, "pnl_pct": 0})

    assert result == {"action": "BUY", "reason": "low rsi"}


@pytest.mark.parametrize(
    "code",
    [
        "import os\n\ndef decide(features, position):\n    return {'action':'HOLD','reason':'x'}",
        "def decide(features, position):\n    open('x')\n    return {'action':'HOLD','reason':'x'}",
        "def decide(features, position):\n    return features.__class__",
        "def decide(features, position):\n    while True:\n        pass",
    ],
)
def test_validate_strategy_code_rejects_dangerous_code(code):
    with pytest.raises(StrategyValidationError):
        validate_strategy_code(code)


def test_run_strategy_rejects_invalid_action():
    code = "def decide(features, position):\n    return {'action':'WAIT','reason':'x'}"

    with pytest.raises(StrategyValidationError):
        run_strategy(code, {}, {"holding": False, "entry_price": None, "pnl_pct": 0})


def test_run_strategy_enforces_timeout():
    with pytest.raises(StrategyExecutionError):
        run_strategy(SAFE_CODE, {"rsi14": 31}, {"holding": False}, timeout_seconds=0)
