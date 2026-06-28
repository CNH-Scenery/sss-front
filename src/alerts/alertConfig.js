// 알림(인앱 모달 + OS 알림) 형식 설정 모델 + 포맷터.
// 백엔드가 소켓으로 보내는 표준 메시지 스키마:
//   { type:"alert", action:"BUY|SELL|HOLD|WARN|INFO",
//     market:"KRW-BTC", price:91383000, reason:"...",
//     severity:"info|warning|critical", ts:1782620205356 }
// action/type 외 필드는 모두 선택사항.

const CONFIG_KEY = "tt_alert_config";
const WEATHER_IMAGE = "/weather-news-card.jpg";

export const ACTION_LABELS = { BUY: "매수 신호", SELL: "매도 신호", HOLD: "관망", WARN: "경고", INFO: "알림" };
export const PLACEHOLDERS = ["action", "actionLabel", "market", "price", "reason", "time", "severity"];
export const ALERT_MODES = [
  { key: "expert", label: "전문가", description: "종목, 가격, 사유를 그대로 보여주는 기본 분석형 알림" },
  { key: "weather", label: "날씨 뉴스", description: "회사에서 봐도 자연스러운 기상 속보 스타일" },
  { key: "office", label: "업무 메모", description: "회의 자료와 일정 체크처럼 보이는 사무실 친화형" },
  { key: "cafe", label: "카페 주문", description: "픽업 알림처럼 가볍게 확인하는 장난스러운 스타일" },
];

export const DEFAULT_CONFIG = {
  backendUrl: "",                                  // ws(s)://… 비어있으면 백엔드 소켓 비활성
  alertMode: "weather",
  titleTemplate: "{actionLabel} · {market}",
  bodyTemplate: "{reason} · {price}원 · {time}",
  fields: { market: true, price: true, reason: true, time: true },
  colors: { BUY: "#22c55e", SELL: "#ef4444", WARN: "#f59e0b", INFO: "#4f8cff" },
  sound: true,
  autoDismissMs: 6000,                             // 0 = 수동 닫기만
};

export function loadConfig() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(CONFIG_KEY)) || {}; } catch { saved = {}; }
  const alertMode = ALERT_MODES.some((mode) => mode.key === saved.alertMode) ? saved.alertMode : DEFAULT_CONFIG.alertMode;
  return {
    ...DEFAULT_CONFIG,
    ...saved,
    alertMode,
    fields: { ...DEFAULT_CONFIG.fields, ...(saved.fields || {}) },
    colors: { ...DEFAULT_CONFIG.colors, ...(saved.colors || {}) },
  };
}

export function saveConfig(cfg) {
  try { localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg)); } catch { /* ignore */ }
}

const MONITOR_ALERT_PRESETS = {
  BUY: { severity: "info", fallback: "전략 매수 조건 충족" },
  SELL: { severity: "warning", fallback: "전략 매도 조건 충족" },
  HOLD: { severity: "info", fallback: "전략 관망 조건 유지" },
  WARN: { severity: "warning", fallback: "모니터링 확인 필요" },
  INFO: { severity: "info", fallback: "모니터링 알림" },
};

function pad(n) { return String(n).padStart(2, "0"); }
function tsToTime(ts) {
  const d = ts ? new Date(ts) : new Date();
  return pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
}

export function createMonitorAlertPayload({ action = "INFO", market = "KRW-BTC", price = 0, reason = "", features = null, ts = Date.now() }) {
  const normalizedAction = String(action || "INFO").toUpperCase();
  const preset = MONITOR_ALERT_PRESETS[normalizedAction] || MONITOR_ALERT_PRESETS.INFO;
  const detailParts = [];

  if (reason) detailParts.push(reason);
  if (!reason && features?.rsi14 != null) detailParts.push("RSI " + Number(features.rsi14).toFixed(0));
  if (!reason && features?.vol_ratio != null) detailParts.push("거래량 " + Number(features.vol_ratio).toFixed(1) + "x");

  return {
    type: "alert",
    action: normalizedAction,
    market,
    price,
    reason: detailParts.length ? detailParts.join(" · ") : preset.fallback,
    severity: preset.severity,
    ts,
  };
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

function selectedMode(cfg) {
  return ALERT_MODES.some((mode) => mode.key === cfg.alertMode) ? cfg.alertMode : DEFAULT_CONFIG.alertMode;
}

function marketStation(market) {
  const base = String(market || "").split("-").pop() || "A";
  return base.slice(0, 1).toUpperCase() + " 관측소";
}

function scaledIndex(price) {
  const n = Number(price) || 0;
  if (!n) return "-";
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(".0", "") + "도";
  if (n >= 1000) return (n / 1000).toFixed(1).replace(".0", "") + "도";
  return Math.round(n).toLocaleString() + "도";
}

const STEALTH_COPY = {
  weather: {
    BUY: {
      title: "오늘의 날씨 뉴스 · 맑음 전환",
      headline: "햇살이 열리며 외출하기 좋은 흐름이에요",
      body: "기압이 안정되고 하늘빛이 밝아졌습니다. 산책 타이밍을 가볍게 확인해 보세요.",
      status: "맑음 전환",
      kicker: "맑음 리포트",
    },
    SELL: {
      title: "날씨 속보 · 소나기 주의",
      headline: "작은 소나기 구름이 빠르게 다가오고 있어요",
      body: "상층 기류가 거칠어졌습니다. 잠깐 실내 대기가 좋아 보이는 구간입니다.",
      status: "소나기 주의",
      kicker: "우산 리포트",
    },
    HOLD: {
      title: "생활 날씨 · 구름 많음",
      headline: "구름이 머물지만 큰 변화는 아직 없어요",
      body: "바람은 잔잔하고 관측 흐름도 차분합니다. 다음 관측을 기다려도 괜찮습니다.",
      status: "구름 많음",
      kicker: "구름 리포트",
    },
    WARN: {
      title: "기상 특보 · 확인 필요",
      headline: "예보보다 변동성이 커져 추가 확인이 필요해요",
      body: "갑작스러운 기류 변화가 기록됐습니다. 창가 쪽 상황을 한 번 살펴보세요.",
      status: "특보",
      kicker: "특보 리포트",
    },
    INFO: {
      title: "기상 알림 · 정기 관측",
      headline: "새 관측값이 도착했어요",
      body: "관측소가 최신 흐름을 업데이트했습니다. 필요할 때만 살짝 확인하세요.",
      status: "정기 관측",
      kicker: "정기 리포트",
    },
  },
  office: {
    BUY: { title: "회의 자료 업데이트", body: "새 안건이 올라왔습니다. 가능하면 다음 액션을 검토하세요.", status: "검토 권장" },
    SELL: { title: "일정 변경 안내", body: "마감 쪽 변수가 생겼습니다. 정리 여부를 확인하는 편이 좋습니다.", status: "정리 권장" },
    HOLD: { title: "정기 체크 완료", body: "현재 업무 흐름은 유지 중입니다. 추가 지시 전까지 대기합니다.", status: "대기" },
    WARN: { title: "업무 메모 · 확인 필요", body: "예외 상황이 기록됐습니다. 조용히 세부 내용을 확인하세요.", status: "확인 필요" },
    INFO: { title: "업무 메모 도착", body: "새 메모가 기록됐습니다. 여유 있을 때 확인하세요.", status: "메모" },
  },
  cafe: {
    BUY: { title: "카페 픽업 알림", body: "주문한 메뉴가 막 나왔습니다. 따뜻할 때 챙기면 좋습니다.", status: "픽업 가능" },
    SELL: { title: "카페 주문 안내", body: "재료가 빠르게 줄고 있습니다. 주문 정리를 확인하세요.", status: "품절 임박" },
    HOLD: { title: "카페 대기표", body: "아직 번호가 불리지 않았습니다. 조금 더 기다리면 됩니다.", status: "대기 중" },
    WARN: { title: "카페 직원 호출", body: "주문 확인이 필요합니다. 카운터 상황을 살짝 봐주세요.", status: "확인 필요" },
    INFO: { title: "카페 알림", body: "새 안내가 도착했습니다. 필요할 때 확인하세요.", status: "안내" },
  },
};

function formatStealthAlert(mode, cfg, norm) {
  const copy = (STEALTH_COPY[mode] && (STEALTH_COPY[mode][norm.action] || STEALTH_COPY[mode].INFO)) || STEALTH_COPY.weather.INFO;
  const common = {
    color: pickColor(cfg, norm),
    action: norm.action,
    mode,
  };

  if (mode === "weather") {
    const station = marketStation(norm.market);
    const observation = norm.reason ? norm.reason : "새 관측값 수신";
    return {
      ...common,
      title: copy.title,
      headline: station + " · " + copy.headline,
      body: copy.body,
      kicker: copy.kicker,
      caption: "발표 " + norm.time + " · " + station,
      image: WEATHER_IMAGE,
      imageAlt: "귀여운 날씨 뉴스 이미지",
      notificationImage: WEATHER_IMAGE,
      ticker: "관측 코멘트 · " + observation,
      fields: [
        { label: "지역", value: station },
        { label: "체감 지수", value: scaledIndex(norm.price) },
        { label: "날씨", value: copy.status },
      ],
    };
  }

  if (mode === "office") {
    return {
      ...common,
      title: copy.title,
      body: copy.body + " · " + norm.time,
      fields: [
        { label: "문서함", value: marketStation(norm.market).replace("관측소", "폴더") },
        { label: "상태", value: copy.status },
        { label: "번호", value: scaledIndex(norm.price).replace("도", "") },
      ],
    };
  }

  return {
    ...common,
    title: copy.title,
    body: copy.body + " · " + norm.time,
    fields: [
      { label: "픽업대", value: marketStation(norm.market).replace("관측소", "라인") },
      { label: "상태", value: copy.status },
      { label: "주문", value: scaledIndex(norm.price).replace("도", "") },
    ],
  };
}

// 설정 + 정규화된 페이로드 → 모달/알림 표시 데이터.
export function formatAlert(cfg, norm) {
  const mode = selectedMode(cfg);
  if (mode !== "expert") return formatStealthAlert(mode, cfg, norm);

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
  const fieldCfg = cfg.fields || DEFAULT_CONFIG.fields;
  if (fieldCfg.market) fields.push({ label: "종목", value: norm.market });
  if (fieldCfg.price) fields.push({ label: "가격", value: norm.priceFmt + "원" });
  if (fieldCfg.reason) fields.push({ label: "사유", value: norm.reason || "-" });
  if (fieldCfg.time) fields.push({ label: "시간", value: norm.time });
  return {
    title: applyTemplate(cfg.titleTemplate, dict),
    body: applyTemplate(cfg.bodyTemplate, dict),
    fields,
    color: pickColor(cfg, norm),
    action: norm.action,
    mode,
  };
}
