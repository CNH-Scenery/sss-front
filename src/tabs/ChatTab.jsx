import React, { useState, useRef, useEffect } from "react";
import { css } from "../css.js";
import { streamChat } from "../api/chat.js";

const TOOL_LABELS = {
  list_krw_markets: "마켓 목록 조회",
  get_price: "현재가 조회",
  get_orderbook: "호가 조회",
  get_candles: "캔들 조회",
};

const EXAMPLES = [
  "비트코인 지금 얼마야?",
  "BTC와 ETH 현재가 비교해줘",
  "KRW-BTC 최근 7일 일봉 추세 분석해줘",
  "이더리움 호가 보여줘",
];

// 백엔드로 보낼 깨끗한 대화 이력 (빈 메시지/부가 필드 제거).
function toHistory(messages) {
  return messages
    .map((m) => ({ role: m.role, content: (m.content || "").trim() }))
    .filter((m) => m.content);
}

export default function ChatTab() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const updateLast = (fn) =>
    setMessages((m) => {
      const c = [...m];
      c[c.length - 1] = fn(c[c.length - 1]);
      return c;
    });

  const send = async (text) => {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    const history = [...toHistory(messages), { role: "user", content: q }];
    setMessages([
      ...messages,
      { role: "user", content: q },
      { role: "assistant", content: "", tools: [] },
    ]);
    setInput("");
    setBusy(true);
    try {
      await streamChat({
        messages: history,
        onText: (delta) => updateLast((last) => ({ ...last, content: last.content + delta })),
        onTool: (ev) =>
          updateLast((last) => {
            const tools = [...(last.tools || [])];
            if (ev.phase === "use") tools.push({ name: ev.name, done: false });
            else {
              const i = tools.map((t) => t.name).lastIndexOf(ev.name);
              if (i >= 0) tools[i] = { ...tools[i], done: true, ok: ev.ok };
            }
            return { ...last, tools };
          }),
      });
    } catch (e) {
      updateLast((last) => ({
        ...last,
        content: last.content || `⚠️ 오류: ${e.message}`,
        error: true,
      }));
    } finally {
      setBusy(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div style={css("display:flex;flex-direction:column;gap:16px")}>
      <div>
        <div style={css("display:flex;align-items:center;gap:9px")}>
          <h1 style={css("font-size:20px;font-weight:800;margin:0")}>AI 시세 도우미</h1>
          <span style={css("font-size:11px;color:#22c55e;background:rgba(34,197,94,0.12);border:1px solid rgba(34,197,94,0.35);border-radius:999px;padding:2px 9px;font-weight:700")}>읽기 전용</span>
        </div>
        <p style={css("font-size:12.5px;color:#7d8794;margin:6px 0 0;line-height:1.6")}>
          자연어로 업비트 시세·호가·캔들·마켓을 물어보세요. 백엔드가 Claude로 데이터를 조회해 답합니다.
          주문·잔고·입출금은 지원하지 않습니다(분석·조회 전용).
        </p>
      </div>

      <div
        ref={scrollRef}
        style={css("flex:1;min-height:420px;max-height:calc(100vh - 320px);overflow-y:auto;border:1px solid #1f2630;border-radius:12px;background:#0c1118;padding:16px;display:flex;flex-direction:column;gap:14px")}
      >
        {messages.length === 0 && (
          <div style={css("margin:auto;text-align:center;color:#5a6472;display:flex;flex-direction:column;gap:14px;align-items:center")}>
            <div style={css("font-size:13px")}>무엇이든 시세에 대해 물어보세요</div>
            <div style={css("display:flex;flex-wrap:wrap;gap:8px;justify-content:center;max-width:520px")}>
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => send(ex)}
                  style={css("background:#0e131b;border:1px solid #1f2630;color:#9aa4b1;border-radius:999px;padding:7px 13px;font-size:12px;cursor:pointer;font-family:inherit")}
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            style={css(`display:flex;${m.role === "user" ? "justify-content:flex-end" : "justify-content:flex-start"}`)}
          >
            <div
              style={css(
                `max-width:78%;border-radius:12px;padding:11px 14px;font-size:13.5px;line-height:1.65;white-space:pre-wrap;word-break:break-word;` +
                  (m.role === "user"
                    ? "background:#1f6feb;color:#fff;border-bottom-right-radius:4px;"
                    : `background:#10161f;border:1px solid #1f2630;color:${m.error ? "#f0a3a3" : "#e6edf3"};border-bottom-left-radius:4px;`),
              )}
            >
              {m.role === "assistant" && m.tools && m.tools.length > 0 && (
                <div style={css("display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px")}>
                  {m.tools.map((t, ti) => (
                    <span
                      key={ti}
                      style={css(`display:inline-flex;align-items:center;gap:5px;font-size:11px;border-radius:999px;padding:2px 9px;border:1px solid ${t.done ? (t.ok === false ? "rgba(239,68,68,0.4)" : "rgba(34,197,94,0.4)") : "#2a3340"};color:${t.done ? (t.ok === false ? "#ef4444" : "#22c55e") : "#9aa4b1"};background:#0c1118`)}
                    >
                      {t.done ? (t.ok === false ? "⚠" : "✓") : "⏳"} {TOOL_LABELS[t.name] || t.name}
                    </span>
                  ))}
                </div>
              )}
              {m.content || (m.role === "assistant" && busy && i === messages.length - 1 ? "…" : "")}
            </div>
          </div>
        ))}
      </div>

      <div style={css("display:flex;gap:10px;align-items:flex-end")}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="시세에 대해 물어보세요 (Enter 전송 · Shift+Enter 줄바꿈)"
          rows={1}
          style={css("flex:1;resize:none;background:#0c1118;border:1px solid #1f2630;border-radius:10px;padding:12px 14px;color:#e6edf3;font-size:13.5px;font-family:inherit;line-height:1.5;max-height:140px")}
        />
        <button
          onClick={() => send()}
          disabled={busy || !input.trim()}
          style={css(
            "border:none;border-radius:10px;padding:12px 20px;font-weight:700;font-size:13.5px;font-family:inherit;white-space:nowrap;" +
              (busy || !input.trim()
                ? "background:#1a212c;color:#5a6472;cursor:not-allowed;"
                : "background:#1f6feb;color:#fff;cursor:pointer;"),
          )}
        >
          {busy ? "응답 중…" : "전송"}
        </button>
      </div>
    </div>
  );
}
