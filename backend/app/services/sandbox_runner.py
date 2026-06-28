import ast
import multiprocessing
import queue
from typing import Any


class StrategyValidationError(ValueError):
    pass


class StrategyExecutionError(RuntimeError):
    pass


BANNED_NODES = (
    ast.Import,
    ast.ImportFrom,
    ast.With,
    ast.AsyncFunctionDef,
    ast.ClassDef,
    ast.Lambda,
    ast.Global,
    ast.Nonlocal,
    ast.Try,
    ast.Raise,
    ast.Delete,
    ast.While,
)
BANNED_NAMES = {
    "open",
    "exec",
    "eval",
    "compile",
    "__import__",
    "input",
    "globals",
    "locals",
    "vars",
    "dir",
    "getattr",
    "setattr",
    "delattr",
}
BANNED_ATTRIBUTES = {"__dict__", "__class__", "__subclasses__", "__globals__", "__mro__"}
SAFE_BUILTINS = {
    "abs": abs,
    "min": min,
    "max": max,
    "round": round,
    "float": float,
    "int": int,
    "str": str,
    "bool": bool,
    "len": len,
    "dict": dict,
}
VALID_ACTIONS = {"BUY", "SELL", "HOLD"}


def validate_strategy_code(code: str) -> ast.Module:
    try:
        tree = ast.parse(code)
    except SyntaxError as exc:
        raise StrategyValidationError(f"invalid python syntax: {exc}") from exc

    has_decide = False
    for node in ast.walk(tree):
        if isinstance(node, BANNED_NODES):
            raise StrategyValidationError(f"disallowed syntax: {type(node).__name__}")
        if isinstance(node, ast.Name) and node.id in BANNED_NAMES:
            raise StrategyValidationError(f"disallowed name: {node.id}")
        if isinstance(node, ast.Attribute) and node.attr in BANNED_ATTRIBUTES:
            raise StrategyValidationError(f"disallowed attribute: {node.attr}")
        if isinstance(node, ast.FunctionDef) and node.name == "decide":
            has_decide = True

    if not has_decide:
        raise StrategyValidationError("strategy must define decide(features, position)")
    return tree


def run_strategy(
    code: str,
    features: dict[str, Any],
    position: dict[str, Any],
    timeout_seconds: float = 1.0,
) -> dict[str, str]:
    tree = validate_strategy_code(code)
    ctx = multiprocessing.get_context("spawn")
    result_queue = ctx.Queue()
    process = ctx.Process(target=_execute_in_child, args=(ast.unparse(tree), features, position, result_queue))
    process.start()
    process.join(timeout_seconds)
    if process.is_alive():
        process.terminate()
        process.join()
        raise StrategyExecutionError("strategy execution timed out")

    try:
        status, payload = result_queue.get_nowait()
    except queue.Empty as exc:
        raise StrategyExecutionError("strategy execution returned no result") from exc

    if status == "error":
        raise StrategyExecutionError(str(payload))
    return _validate_result(payload)


def _execute_in_child(
    code: str,
    features: dict[str, Any],
    position: dict[str, Any],
    result_queue: multiprocessing.Queue,
) -> None:
    try:
        env = {"__builtins__": SAFE_BUILTINS}
        exec(compile(code, "<strategy>", "exec"), env, env)
        decide = env.get("decide")
        if not callable(decide):
            raise StrategyValidationError("decide is not callable")
        result_queue.put(("ok", decide(features, position)))
    except Exception as exc:
        result_queue.put(("error", f"{type(exc).__name__}: {exc}"))


def _validate_result(result: Any) -> dict[str, str]:
    if not isinstance(result, dict):
        raise StrategyValidationError("strategy result must be a dict")
    action = result.get("action")
    reason = result.get("reason")
    if action not in VALID_ACTIONS:
        raise StrategyValidationError("strategy action must be BUY, SELL, or HOLD")
    if not isinstance(reason, str):
        raise StrategyValidationError("strategy reason must be a string")
    return {"action": action, "reason": reason}
