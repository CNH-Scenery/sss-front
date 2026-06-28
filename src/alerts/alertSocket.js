// 백엔드 알림 소켓 클라이언트. 설정된 URL로 연결해 표준 스키마 메시지를
// 받아 onAlert 로 넘긴다. 끊기면 3초 후 자동 재연결.
export function createAlertSocket(url, onAlert, onStatus) {
  let ws = null, ping = null, reco = null, closed = false;
  const status = (s) => { if (onStatus) onStatus(s); };

  function connect() {
    if (closed || !url) return;
    if (typeof window === "undefined" || !("WebSocket" in window)) return;
    status("connecting");
    try { ws = new WebSocket(url); } catch { schedule(); return; }
    ws.binaryType = "arraybuffer";
    ws.onopen = () => {
      status("connected");
      ping = setInterval(() => { try { if (ws.readyState === 1) ws.send("ping"); } catch { /* */ } }, 30000);
    };
    ws.onmessage = (ev) => {
      let txt;
      try { txt = typeof ev.data === "string" ? ev.data : new TextDecoder().decode(ev.data); } catch { return; }
      let msg;
      try { msg = JSON.parse(txt); } catch { return; }
      if (!msg || (msg.type && msg.type !== "alert")) return;
      if (msg.type === "alert" || msg.action) onAlert(msg);
    };
    ws.onerror = () => { try { ws.close(); } catch { /* */ } };
    ws.onclose = () => { clearInterval(ping); status("disconnected"); schedule(); };
  }

  function schedule() {
    if (closed) return;
    clearTimeout(reco);
    reco = setTimeout(connect, 3000);
  }

  connect();

  return {
    close() {
      closed = true;
      clearInterval(ping);
      clearTimeout(reco);
      if (ws) { try { ws.onclose = null; ws.close(); } catch { /* */ } }
    },
  };
}
