import React, { useEffect, useState } from "react";
import { css } from "../css.js";
import { ALERT_MODES, PLACEHOLDERS, normalizePayload, formatAlert } from "../alerts/alertConfig.js";
import { AlertToastCard } from "../components/AlertToasts.jsx";

const card = `background:#11151c;border:1px solid #1f2630;border-radius:12px;padding:18px;margin-bottom:16px`;
const label = `font-size:12.5px;color:#9aa4b1;font-weight:600;margin-bottom:7px`;
const input = `width:100%;background:#0d1117;border:1.5px solid #1f2630;border-radius:9px;padding:10px 12px;color:#e6edf3;font-size:13px;font-family:'Pretendard',sans-serif`;

const STATUS = {
  connected: { c: "#22c55e", t: "연결됨" },
  connecting: { c: "#f59e0b", t: "연결 중…" },
  disconnected: { c: "#ef4444", t: "끊김 (재연결 중)" },
  off: { c: "#5a6472", t: "비활성 (URL 미설정)" },
};

const ACTIONS = [
  { key: "BUY", label: "매수" },
  { key: "SELL", label: "매도" },
  { key: "WARN", label: "경고" },
  { key: "INFO", label: "정보" },
];

const FIELD_OPTS = [
  { key: "market", label: "종목" },
  { key: "price", label: "가격" },
  { key: "reason", label: "사유" },
  { key: "time", label: "시간" },
];

export default function SettingsTab({ v }) {
  const [cfg, setCfg] = useState(v.alertConfig);
  const [saved, setSaved] = useState(false);

  // 저장 등으로 외부 설정이 바뀌면 폼 동기화
  useEffect(() => { setCfg(v.alertConfig); }, [v.alertConfig]);

  const set = (patch) => { setCfg((c) => ({ ...c, ...patch })); setSaved(false); };
  const setField = (k, val) => set({ fields: { ...cfg.fields, [k]: val } });
  const setColor = (k, val) => set({ colors: { ...cfg.colors, [k]: val } });

  const onSave = () => { v.saveAlertConfig(cfg); setSaved(true); };

  const sample = normalizePayload({ action: "BUY", market: "KRW-BTC", price: v.samplePrice || 91383000, reason: "RSI 31 과매도 + 거래량 1.7x" });
  const preview = formatAlert(cfg, sample);
  const st = STATUS[v.backendStatus] || STATUS.off;
  const expertMode = (cfg.alertMode || "expert") === "expert";

  return (
    <div>
      <div style={css(`margin-bottom:18px`)}>
        <div style={css(`font-size:11px;letter-spacing:0.1em;color:#4f8cff;font-weight:700;margin-bottom:6px`)}>설정</div>
        <h1 style={css(`margin:0;font-size:22px;font-weight:700;letter-spacing:-0.02em`)}>알림 형식 설정</h1>
        <div style={css(`color:#7d8794;font-size:13px;margin-top:5px`)}>백엔드 소켓이 보내는 알림을 인앱 모달 + 데스크톱 알림으로 어떻게 표시할지 정합니다.</div>
      </div>

      <div className="tt-settings-grid" style={css(`display:grid;grid-template-columns:1fr 340px;gap:16px;align-items:start`)}>
        <div style={css(`min-width:0`)}>

          <div style={css(card)}>
            <div style={css(`display:flex;align-items:center;justify-content:space-between;margin-bottom:12px`)}>
              <div style={css(`font-weight:700;font-size:14px`)}>백엔드 소켓</div>
              <span style={css(`display:flex;align-items:center;gap:7px;font-size:11.5px;color:#9aa4b1`)}>
                <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: st.c }}></span>{st.t}
              </span>
            </div>
            <div style={css(label)}>소켓 URL</div>
            <input value={cfg.backendUrl} onChange={(e) => set({ backendUrl: e.target.value })} placeholder="wss://your-backend/alerts" style={css(input + `;font-family:'JetBrains Mono',monospace`)} />
            <div style={css(`font-size:11px;color:#5a6472;margin-top:7px;line-height:1.5`)}>표준 스키마: <span style={css(`font-family:'JetBrains Mono',monospace;color:#9aa4b1`)}>{`{ type:"alert", action, market, price, reason, severity, ts }`}</span></div>
          </div>

          <div style={css(card)}>
            <div style={css(`font-weight:700;font-size:14px;margin-bottom:12px`)}>알림 스타일 모드</div>
            <div className="tt-alert-mode-grid" style={css(`display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px`)}>
              {ALERT_MODES.map((mode) => {
                const active = (cfg.alertMode || "expert") === mode.key;
                return (
                  <button
                    key={mode.key}
                    type="button"
                    onClick={() => set({ alertMode: mode.key })}
                    style={css(`text-align:left;border:1px solid ${active ? "#4f8cff" : "#1f2630"};background:${active ? "rgba(79,140,255,0.12)" : "#0e131b"};color:${active ? "#e6edf3" : "#9aa4b1"};border-radius:9px;padding:12px;cursor:pointer;min-height:86px`)}
                  >
                    <div style={css(`font-weight:800;font-size:13.5px;margin-bottom:5px;color:${active ? "#4f8cff" : "#dfe5ec"}`)}>{mode.label}</div>
                    <div style={css(`font-size:11.5px;line-height:1.45;color:${active ? "#b8c7dc" : "#7d8794"}`)}>{mode.description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={css(card)}>
            <div style={css(`font-weight:700;font-size:14px;margin-bottom:12px`)}>제목·본문 템플릿</div>
            {!expertMode && <div style={css(`font-size:11px;color:#7d8794;margin:-4px 0 12px`)}>전문가 모드에서만 직접 템플릿을 사용합니다.</div>}
            <div style={css(label)}>제목</div>
            <input value={cfg.titleTemplate} disabled={!expertMode} onChange={(e) => set({ titleTemplate: e.target.value })} style={css(input + `;font-family:'JetBrains Mono',monospace;margin-bottom:12px;opacity:${expertMode ? "1" : ".55"}`)} />
            <div style={css(label)}>본문</div>
            <input value={cfg.bodyTemplate} disabled={!expertMode} onChange={(e) => set({ bodyTemplate: e.target.value })} style={css(input + `;font-family:'JetBrains Mono',monospace;opacity:${expertMode ? "1" : ".55"}`)} />
            <div style={css(`font-size:11px;color:#5a6472;margin-top:9px`)}>플레이스홀더: {PLACEHOLDERS.map((p) => (
              <span key={p} style={css(`font-family:'JetBrains Mono',monospace;color:#d2a8ff;background:rgba(210,168,255,0.08);border-radius:4px;padding:1px 5px;margin-right:5px;font-size:10.5px`)}>{"{" + p + "}"}</span>
            ))}</div>
          </div>

          <div style={css(card)}>
            <div style={css(`font-weight:700;font-size:14px;margin-bottom:12px`)}>표시 필드</div>
            <div style={css(`display:flex;flex-wrap:wrap;gap:10px`)}>
              {FIELD_OPTS.map((f) => (
                <label key={f.key} style={css(`display:flex;align-items:center;gap:7px;font-size:13px;color:#c2cad4;cursor:pointer;border:1px solid #1f2630;border-radius:8px;padding:8px 12px`)}>
                  <input type="checkbox" checked={!!cfg.fields[f.key]} onChange={(e) => setField(f.key, e.target.checked)} />
                  {f.label}
                </label>
              ))}
            </div>
          </div>

          <div style={css(card)}>
            <div style={css(`font-weight:700;font-size:14px;margin-bottom:12px`)}>색 · 심각도</div>
            <div style={css(`display:flex;flex-wrap:wrap;gap:14px`)}>
              {ACTIONS.map((a) => (
                <label key={a.key} style={css(`display:flex;align-items:center;gap:9px;font-size:13px;color:#c2cad4`)}>
                  <input type="color" value={cfg.colors[a.key]} onChange={(e) => setColor(a.key, e.target.value)} style={css(`width:30px;height:30px;border:none;background:transparent;cursor:pointer;padding:0`)} />
                  {a.label}
                </label>
              ))}
            </div>
          </div>

          <div style={css(card)}>
            <div style={css(`font-weight:700;font-size:14px;margin-bottom:12px`)}>동작</div>
            <label style={css(`display:flex;align-items:center;gap:9px;font-size:13px;color:#c2cad4;cursor:pointer;margin-bottom:14px`)}>
              <input type="checkbox" checked={!!cfg.sound} onChange={(e) => set({ sound: e.target.checked })} />
              알림음 재생
            </label>
            <div style={css(label)}>자동 닫힘</div>
            <select value={cfg.autoDismissMs} onChange={(e) => set({ autoDismissMs: Number(e.target.value) })} style={css(input)}>
              <option value={0}>수동 닫기만</option>
              <option value={3000}>3초</option>
              <option value={6000}>6초</option>
              <option value={10000}>10초</option>
            </select>
          </div>

          <div className="tt-settings-actions" style={css(`display:flex;gap:10px;align-items:center`)}>
            <button onClick={onSave} style={css(`border:none;border-radius:10px;padding:12px 20px;font-weight:700;font-size:14px;cursor:pointer;background:linear-gradient(90deg,#4f8cff,#22c55e);color:#06101f`)}>설정 저장</button>
            <button onClick={v.sendTestAlert} style={css(`background:#0e131b;border:1px solid #1f2630;color:#9aa4b1;border-radius:10px;padding:12px 18px;font-size:13.5px;cursor:pointer`)}>테스트 알림 띄우기</button>
            {saved && <span style={css(`font-size:12.5px;color:#22c55e`)}>저장됨 ✓</span>}
          </div>
        </div>

        <div className="tt-settings-preview" style={css(`position:sticky;top:0`)}>
          <div style={css(label + `;margin-bottom:10px`)}>미리보기</div>
          <AlertToastCard toast={{ id: "preview", ...preview }} preview />
          <div style={css(`font-size:11px;color:#5a6472;margin-top:10px;line-height:1.5`)}>실제 데이터(BUY · KRW-BTC) 기준 예시입니다. 저장 후 백엔드 알림과 테스트 알림에 동일하게 적용됩니다.</div>
        </div>
      </div>
    </div>
  );
}
