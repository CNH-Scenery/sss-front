export function normalizeUpbitMarket(value) {
  const market = String(value || "").trim().toUpperCase();
  if (!market) return "KRW-BTC";
  if (/^[A-Z0-9]+$/.test(market)) return `KRW-${market}`;
  return market;
}
