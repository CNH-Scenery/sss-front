const UPBIT_API_BASE = "https://api.upbit.com/v1";
const UPBIT_PROXY_BASE = "/upbit/v1";
const UPBIT_WS_BASE = "wss://api.upbit.com/websocket/v1";
const LOCAL_DAILY_API = "/api/upbit/daily";
const MAX_DAILY_CANDLE_COUNT = 200;
const MAX_MINUTE_CANDLE_COUNT = 200;
const REQUEST_TIMEOUT_MS = 12000;
const SUPPORTED_MINUTE_UNITS = new Set([1, 3, 5, 10, 15, 30, 60, 240]);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function normalizeUpbitMarket(value) {
  const market = String(value || "").trim().toUpperCase();
  if (!market) return "KRW-BTC";
  if (/^[A-Z0-9]+$/.test(market)) return "KRW-" + market;
  return market;
}

function toUpbitCursor(utcText) {
  const date = new Date(utcText + "Z");
  date.setSeconds(date.getSeconds() - 1);
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function mapDailyCandle(row) {
  return {
    t: row.candle_date_time_kst || row.candle_date_time_utc,
    market: row.market,
    o: row.opening_price,
    h: row.high_price,
    l: row.low_price,
    c: row.trade_price,
    v: row.candle_acc_trade_volume,
    accTradePrice: row.candle_acc_trade_price,
  };
}

function mapMinuteCandle(row) {
  return {
    t: row.candle_date_time_kst || row.candle_date_time_utc,
    market: row.market,
    unit: row.unit,
    o: row.opening_price,
    h: row.high_price,
    l: row.low_price,
    c: row.trade_price,
    v: row.candle_acc_trade_volume,
    accTradePrice: row.candle_acc_trade_price,
  };
}

function upbitApiBase() {
  if (typeof window === "undefined") return UPBIT_API_BASE;
  const host = window.location?.hostname || "";
  return host === "localhost" || host === "127.0.0.1" ? UPBIT_PROXY_BASE : UPBIT_API_BASE;
}

function useLocalDailyApi() {
  if (typeof window === "undefined") return false;
  const host = window.location?.hostname || "";
  return host === "localhost" || host === "127.0.0.1";
}

async function fetchWithTimeout(url) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("업비트 요청 시간이 초과되었습니다.")), REQUEST_TIMEOUT_MS);
  });

  if (typeof AbortController === "function") {
    const controller = new AbortController();
    timeout.catch(() => controller.abort());
    try {
      return await Promise.race([fetch(url, { signal: controller.signal }), timeout]);
    } catch (error) {
      if (error?.name === "AbortError") throw new Error("업비트 요청 시간이 초과되었습니다.");
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  try {
    return await Promise.race([fetch(url), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

async function jsonWithTimeout(response) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("업비트 응답 처리 시간이 초과되었습니다.")), REQUEST_TIMEOUT_MS);
  });

  try {
    return await Promise.race([response.json(), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

function rowsToCandles(rows, targetCount, market) {
  const candles = rows.slice(0, targetCount).reverse().map(mapDailyCandle);
  if (candles.length < 30) {
    throw new Error(`${market} 백테스트에 필요한 일봉 데이터가 부족합니다.`);
  }
  return candles;
}

async function fetchLocalDailyCandles(market, targetCount) {
  const params = new URLSearchParams({ market, days: String(targetCount) });
  const response = await fetchWithTimeout(`${LOCAL_DAILY_API}?${params.toString()}`);
  if (!response.ok) {
    let message = `${market} 일봉 데이터를 가져오지 못했습니다.`;
    try {
      const body = await jsonWithTimeout(response);
      if (body?.error?.message) message = body.error.message;
    } catch (error) {
      // Keep the readable fallback above.
    }
    throw new Error(message);
  }
  return rowsToCandles(await jsonWithTimeout(response), targetCount, market);
}

export async function fetchUpbitDailyCandles(marketValue, days = 365) {
  const market = normalizeUpbitMarket(marketValue);
  const targetCount = Math.max(1, Math.floor(days));
  if (useLocalDailyApi()) return fetchLocalDailyCandles(market, targetCount);

  const rows = [];
  let to = "";

  while (rows.length < targetCount) {
    const count = Math.min(MAX_DAILY_CANDLE_COUNT, targetCount - rows.length);
    const params = new URLSearchParams({ market, count: String(count) });
    if (to) params.set("to", to);

    const response = await fetchWithTimeout(`${upbitApiBase()}/candles/days?${params.toString()}`);
    if (!response.ok) {
      let message = `${market} 일봉 데이터를 가져오지 못했습니다.`;
      try {
        const body = await jsonWithTimeout(response);
        if (body?.error?.message) message = body.error.message;
      } catch (error) {
        // Keep the readable fallback above.
      }
      throw new Error(message);
    }

    const page = await jsonWithTimeout(response);
    if (!Array.isArray(page) || page.length === 0) break;

    rows.push(...page);
    const oldest = page[page.length - 1];
    if (!oldest?.candle_date_time_utc || page.length < count) break;

    to = toUpbitCursor(oldest.candle_date_time_utc);
    await sleep(120);
  }

  return rowsToCandles(rows, targetCount, market);
}

export async function fetchUpbitMinuteCandles(marketValue, unit = 1, count = 120) {
  const market = normalizeUpbitMarket(marketValue);
  const minuteUnit = Number(unit);
  if (!SUPPORTED_MINUTE_UNITS.has(minuteUnit)) {
    throw new Error("업비트가 지원하는 분봉 단위가 아닙니다.");
  }

  const targetCount = Math.max(1, Math.min(MAX_MINUTE_CANDLE_COUNT, Math.floor(Number(count) || 1)));
  const params = new URLSearchParams({ market, count: String(targetCount) });
  const response = await fetchWithTimeout(`${upbitApiBase()}/candles/minutes/${minuteUnit}?${params.toString()}`);

  if (!response.ok) {
    let message = `${market} 분봉 데이터를 가져오지 못했습니다.`;
    try {
      const body = await jsonWithTimeout(response);
      if (body?.error?.message) message = body.error.message;
    } catch (error) {
      // Keep the readable fallback above.
    }
    throw new Error(message);
  }

  const rows = await jsonWithTimeout(response);
  if (!Array.isArray(rows) || rows.length < 20) {
    throw new Error(`${market} 모니터링에 필요한 분봉 데이터가 부족합니다.`);
  }

  return rows.slice(0, targetCount).reverse().map(mapMinuteCandle);
}

export function createUpbitTickerSocket(marketValue, handlers = {}) {
  const market = normalizeUpbitMarket(marketValue);
  let ws = null;
  let ping = null;
  let reco = null;
  let closed = false;

  const status = (value) => {
    if (handlers.onStatus) handlers.onStatus(value);
  };

  const closeSocket = () => {
    clearInterval(ping);
    ping = null;
    if (ws) {
      try {
        ws.onclose = null;
        ws.close();
      } catch (error) {
        // Ignore shutdown races.
      }
      ws = null;
    }
  };

  const scheduleReconnect = () => {
    if (closed) return;
    clearTimeout(reco);
    reco = setTimeout(connect, 3000);
  };

  function connect() {
    if (closed || typeof window === "undefined" || !("WebSocket" in window)) return;
    closeSocket();
    status("connecting");

    try {
      ws = new WebSocket(UPBIT_WS_BASE);
    } catch (error) {
      if (handlers.onError) handlers.onError(error);
      scheduleReconnect();
      return;
    }

    ws.binaryType = "arraybuffer";
    ws.onopen = () => {
      status("connected");
      try {
        ws.send(JSON.stringify([
          { ticket: `tacit-trader-${Date.now()}` },
          { type: "ticker", codes: [market] },
          { format: "DEFAULT" },
        ]));
      } catch (error) {
        if (handlers.onError) handlers.onError(error);
      }
      ping = setInterval(() => {
        try {
          if (ws?.readyState === 1) ws.send("PING");
        } catch (error) {
          // The close handler will reconnect if the socket drops.
        }
      }, 60000);
    };

    ws.onmessage = (event) => {
      let text;
      try {
        text = typeof event.data === "string" ? event.data : new TextDecoder().decode(event.data);
      } catch (error) {
        return;
      }

      let message;
      try {
        message = JSON.parse(text);
      } catch (error) {
        return;
      }

      if (message.status) return;
      const price = typeof message.trade_price === "number" ? message.trade_price : Number(message.trade_price);
      if (!Number.isFinite(price)) return;
      if (handlers.onTicker) handlers.onTicker({ market: message.code || market, price, raw: message });
    };

    ws.onerror = (error) => {
      if (handlers.onError) handlers.onError(error);
      try {
        ws.close();
      } catch (closeError) {
        // Ignore and let reconnect handle the next attempt.
      }
    };

    ws.onclose = () => {
      clearInterval(ping);
      ping = null;
      status("disconnected");
      scheduleReconnect();
    };
  }

  connect();

  return {
    market,
    close() {
      closed = true;
      clearTimeout(reco);
      closeSocket();
    },
  };
}
