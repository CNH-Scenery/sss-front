import React, { useEffect, useState } from "react";
import { css } from "../css.js";
import { PLACEHOLDERS, normalizePayload, formatAlert } from "../alerts/alertConfig.js";

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

  return (
    <div>
      <div style={css(`margin-bottom:18px`)}>
        <div style={css(`font-size:11px;letter-spacing:0.1em;color:#4f8cff;font-weight:700;margin-bottom:6px`)}>설정</div>
        <h1 style={css(`margin:0;font-size:22px;font-weight:700;letter-spacing:-0.02em`)}>알림 형식 설정</h1>
        <div style={css(`color:#7d8794;font-size:13px;margin-top:5px`)}>백엔드 소켓이 보내는 알림을 인앱 모달 + 데스크톱 알림으로 어떻게 표시할지 정합니다.</div>
      </div>

      <div style={css(`display:grid;grid-template-columns:1fr 340px;gap:16px;align-items:start`)}>
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
            <div style={css(`font-weight:700;font-size:14px;margin-bottom:12px`)}>제목·본문 템플릿</div>
            <div style={css(label)}>제목</div>
            <input value={cfg.titleTemplate} onChange={(e) => set({ titleTemplate: e.target.value })} style={css(input + `;font-family:'JetBrains Mono',monospace;margin-bottom:12px`)} />
            <div style={css(label)}>본문</div>
            <input value={cfg.bodyTemplate} onChange={(e) => set({ bodyTemplate: e.target.value })} style={css(input + `;font-family:'JetBrains Mono',monospace`)} />
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

          <div style={css(`display:flex;gap:10px;align-items:center`)}>
            <button onClick={onSave} style={css(`border:none;border-radius:10px;padding:12px 20px;font-weight:700;font-size:14px;cursor:pointer;background:linear-gradient(90deg,#4f8cff,#22c55e);color:#06101f`)}>설정 저장</button>
            <button onClick={v.sendTestAlert} style={css(`background:#0e131b;border:1px solid #1f2630;color:#9aa4b1;border-radius:10px;padding:12px 18px;font-size:13.5px;cursor:pointer`)}>테스트 알림 띄우기</button>
            {saved && <span style={css(`font-size:12.5px;color:#22c55e`)}>저장됨 ✓</span>}
          </div>
        </div>

        <div style={css(`position:sticky;top:0`)}>
          <div style={css(label + `;margin-bottom:10px`)}>미리보기</div>
          <div style={{ background: "#11151c", border: "1px solid #1f2630", borderLeft: "4px solid " + preview.color, borderRadius: "11px", padding: "13px 14px", boxShadow: "0 10px 30px rgba(0,0,0,0.45)" }}>
            <div style={{ fontWeight: 700, fontSize: "14px", color: preview.color }}>{preview.title}</div>
            {preview.body && <div style={css(`font-size:12.5px;color:#c2cad4;line-height:1.5;margin-top:5px`)}>{preview.body}</div>}
            {preview.fields.length > 0 && (
              <div style={css(`display:flex;flex-direction:column;gap:4px;margin-top:9px;padding-top:9px;border-top:1px solid #1a212c`)}>
                {preview.fields.map((f, i) => (
                  <div key={i} style={css(`display:flex;justify-content:space-between;gap:12px;font-size:11.5px`)}>
                    <span style={css(`color:#7d8794`)}>{f.label}</span>
                    <span style={css(`color:#dfe5ec`)}>{f.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={css(`font-size:11px;color:#5a6472;margin-top:10px;line-height:1.5`)}>실제 데이터(BUY · KRW-BTC) 기준 예시입니다. 저장 후 백엔드 알림과 테스트 알림에 동일하게 적용됩니다.</div>
        </div>
      </div>
    </div>
  );
}
