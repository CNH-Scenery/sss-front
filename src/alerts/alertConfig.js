// 알림(인앱 모달 + OS 알림) 형식 설정 모델 + 포맷터.
// 백엔드가 소켓으로 보내는 표준 메시지 스키마:
//   { type:"alert", action:"BUY|SELL|HOLD|WARN|INFO",
//     market:"KRW-BTC", price:91383000, reason:"...",
//     severity:"info|warning|critical", ts:1782620205356 }
// action/type 외 필드는 모두 선택사항.

const CONFIG_KEY = "tt_alert_config";

export const ACTION_LABELS = { BUY: "매수 신호", SELL: "매도 신호", HOLD: "관망", WARN: "경고", INFO: "알림" };
export const PLACEHOLDERS = ["action", "actionLabel", "market", "price", "reason", "time", "severity"];

export const DEFAULT_CONFIG = {
  backendUrl: "",                                  // ws(s)://… 비어있으면 백엔드 소켓 비활성
  titleTemplate: "{action} · {market}",
  bodyTemplate: "{reason} · {price}원 · {time}",
  fields: { market: true, price: true, reason: true, time: true },
  colors: { BUY: "#22c55e", SELL: "#ef4444", WARN: "#f59e0b", INFO: "#4f8cff" },
  sound: true,
  autoDismissMs: 6000,                             // 0 = 수동 닫기만
};

export function loadConfig() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(CONFIG_KEY)) || {}; } catch { saved = {}; }
  return {
    ...DEFAULT_CONFIG,
    ...saved,
    fields: { ...DEFAULT_CONFIG.fields, ...(saved.fields || {}) },
    colors: { ...DEFAULT_CONFIG.colors, ...(saved.colors || {}) },
  };
}

export function saveConfig(cfg) {
  try { localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg)); } catch { /* ignore */ }
}

function pad(n) { return String(n).padStart(2, "0"); }
function tsToTime(ts) {
  const d = ts ? new Date(ts) : new Date();
  return pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
}

// 백엔드/내부 페이로드를 표시용으로 정규화.
export function normalizePayload(p) {
  const action = String(p.action || "INFO").toUpperCase();
  const price = typeof p.price === "number" ? p.price : Number(p.price) || 0;
  const time = typeof p.time === "string" && p.time ? p.time : tsToTime(p.ts);
  return {
    action,
    actionLabel: ACTION_LABELS[action] || action,
    market: p.market || "-",
    price,
    priceFmt: price ? Math.round(price).toLocaleString() : "-",
    reason: p.reason || "",
    severity: String(p.severity || "").toLowerCase(),
    time,
  };
}

export function applyTemplate(tpl, dict) {
  return String(tpl || "").replace(/\{(\w+)\}/g, (_, k) => (dict[k] != null ? dict[k] : ""));
}

export function pickColor(cfg, norm) {
  return (
    cfg.colors[norm.action] ||
    cfg.colors[(norm.severity || "").toUpperCase()] ||
    cfg.colors.INFO ||
    "#4f8cff"
  );
}

// 설정 + 정규화된 페이로드 → 모달/알림 표시 데이터.
export function formatAlert(cfg, norm) {
  const dict = {
    action: norm.action,
    actionLabel: norm.actionLabel,
    market: norm.market,
    price: norm.priceFmt,
    reason: norm.reason,
    time: norm.time,
    severity: norm.severity,
  };
  const fields = [];
  if (cfg.fields.market) fields.push({ label: "종목", value: norm.market });
  if (cfg.fields.price) fields.push({ label: "가격", value: norm.priceFmt + "원" });
  if (cfg.fields.reason) fields.push({ label: "사유", value: norm.reason || "-" });
  if (cfg.fields.time) fields.push({ label: "시간", value: norm.time });
  return {
    title: applyTemplate(cfg.titleTemplate, dict),
    body: applyTemplate(cfg.bodyTemplate, dict),
    fields,
    color: pickColor(cfg, norm),
    action: norm.action,
  };
}
