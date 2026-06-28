import React from "react";
import { css } from "../css.js";

const WEATHER_IMAGE = "/weather-news-card.jpg";

function ToastCloseButton({ onClose, id, light = false }) {
  if (!onClose) return null;
  return (
    <button
      onClick={() => onClose(id)}
      className={light ? "tt-toast-close tt-toast-close-light" : "tt-toast-close"}
      aria-label="닫기"
    >
      ×
    </button>
  );
}

function FieldGrid({ fields, weather = false }) {
  if (!fields || fields.length === 0) return null;
  return (
    <div className={weather ? "tt-weather-metrics" : "tt-toast-fields"}>
      {fields.map((f, i) => (
        <div key={i} className={weather ? "tt-weather-metric" : "tt-toast-field"}>
          <span>{f.label}</span>
          <strong>{f.value}</strong>
        </div>
      ))}
    </div>
  );
}

export function AlertToastCard({ toast, onClose, preview = false }) {
  const t = toast || {};
  const isWeather = t.mode === "weather";

  if (isWeather) {
    return (
      <article
        className={`tt-weather-toast${preview ? " tt-toast-preview" : ""}`}
        style={{ "--tt-alert-color": t.color || "#4f8cff" }}
      >
        <div className="tt-weather-topline">
          <span className="tt-weather-brand">SKY WEATHER NEWS</span>
          <span className="tt-weather-live">LIVE</span>
          <ToastCloseButton onClose={onClose} id={t.id} light />
        </div>

        <div className="tt-weather-main">
          <div className="tt-weather-copy">
            <div className="tt-weather-kicker">{t.kicker || "오늘의 관측 리포트"}</div>
            <h2>{t.headline || t.title}</h2>
            {t.body && <p>{t.body}</p>}
            {t.caption && <div className="tt-weather-caption">{t.caption}</div>}
          </div>
          <div className="tt-weather-image-frame">
            <img src={t.image || WEATHER_IMAGE} alt={t.imageAlt || "귀여운 날씨 뉴스 이미지"} />
          </div>
        </div>

        <FieldGrid fields={t.fields} weather />

        {t.ticker && (
          <div className="tt-weather-ticker">
            <span>속보</span>
            <strong>{t.ticker}</strong>
          </div>
        )}
      </article>
    );
  }

  return (
    <div
      className={`tt-alert-card${preview ? " tt-toast-preview" : ""}`}
      style={{
        borderLeft: "4px solid " + t.color,
      }}
    >
      <div style={css(`display:flex;align-items:flex-start;justify-content:space-between;gap:10px`)}>
        <div style={{ fontWeight: 700, fontSize: "14px", color: t.color }}>{t.title}</div>
        <ToastCloseButton onClose={onClose} id={t.id} />
      </div>
      {t.body && <div style={css(`font-size:12.5px;color:#c2cad4;line-height:1.5;margin-top:5px`)}>{t.body}</div>}
      <FieldGrid fields={t.fields} />
    </div>
  );
}

// 화면 우상단에 쌓이는 인앱 알림 모달(토스트). 각 카드는 설정에 따라
// 자동으로 닫히며, 닫기 버튼으로 즉시 제거할 수 있다.
export default function AlertToasts({ toasts, onClose }) {
  if (!toasts || toasts.length === 0) return null;
  return (
    <div className="tt-toast-stack" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <AlertToastCard key={t.id} toast={t} onClose={onClose} />
      ))}
    </div>
  );
}
