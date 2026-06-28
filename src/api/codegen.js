// 프론트엔드 → 백엔드(sss-back) 매매코드 생성 API 헬퍼.
// 브라우저는 Anthropic을 직접 호출하지 않습니다. API 키는 백엔드(:8000)에만 있고,
// 개발 시 Vite 프록시(/api → http://localhost:8000)를 통해 전달됩니다.
//
// 백엔드 SSE 이벤트 종류: start | attempt_start | generated | verified | retry | error | done
//
// 사용 예:
//   const result = await generateTradingCode({
//     prompt: "설문 응답 + 지표 스냅샷...",
//     maxIterations: 4,
//     onEvent: (ev) => {
//       if (ev.event === "attempt_start") setStatus(`시도 ${ev.attempt}/${ev.limit}`);
//       if (ev.event === "generated") setCode(ev.code);
//     },
//   });
//   // result 는 마지막 done 이벤트: { code, passed, iterations, model_name, report, code_id }

import { API_BASE_URL } from "./base.js";

export async function generateTradingCode({
  prompt,
  maxIterations,
  onEvent,
  signal,
}) {
  const res = await fetch(`${API_BASE_URL}/api/trading-code/generate/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, max_iterations: maxIterations ?? null }),
    signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `코드 생성 요청 실패 (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let done = null;

  while (true) {
    const { done: streamDone, value } = await reader.read();
    if (streamDone) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE 프레임은 빈 줄("\n\n")로 구분됩니다.
    const frames = buffer.split("\n\n");
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      const line = frame.trim();
      if (!line.startsWith("data:")) continue;
      const ev = JSON.parse(line.slice(5).trim());

      onEvent?.(ev);
      if (ev.event === "error") throw new Error(ev.message || "코드 생성 오류");
      if (ev.event === "done") done = ev;
    }
  }

  return done;
}

// 비스트리밍 버전 — 최종 결과만 필요할 때.
export async function generateTradingCodeOnce({ prompt, maxIterations, signal }) {
  const res = await fetch(`${API_BASE_URL}/api/trading-code/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, max_iterations: maxIterations ?? null }),
    signal,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `코드 생성 요청 실패 (${res.status})`);
  }
  return res.json();
}
