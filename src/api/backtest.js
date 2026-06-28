// 프론트엔드 → 백엔드(sss-back) 백테스트 API 헬퍼.
// 생성된(검증 통과) 코드의 code_id 로 백엔드가 동일한 파이썬 decide() 를 과거 캔들에
// 돌려 결과를 돌려준다. 응답: { backtest_run_id, code_id, market, timeframe,
//   period_start, period_end, metrics:{totalReturn,bhReturn,winRate,trades,mdd,vsBH},
//   eq:[정규화 전략수익], bh:[정규화 B&H], candles:[{t,o,h,l,c}], markers:[{i,type}] }

import { API_BASE_URL } from "./base.js";

export async function runBacktestApi({
  codeId,
  market,
  timeframe = "1d",
  start = null,
  end = null,
  lookback = 400,
  initialCash = 1_000_000,
  signal,
}) {
  const res = await fetch(`${API_BASE_URL}/api/backtests/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code_id: codeId,
      market,
      timeframe,
      start,
      end,
      lookback,
      initial_cash: initialCash,
    }),
    signal,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `백테스트 요청 실패 (${res.status})`);
  }
  return res.json();
}
