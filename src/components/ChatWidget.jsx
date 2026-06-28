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
  "BTC와 ETH 현재가 비교",
  "KRW-BTC 최근 7일 추세",
  "이더리움 호가 보여줘",
];

// 백엔드로 보낼 깨끗한 대화 이력 (빈 메시지/부가 필드 제거).
function toHistory(messages) {
  return messages
    .map((m) => ({ role: m.role, content: (m.content || "").trim() }))
    .filter((m) => m.content);
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

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

  // ── 닫힘: 우측 하단 런처 버튼 ──────────────────────────────
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        aria-label="AI 시세 도우미 열기"
        style={css(
          "position:fixed;bottom:22px;right:22px;z-index:1100;width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;background:#1f6feb;color:#fff;box-shadow:0 8px 24px rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;transition:transform .12s",
        )}
        onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.94)")}
        onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
      </button>
    );
  }

  // ── 열림: 채팅 패널 ────────────────────────────────────────
  return (
    <div
      style={css(
        "position:fixed;bottom:22px;right:22px;z-index:1100;width:380px;height:560px;max-height:calc(100vh - 110px);max-width:calc(100vw - 36px);display:flex;flex-direction:column;background:#0c1118;border:1px solid #1f2630;border-radius:16px;box-shadow:0 16px 48px rgba(0,0,0,0.5);overflow:hidden;font-family:'Pretendard',-apple-system,sans-serif",
      )}
    >
      <div style={css("display:flex;align-items:center;gap:8px;padding:13px 14px;border-bottom:1px solid #1a212c;background:#0e131b")}>
        <span style={css("width:30px;height:30px;border-radius:8px;background:rgba(31,111,235,0.16);display:flex;align-items:center;justify-content:center;color:#5b9dff")}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
        </span>
        <div style={css("display:flex;flex-direction:column;line-height:1.25")}>
          <span style={css("font-size:13.5px;font-weight:800;color:#e6edf3")}>AI 시세 도우미</span>
          <span style={css("font-size:10.5px;color:#22c55e;font-weight:700")}>읽기 전용 · 업비트 시세</span>
        </div>
        <button
          onClick={() => setOpen(false)}
          aria-label="닫기"
          style={css("margin-left:auto;width:28px;height:28px;border-radius:7px;border:none;background:transparent;color:#7d8794;cursor:pointer;display:flex;align-items:center;justify-content:center")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <div ref={scrollRef} style={css("flex:1;overflow-y:auto;padding:14px;display:flex;flex-direction:column;gap:11px")}>
        {messages.length === 0 && (
          <div style={css("margin:auto 0;display:flex;flex-direction:column;gap:11px")}>
            <div style={css("font-size:12.5px;color:#7d8794;text-align:center;line-height:1.6")}>
              자연어로 업비트 시세·호가·캔들을 물어보세요.<br />주문·잔고·입출금은 지원하지 않습니다.
            </div>
            <div style={css("display:flex;flex-wrap:wrap;gap:7px;justify-content:center")}>
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => send(ex)}
                  style={css("background:#10161f;border:1px solid #1f2630;color:#9aa4b1;border-radius:999px;padding:6px 11px;font-size:11.5px;cursor:pointer;font-family:inherit")}
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} style={css(`display:flex;${m.role === "user" ? "justify-content:flex-end" : "justify-content:flex-start"}`)}>
            <div
              style={css(
                "max-width:84%;border-radius:12px;padding:9px 12px;font-size:12.5px;line-height:1.6;white-space:pre-wrap;word-break:break-word;" +
                  (m.role === "user"
                    ? "background:#1f6feb;color:#fff;border-bottom-right-radius:4px;"
                    : `background:#10161f;border:1px solid #1f2630;color:${m.error ? "#f0a3a3" : "#e6edf3"};border-bottom-left-radius:4px;`),
              )}
            >
              {m.role === "assistant" && m.tools && m.tools.length > 0 && (
                <div style={css("display:flex;flex-wrap:wrap;gap:5px;margin-bottom:7px")}>
                  {m.tools.map((t, ti) => (
                    <span
                      key={ti}
                      style={css(`display:inline-flex;align-items:center;gap:4px;font-size:10.5px;border-radius:999px;padding:2px 8px;border:1px solid ${t.done ? (t.ok === false ? "rgba(239,68,68,0.4)" : "rgba(34,197,94,0.4)") : "#2a3340"};color:${t.done ? (t.ok === false ? "#ef4444" : "#22c55e") : "#9aa4b1"};background:#0c1118`)}
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

      <div style={css("display:flex;gap:8px;align-items:flex-end;padding:11px;border-top:1px solid #1a212c")}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="시세에 대해 물어보세요…"
          rows={1}
          style={css("flex:1;resize:none;background:#10161f;border:1px solid #1f2630;border-radius:10px;padding:10px 12px;color:#e6edf3;font-size:12.5px;font-family:inherit;line-height:1.5;max-height:110px")}
        />
        <button
          onClick={() => send()}
          disabled={busy || !input.trim()}
          style={css(
            "border:none;border-radius:10px;width:40px;height:40px;flex:0 0 auto;display:flex;align-items:center;justify-content:center;cursor:pointer;" +
              (busy || !input.trim() ? "background:#1a212c;color:#5a6472;cursor:not-allowed;" : "background:#1f6feb;color:#fff;"),
          )}
          aria-label="전송"
        >
          {busy ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" opacity="0.3"></circle><path d="M21 12a9 9 0 0 0-9-9"></path></svg>
          ) : (
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
          )}
        </button>
      </div>
    </div>
  );
}
