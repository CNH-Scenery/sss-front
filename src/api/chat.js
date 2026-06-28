// 프론트엔드 → 백엔드(sss-back) 챗봇 스트리밍 헬퍼.
// 백엔드가 Claude tool-use 로 업비트 시세를 조회해 답합니다. 키는 백엔드에만 있고,
// 개발 시 Vite 프록시(/api → http://localhost:8000)를 통해 전달됩니다.
//
// 백엔드 SSE 이벤트: start | text(delta) | tool_use(name,input) | tool_result(name,ok) | error | done
//
// 사용 예:
//   await streamChat({
//     messages: [{ role: "user", content: "비트코인 지금 얼마야?" }],
//     onText: (delta) => appendToLastAssistant(delta),
//     onTool: (ev) => showToolActivity(ev),
//   });

export async function streamChat({ messages, onText, onTool, signal }) {
  const res = await fetch("/api/chat/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
    signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail ? JSON.stringify(err.detail) : `챗봇 요청 실패 (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      const line = frame.trim();
      if (!line.startsWith("data:")) continue;
      const ev = JSON.parse(line.slice(5).trim());

      if (ev.event === "text") onText?.(ev.delta);
      else if (ev.event === "tool_use") onTool?.({ phase: "use", name: ev.name, input: ev.input });
      else if (ev.event === "tool_result") onTool?.({ phase: "result", name: ev.name, ok: ev.ok });
      else if (ev.event === "error") throw new Error(ev.message || "챗봇 오류");
    }
  }
}
