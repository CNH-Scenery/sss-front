// 짧은 알림음 (에셋 없이 WebAudio 비프음 두 톤).
let ctx;
export function beep() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = ctx || new AC();
    if (ctx.state === "suspended") ctx.resume();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.connect(g);
    g.connect(ctx.destination);
    const t = ctx.currentTime;
    o.frequency.setValueAtTime(880, t);
    o.frequency.setValueAtTime(660, t + 0.1);
    g.gain.setValueAtTime(0.07, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    o.start(t);
    o.stop(t + 0.3);
  } catch {
    /* ignore */
  }
}
