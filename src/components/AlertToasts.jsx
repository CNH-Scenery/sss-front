import React from "react";
import { css } from "../css.js";

// 화면 우상단에 쌓이는 인앱 알림 모달(토스트). 각 카드는 설정에 따라
// 자동으로 닫히며, 닫기 버튼으로 즉시 제거할 수 있다.
export default function AlertToasts({ toasts, onClose }) {
  if (!toasts || toasts.length === 0) return null;
  return (
    <div style={css(`position:fixed;top:18px;right:18px;z-index:1000;display:flex;flex-direction:column;gap:10px;max-width:340px;font-family:'Pretendard',-apple-system,sans-serif`)}>
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            background: "#11151c",
            border: "1px solid #1f2630",
            borderLeft: "4px solid " + t.color,
            borderRadius: "11px",
            padding: "13px 14px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
            animation: "tt-in .25s ease",
            color: "#e6edf3",
          }}
        >
          <div style={css(`display:flex;align-items:flex-start;justify-content:space-between;gap:10px`)}>
            <div style={{ fontWeight: 700, fontSize: "14px", color: t.color }}>{t.title}</div>
            <button
              onClick={() => onClose(t.id)}
              style={css(`background:transparent;border:none;color:#5a6472;font-size:16px;line-height:1;cursor:pointer;padding:0 2px`)}
              aria-label="닫기"
            >
              ×
            </button>
          </div>
          {t.body && <div style={css(`font-size:12.5px;color:#c2cad4;line-height:1.5;margin-top:5px`)}>{t.body}</div>}
          {t.fields && t.fields.length > 0 && (
            <div style={css(`display:flex;flex-direction:column;gap:4px;margin-top:9px;padding-top:9px;border-top:1px solid #1a212c`)}>
              {t.fields.map((f, i) => (
                <div key={i} style={css(`display:flex;justify-content:space-between;gap:12px;font-size:11.5px`)}>
                  <span style={css(`color:#7d8794`)}>{f.label}</span>
                  <span style={css(`color:#dfe5ec;text-align:right;min-width:0`)}>{f.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
