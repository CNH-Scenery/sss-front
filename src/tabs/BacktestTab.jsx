import React from "react";
import { css } from "../css.js";

export default function BacktestTab({ v }) {
  const runOnEnter = (event) => {
    if (event.key === "Enter") v.runBacktest();
  };

  return (
              <div>
                <div style={css(`margin-bottom:18px`)}>
                  <div style={css(`font-size:11px;letter-spacing:0.1em;color:#4f8cff;font-weight:700;margin-bottom:6px`)}>STEP 3 · 검증</div>
                  <h1 style={css(`margin:0;font-size:22px;font-weight:700;letter-spacing:-0.02em`)}>백테스트 &amp; 자기일관성</h1>
                  <div style={css(`color:#7d8794;font-size:13px;margin-top:5px`)}>전략을 과거 구간에 적용하고, 설문 시점의 실제 선택과 얼마나 일치하는지 검증합니다.</div>
                </div>

                {v.btNeedStrategy && (
                  <div style={css(`text-align:center;padding:60px 20px;background:#11151c;border:1px dashed #26303d;border-radius:12px`)}>
                    <div style={css(`font-size:15px;font-weight:700;margin-bottom:6px`)}>아직 전략이 없습니다</div>
                    <div style={css(`font-size:13px;color:#7d8794;margin-bottom:18px`)}>설문에 답하고 코드화를 먼저 진행하세요.</div>
                    <button onClick={v.goStrategy} style={css(`background:#4f8cff;color:#06101f;border:none;border-radius:9px;padding:10px 18px;font-weight:700;cursor:pointer`)}>코드화로 이동 →</button>
                  </div>
                )}

                {v.hasStrategy && (
                  <div>
                    <div style={css(`background:#11151c;border:1px solid #1f2630;border-radius:12px;padding:13px 16px;margin-bottom:16px`)}>
                      <div style={css(`display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap`)}>
                        <div style={css(`display:grid;gap:10px;flex:1;min-width:280px`)}>
                          <div style={css(`display:flex;align-items:center;gap:12px;flex-wrap:wrap`)}>
                            <span style={css(`font-size:13px;color:#9aa4b1`)}>적용 전략</span>
                            <span style={css(`font-family:'JetBrains Mono',monospace;font-size:12px;color:#4f8cff;background:rgba(79,140,255,.12);border-radius:5px;padding:3px 9px`)}>{v.btVersionLabel}</span>
                            <span style={css(`font-size:12px;color:#e6edf3;border:1px solid #4f8cff;background:rgba(79,140,255,.12);border-radius:6px;padding:4px 9px`)}>최근 1년 · 일봉</span>
                          </div>
                          <div style={css(`display:flex;align-items:center;gap:8px;flex-wrap:wrap`)}>
                            <span style={css(`font-size:13px;color:#9aa4b1`)}>마켓</span>
                            <input ref={v.backtestMarketRef} value={v.backtestMarketDraft} onChange={v.onBacktestMarket} onKeyDown={runOnEnter} spellCheck={false} style={css(`width:122px;background:#0e131b;border:1px solid #26303d;border-radius:7px;color:#e6edf3;padding:7px 9px;font-family:'JetBrains Mono',monospace;font-size:12px;outline:none;text-transform:uppercase`)} />
                            <span style={css(`display:flex;gap:5px;flex-wrap:wrap`)}>
                              {v.quickBacktestMarkets.map((m) => (
                                <button key={m.market} onClick={m.onClick} style={m.style}>{m.market.replace("KRW-", "")}</button>
                              ))}
                            </span>
                          </div>
                          <div style={css(`display:flex;align-items:center;gap:8px;flex-wrap:wrap`)}>
                            <span style={css(`font-size:13px;color:#9aa4b1`)}>적용 기간</span>
                            <input ref={v.backtestStartRef} type="date" defaultValue={v.backtestStartDate} onChange={v.onBacktestStartDate} onKeyDown={runOnEnter} style={css(`background:#0e131b;border:1px solid #26303d;border-radius:7px;color:#e6edf3;padding:7px 9px;font-family:'JetBrains Mono',monospace;font-size:12px;outline:none;color-scheme:dark`)} />
                            <span style={css(`font-size:12px;color:#5a6472`)}>~</span>
                            <input ref={v.backtestEndRef} type="date" defaultValue={v.backtestEndDate} onChange={v.onBacktestEndDate} onKeyDown={runOnEnter} style={css(`background:#0e131b;border:1px solid #26303d;border-radius:7px;color:#e6edf3;padding:7px 9px;font-family:'JetBrains Mono',monospace;font-size:12px;outline:none;color-scheme:dark`)} />
                          </div>
                        </div>
                        <button onClick={v.runBacktest} disabled={v.backtesting} style={css(v.backtestBtnStyle)}>
                          {v.backtesting && (<span><span style={css(`display:inline-block;width:13px;height:13px;border:2px solid rgba(6,16,31,.35);border-top-color:#06101f;border-radius:50%;animation:tt-spin .7s linear infinite;margin-right:7px;vertical-align:-2px`)}></span>실행 중…</span>)}
                          {v.notBacktesting && (<span>{v.backtestLabel}</span>)}
                        </button>
                      </div>
                      <div style={css(`font-size:12px;color:${v.hasBacktestError ? "#ef4444" : "#7d8794"};margin-top:10px;line-height:1.5`)}>{v.hasBacktestError ? v.backtestError : v.backtestMetaText}</div>
                    </div>

                    {v.showBtIdle && (
                      <div style={css(`text-align:center;padding:54px 20px;color:#5a6472;font-size:13px;background:#11151c;border:1px solid #1f2630;border-radius:12px`)}>백테스트를 실행해 전략의 과거 성과를 확인하세요.</div>
                    )}

                    {v.backtesting && (
                      <div style={css(`text-align:center;padding:54px 20px;color:#9aa4b1;font-size:13px;background:#11151c;border:1px solid #1f2630;border-radius:12px`)}><span style={css(`display:inline-block;width:22px;height:22px;border:3px solid #1f2630;border-top-color:#4f8cff;border-radius:50%;animation:tt-spin .8s linear infinite`)}></span><div style={css(`margin-top:12px`)}>과거 구간을 순회하며 decide() 를 호출하는 중…</div></div>
                    )}

                    {v.hasBacktest && (
                      <div>
                        <div style={css(`display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px`)}>
                          {v.metricCards.map((m, i) => (
                            <div key={i} style={css(`background:#11151c;border:1px solid #1f2630;border-radius:11px;padding:14px`)}>
                              <div style={css(`font-size:11.5px;color:#7d8794;margin-bottom:8px`)}>{m.label}</div>
                              <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '22px', fontWeight: 700, color: m.color }}>{m.value}</div>
                              <div style={css(`font-size:11px;color:#5a6472;margin-top:4px`)}>{m.sub}</div>
                            </div>
                          ))}
                        </div>

                        <div style={css(`background:#11151c;border:1px solid #1f2630;border-radius:12px;padding:16px;margin-bottom:16px`)}>
                          <div style={css(`display:flex;align-items:center;justify-content:space-between;margin-bottom:8px`)}>
                            <div style={css(`font-weight:700;font-size:14px`)}>누적 수익곡선</div>
                            <div style={css(`display:flex;gap:14px;font-size:11.5px`)}>
                              <span style={css(`display:flex;align-items:center;gap:6px;color:#9aa4b1`)}><span style={css(`width:14px;height:3px;background:#4f8cff;border-radius:2px;display:inline-block`)}></span>전략</span>
                              <span style={css(`display:flex;align-items:center;gap:6px;color:#9aa4b1`)}><span style={css(`width:14px;height:3px;background:#5a6472;border-radius:2px;display:inline-block`)}></span>보유(B&amp;H)</span>
                            </div>
                          </div>
                          <div>{v.equityChartEl}</div>
                        </div>

                        <div style={css(`background:#11151c;border:1px solid #1f2630;border-radius:12px;padding:16px;margin-bottom:16px`)}>
                          <div style={css(`display:flex;align-items:center;justify-content:space-between;margin-bottom:8px`)}>
                            <div style={css(`font-weight:700;font-size:14px`)}>매매 시점</div>
                            <div style={css(`display:flex;gap:14px;font-size:11.5px`)}>
                              <span style={css(`color:#22c55e`)}>▲ 매수</span><span style={css(`color:#ef4444`)}>▼ 매도</span>
                            </div>
                          </div>
                          <div>{v.backtestChartEl}</div>
                        </div>

                        <div style={css(`background:#11151c;border:1px solid #1f2630;border-radius:12px;padding:18px`)}>
                          <div style={css(`display:flex;gap:24px;align-items:center;flex-wrap:wrap`)}>
                            <div style={css(`text-align:center;min-width:120px`)}>
                              <div style={css(`font-family:'JetBrains Mono',monospace;font-size:42px;font-weight:700;color:#4f8cff;line-height:1`)}>{v.consistencyPct}%</div>
                              <div style={css(`font-size:11.5px;color:#7d8794;margin-top:6px`)}>자기일관성</div>
                            </div>
                            <div style={css(`flex:1;min-width:260px`)}>
                              <div style={css(`font-size:13px;color:#c2cad4;margin-bottom:10px`)}>생성된 전략을 설문 {v.consistencyTotal}개 시점에 직접 돌려 당신의 실제 선택과 비교했습니다.</div>
                              <div style={css(`height:8px;background:#1a212c;border-radius:5px;overflow:hidden;margin-bottom:13px`)}><div style={css(`height:100%;background:linear-gradient(90deg,#4f8cff,#22c55e);width:${v.consistencyWidth};transition:width .6s`)}></div></div>
                              {v.hasMismatch && (
                                <div>
                                  <div style={css(`font-size:11px;color:#5a6472;margin-bottom:7px`)}>어긋난 지점</div>
                                  <div style={css(`display:flex;flex-wrap:wrap;gap:6px`)}>
                                    {v.mismatchItems.map((mm, i) => (
                                      <span key={i} style={css(`font-size:11.5px;background:#0e131b;border:1px solid #181f29;border-radius:6px;padding:4px 9px;color:#9aa4b1`)}>설문 #{mm.survey} · 나 <span style={{ color: mm.userColor }}>{mm.user}</span> → 전략 <span style={{ color: mm.stratColor }}>{mm.strat}</span></span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {v.noMismatch && (
                                <div style={css(`font-size:12.5px;color:#22c55e`)}>모든 설문 시점에서 전략이 당신의 선택을 재현했습니다.</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
  );
}
