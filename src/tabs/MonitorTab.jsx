import React from "react";
import { css } from "../css.js";

export default function MonitorTab({ v }) {
  return (
              <div>
                <div style={css(`margin-bottom:18px`)}>
                  <div style={css(`font-size:11px;letter-spacing:0.1em;color:#4f8cff;font-weight:700;margin-bottom:6px`)}>STEP 4 · 운용</div>
                  <h1 style={css(`margin:0;font-size:22px;font-weight:700;letter-spacing:-0.02em`)}>실시간 모니터링 &amp; 알림</h1>
                  <div style={css(`color:#7d8794;font-size:13px;margin-top:5px`)}>업비트 시세와 1분봉으로 전략 신호를 계산하고 간단한 알림을 띄웁니다. 주문은 직접 하세요.</div>
                </div>

                {v.monNeedStrategy && (
                  <div style={css(`text-align:center;padding:60px 20px;background:#11151c;border:1px dashed #26303d;border-radius:12px`)}>
                    <div style={css(`font-size:15px;font-weight:700;margin-bottom:6px`)}>아직 전략이 없습니다</div>
                    <div style={css(`font-size:13px;color:#7d8794;margin-bottom:18px`)}>설문에 답하고 코드화를 먼저 진행하세요.</div>
                    <button onClick={v.goStrategy} style={css(`background:#4f8cff;color:#06101f;border:none;border-radius:9px;padding:10px 18px;font-weight:700;cursor:pointer`)}>코드화로 이동 →</button>
                  </div>
                )}

                {v.hasStrategy && (
                  <div>
                    <div style={css(`background:#11151c;border:1px solid #1f2630;border-radius:12px;padding:14px 16px;margin-bottom:16px`)}>
                      <div style={css(`display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap`)}>
                        <div>
                          <div style={css(`font-weight:700;font-size:14px;margin-bottom:4px`)}>업비트 모니터링 종목</div>
                          <div style={css(`font-size:11.5px;color:#7d8794`)}>현재 연결: {v.monitorMarket}</div>
                        </div>
                        <div style={css(`display:flex;align-items:center;gap:8px;flex-wrap:wrap`)}>
                          <input value={v.monitorMarketDraft} onChange={v.onMonitorMarket} onKeyDown={v.onMonitorMarketKeyDown} placeholder="KRW-BTC" style={css(`background:#0d1117;border:1px solid #1f2630;border-radius:7px;padding:8px 10px;color:#dfe5ec;font-size:12px;width:118px;font-family:'JetBrains Mono',monospace`)} />
                          <button onClick={v.applyMonitorMarket} style={css(`background:#22c55e;color:#06101f;border:none;border-radius:7px;padding:8px 13px;font-size:12px;font-weight:800;cursor:pointer;white-space:nowrap`)}>연결</button>
                          <div style={css(`display:flex;gap:6px;flex-wrap:wrap`)}>
                            {v.quickMonitorMarkets.map((m) => (
                              <button key={m.market} onClick={m.onClick} style={m.style}>{m.market}</button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={css(`display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px`)}>
                      <div style={css(`background:#11151c;border:1px solid #1f2630;border-radius:12px;padding:18px`)}>
                        <div style={css(`display:flex;align-items:center;justify-content:space-between;margin-bottom:14px`)}>
                          <span style={css(`font-weight:700;font-size:15px`)}>{v.monitorMarket}</span>
                          <span style={css(`display:flex;align-items:center;gap:6px;font-size:11px;color:${v.wsConnected ? "#22c55e" : "#f59e0b"}`)}><span style={css(`width:7px;height:7px;border-radius:50%;background:${v.wsConnected ? "#22c55e" : "#f59e0b"};animation:tt-pulse 1.5s infinite`)}></span>{v.wsConnected ? "실시간" : "연결 중"}</span>
                        </div>
                        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '34px', fontWeight: 700, color: v.topPriceColor, lineHeight: 1 }}>{v.livePriceFmt}</div>
                        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '13px', marginTop: '9px', color: v.topPriceColor }}>{v.priceChangePct} <span style={css(`color:#5a6472`)}>· 세션 기준</span></div>
                      </div>
                      <div style={css(`background:#11151c;border:1px solid #1f2630;border-radius:12px;padding:18px;display:flex;flex-direction:column;justify-content:center`)}>
                        <div style={css(`font-size:11.5px;color:#7d8794;margin-bottom:8px`)}>현재 전략 신호 · {v.btVersionLabel}</div>
                        <div style={{ fontSize: '28px', fontWeight: 800, color: v.signalColor, letterSpacing: '-0.01em' }}>{v.signalText}</div>
                        <div style={css(`font-size:12.5px;color:#9aa4b1;margin-top:7px`)}>{v.signalReason}</div>
                        {v.lastCandleTime && <div style={css(`font-size:11px;color:#5a6472;margin-top:8px;font-family:'JetBrains Mono',monospace`)}>1m candle {String(v.lastCandleTime).slice(11,19)}</div>}
                      </div>
                    </div>

                    {v.monitorError && (
                      <div style={css(`margin-bottom:16px;padding:11px 13px;border-radius:9px;background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.24);color:#fca5a5;font-size:12.5px`)}>
                        {v.monitorError}
                      </div>
                    )}

                    <div style={css(`background:#11151c;border:1px solid #1f2630;border-radius:12px;padding:16px;margin-bottom:16px`)}>
                      <div style={css(`display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:10px`)}>
                        <div>
                          <div style={css(`font-weight:700;font-size:14px`)}>실시간 1분봉 차트</div>
                          <div style={css(`font-size:11.5px;color:#7d8794;margin-top:3px`)}>판단 기록 · 현재가 기준 결과</div>
                        </div>
                        <div style={css(`display:flex;align-items:center;gap:8px;flex-wrap:wrap`)}>
                          <button onClick={v.markMonitorBuy} disabled={v.monitorMarkDisabled} style={css(v.monitorBuyBtnStyle)}>매수 기록</button>
                          <button onClick={v.markMonitorSell} disabled={v.monitorMarkDisabled} style={css(v.monitorSellBtnStyle)}>매도 기록</button>
                          <button onClick={v.clearMonitorMarkers} disabled={v.noMonitorMarkers} style={css(v.monitorClearBtnStyle)}>기록 지우기</button>
                        </div>
                      </div>
                      {v.hasMonitorCandles && (
                        <div style={css(`background:#0d1117;border:1px solid #1a212c;border-radius:8px;overflow:hidden`)}>
                          {v.monitorChartEl}
                        </div>
                      )}
                      {!v.hasMonitorCandles && (
                        <div style={css(`text-align:center;padding:42px 12px;color:#5a6472;font-size:12.5px;background:#0d1117;border:1px solid #1a212c;border-radius:8px`)}>
                          업비트 1분봉을 불러오는 중입니다.
                        </div>
                      )}

                      {v.hasMonitorMarkers && (
                        <div style={css(`display:flex;flex-direction:column;gap:8px;margin-top:12px`)}>
                          {v.monitorMarkerItems.map((m) => (
                            <div key={m.id} style={css(`display:grid;grid-template-columns:64px 1fr 84px 70px;gap:10px;align-items:center;padding:9px 10px;background:#0e131b;border:1px solid #181f29;border-radius:8px;font-size:12px`)}>
                              <span style={{ color: m.color, fontWeight: 800 }}>{m.label}</span>
                              <span style={css(`color:#c2cad4;font-family:'JetBrains Mono',monospace;min-width:0`)}>{m.date} · {m.price}원</span>
                              <span style={css(`color:#7d8794;font-family:'JetBrains Mono',monospace;text-align:right`)}>{m.time}</span>
                              <span style={{ color: m.pnlColor, fontFamily: "'JetBrains Mono',monospace", fontWeight: 800, textAlign: "right" }}>{m.pnlText}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {v.noMonitorMarkers && (
                        <div style={css(`margin-top:10px;color:#5a6472;font-size:11.5px`)}>아직 판단 기록이 없습니다.</div>
                      )}
                    </div>

                    <div style={css(`background:#11151c;border:1px solid #1f2630;border-radius:12px;padding:16px`)}>
                      <div style={css(`display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:10px`)}>
                        <div style={css(`font-weight:700;font-size:14px`)}>알림 피드</div>
                        <div style={css(`display:flex;gap:8px;align-items:center`)}>
                          <button onClick={v.enableNotifications} disabled={v.notifDisabled} style={css(v.notifBtnStyle)}>{v.notifLabel}</button>
                          <button onClick={v.testAlert} style={css(`background:#0e131b;border:1px solid #1f2630;color:#9aa4b1;border-radius:7px;padding:7px 12px;font-size:12px;cursor:pointer;white-space:nowrap`)}>테스트 알림</button>
                        </div>
                      </div>
                      {v.hasAlerts && (
                        <div style={css(`display:flex;flex-direction:column;gap:8px;max-height:300px;overflow-y:auto`)}>
                          {v.alertItems.map((a, i) => (
                            <div key={i} style={css(`display:flex;gap:11px;align-items:flex-start;padding:11px 12px;background:#0e131b;border:1px solid #181f29;border-radius:9px;animation:tt-in .3s ease`)}>
                              <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: a.color, marginTop: '4px', flex: '0 0 auto' }}></span>
                              <div style={css(`flex:1;min-width:0`)}><div style={css(`font-size:12.5px;color:#dfe5ec;line-height:1.45`)}>{a.text}</div><div style={css(`font-size:10.5px;color:#5a6472;font-family:'JetBrains Mono',monospace;margin-top:3px`)}>{a.time}</div></div>
                            </div>
                          ))}
                        </div>
                      )}
                      {v.noAlerts && (
                        <div style={css(`text-align:center;padding:34px 12px;color:#5a6472;font-size:12.5px`)}>신호가 발생하면 여기에 알림이 쌓입니다. {v.liveHint}</div>
                      )}
                    </div>

                    <div style={css(`display:flex;align-items:center;gap:10px;margin-top:14px;padding:12px 16px;background:rgba(245,158,11,0.07);border:1px solid rgba(245,158,11,0.2);border-radius:10px`)}>
                      <span style={css(`width:7px;height:7px;border-radius:50%;background:#f59e0b;flex:0 0 auto`)}></span>
                      <span style={css(`font-size:12.5px;color:#c7a96a`)}>이 앱은 분석·알림까지만 합니다. 실제 매수·매도 주문은 회원님이 직접 결정하세요.</span>
                    </div>
                  </div>
                )}
              </div>
  );
}
