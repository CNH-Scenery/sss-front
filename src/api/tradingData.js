function cleanStrategyParams(params = {}) {
  return {
    rsiBuy: Number.isFinite(Number(params.rsiBuy)) ? Number(params.rsiBuy) : 42,
    volBuy: Number.isFinite(Number(params.volBuy)) ? Number(params.volBuy) : 1.05,
    rsiSell: Number.isFinite(Number(params.rsiSell)) ? Number(params.rsiSell) : 60,
    pnlTake: Number.isFinite(Number(params.pnlTake)) ? Number(params.pnlTake) : 10,
    pnlStop: Number.isFinite(Number(params.pnlStop)) ? Number(params.pnlStop) : -6,
  };
}

async function readJson(response, fallbackMessage) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.detail || body.message || fallbackMessage || `Request failed (${response.status})`);
  }
  return body;
}

export async function runBackendBacktest({
  market,
  startDate,
  endDate,
  strategyParams,
  signal,
}) {
  const response = await fetch("/api/backtests/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      strategy_id: null,
      market,
      timeframe: "1d",
      period_start: startDate || null,
      period_end: endDate || null,
      initial_cash: 1,
      strategy_params: cleanStrategyParams(strategyParams),
    }),
    signal,
  });
  return readJson(response, "Backtest request failed.");
}

export async function fetchBackendCandles({
  market,
  source,
  count,
  unit,
  seconds,
  bucketSeconds,
  signal,
}) {
  const params = new URLSearchParams({
    market,
    source,
    count: String(count || 200),
    unit: String(unit || 1),
    seconds: String(seconds || count || 200),
    bucket_seconds: String(bucketSeconds || 1),
  });
  const response = await fetch(`/api/market/candles?${params.toString()}`, { signal });
  const body = await readJson(response, "Candle request failed.");
  return Array.isArray(body.candles) ? body.candles : [];
}

export async function evaluateBackendMonitor({
  market,
  strategyParams,
  position,
  signal,
}) {
  const response = await fetch("/api/signals/monitor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      market,
      strategy_params: cleanStrategyParams(strategyParams),
      position: {
        holding: !!position?.holding,
        entry: Number.isFinite(Number(position?.entry)) ? Number(position.entry) : 0,
      },
      unit: 1,
      count: 120,
    }),
    signal,
  });
  return readJson(response, "Monitor request failed.");
}
