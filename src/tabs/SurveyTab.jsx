import React from "react";
import { css } from "../css.js";

export default function SurveyTab({ v }) {
  return (
              <div>
                <div className="tt-survey-head" style={css(`display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin-bottom:18px`)}>
                  <div>
                    <div style={css(`font-size:11px;letter-spacing:0.1em;color:#4f8cff;font-weight:700;margin-bottom:6px`)}>STEP 1 · 암묵지 수집</div>
                    <h1 style={css(`margin:0;font-size:22px;font-weight:700;letter-spacing:-0.02em`)}>매매 설문</h1>
                    <div style={css(`color:#7d8794;font-size:13px;margin-top:5px`)}>미래를 가린 과거 차트입니다. 이 시점이라면 어떻게 할지 자연어로 답하세요.</div>
                  </div>
                  <div className="tt-survey-progress" style={css(`text-align:right;min-width:170px`)}>
                    <div style={css(`font-family:'JetBrains Mono',monospace;font-size:13px;color:#7d8794`)}><span style={css(`color:#e6edf3;font-size:20px;font-weight:700`)}>{v.doneCount}</span> / 10 응답</div>
                    <div style={css(`height:6px;background:#1a212c;border-radius:4px;margin-top:8px;overflow:hidden;width:170px`)}>
                      <div style={css(`height:100%;background:linear-gradient(90deg,#4f8cff,#22c55e);border-radius:4px;transition:width .4s;width:${v.progressWidth}`)}></div>
                    </div>
                  </div>
                </div>

                <div className="tt-survey-grid" style={css(`display:grid;grid-template-columns:minmax(0,2.75fr) minmax(240px,.62fr);gap:18px;align-items:start`)}>
                  <div className="tt-chart-card" style={css(`background:#11151c;border:1px solid #1f2630;border-radius:12px;padding:18px;min-width:0`)}>
                    <div style={css(`display:flex;align-items:center;justify-content:space-between;margin-bottom:12px`)}>
                      <div style={css(`display:flex;align-items:center;gap:8px`)}>
                        <span style={css(`font-weight:700;font-size:15px`)}>{v.curMarket}</span>
                        <span style={css(`font-size:11px;color:#7d8794;border:1px solid #1f2630;border-radius:5px;padding:2px 7px`)}>{v.curTf}봉</span>
                      </div>
                      <div style={css(`display:flex;align-items:center;gap:6px;font-size:11px;color:#f59e0b;background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.25);border-radius:6px;padding:3px 9px`)}>
                        <span style={css(`width:6px;height:6px;border-radius:50%;background:#f59e0b;display:inline-block`)}></span>이후 구간 가림
                      </div>
                    </div>
                    <div style={css(`display:flex;flex-direction:column;gap:8px;margin-bottom:10px`)}>
                      <div style={css(`display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap`)}>
                        <div style={css(`display:flex;align-items:center;gap:6px;flex-wrap:wrap`)}>
                          {v.chartRangeOptions.map((item) => (
                            <button key={item.value} onClick={item.onClick} style={item.style} title={`${item.label} 구간 보기`}>{item.label}</button>
                          ))}
                        </div>
                        <div style={css(`display:flex;align-items:center;gap:6px;flex-wrap:wrap`)}>
                          {v.chartToolButtons.map((item) => (
                            <button key={item.label} onClick={item.onClick} style={item.style} title={`${item.label} 도구`}>{item.label}</button>
                          ))}
                          <button onClick={v.clearChartDrawings} disabled={v.chartDrawCount===0} style={v.clearDrawStyle} title="드로잉 지우기">지우기 {v.chartDrawCount}</button>
                        </div>
                      </div>
                      <div style={css(`display:flex;align-items:center;gap:6px;flex-wrap:wrap`)}>
                        {v.chartIndicatorButtons.map((item) => (
                          <button key={item.label} onClick={item.onClick} style={item.style} title={`${item.label} 지표 토글`}>{item.label}</button>
                        ))}
                        {v.chartPendingText && <span style={css(`font-size:11px;color:#f0b90b;font-weight:700;margin-left:2px`)}>{v.chartPendingText}</span>}
                      </div>
                    </div>
                    <div style={css(`background:#0d1117;border:1px solid #1a212c;border-radius:8px;overflow:hidden`)}>
                      {v.surveyChartEl}
                    </div>
                    <div style={css(`margin-top:12px;padding-top:12px;border-top:1px solid #1a212c`)}>
                      <div style={css(`display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:7px`)}>
                        <div style={css(`font-weight:700;font-size:13.5px;color:#e6edf3`)}>{v.surveyTitle}</div>
                        <div style={css(`font-size:11px;color:#7d8794`)}>{v.surveyTags.join(' · ')}</div>
                      </div>
                      <div className="tt-survey-meta-grid" style={css(`display:grid;grid-template-columns:78px 1fr;gap:6px 10px;font-size:12.3px;line-height:1.45`)}>
                        <span style={css(`color:#5a6472;font-weight:700`)}>파악 성향</span>
                        <span style={css(`color:#c2cad4`)}>{v.surveyIntent}</span>
                        <span style={css(`color:#5a6472;font-weight:700`)}>선정 사유</span>
                        <span style={css(`color:#9aa4b1`)}>{v.surveyReason}</span>
                      </div>
                    </div>
                    <div style={css(`display:flex;align-items:center;justify-content:space-between;margin-top:12px;padding-top:12px;border-top:1px solid #1a212c`)}>
                      <button onClick={v.goPrev} style={css(`background:#0e131b;border:1px solid #1f2630;color:#9aa4b1;border-radius:7px;padding:6px 13px;font-size:12.5px;cursor:pointer`)}>← 이전</button>
                      <span style={css(`font-family:'JetBrains Mono',monospace;font-size:12px;color:#7d8794`)}>설문 {v.surveyNo} / 10</span>
                      <button onClick={v.goNext} style={css(`background:#0e131b;border:1px solid #1f2630;color:#9aa4b1;border-radius:7px;padding:6px 13px;font-size:12.5px;cursor:pointer`)}>다음 →</button>
                    </div>
                  </div>

                  <div className="tt-indicator-card" style={css(`background:#11151c;border:1px solid #1f2630;border-radius:12px;padding:14px;min-width:0`)}>
                    <div style={css(`font-size:12px;font-weight:700;color:#9aa4b1;letter-spacing:0.02em;margin-bottom:3px`)}>지표 스냅샷</div>
                    <div style={css(`font-size:10.5px;color:#5a6472;margin-bottom:10px`)}>이 시점의 숫자가 응답과 함께 저장됩니다</div>
                    <div style={css(`display:flex;flex-direction:column`)}>
                      {v.featureRows.map((row, i) => (
                        <div className="tt-indicator-row" key={i} style={css(`display:flex;align-items:center;justify-content:space-between;padding:6px 2px;border-bottom:1px solid #161c25;gap:12px`)}>
                          <span style={css(`font-size:12.5px;color:#9aa4b1`)}>{row.label}</span>
                          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '13px', fontWeight: 600, color: row.color }}>{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={css(`background:#11151c;border:1px solid #1f2630;border-radius:12px;padding:18px;margin-top:16px`)}>
                  <div style={css(`font-weight:700;font-size:15px;margin-bottom:14px`)}>이 시점, 당신이라면?</div>
                  <div className="tt-choice-row" style={css(`display:flex;gap:10px;margin-bottom:14px`)}>
                    <button onClick={v.setBuy} style={css(v.buyStyle)}><span style={css(`font-size:15px`)}>매수</span><span style={css(`font-size:11px;opacity:.7;font-weight:600`)}>BUY</span></button>
                    <button onClick={v.setSell} style={css(v.sellStyle)}><span style={css(`font-size:15px`)}>매도</span><span style={css(`font-size:11px;opacity:.7;font-weight:600`)}>SELL</span></button>
                    <button onClick={v.setHold} style={css(v.holdStyle)}><span style={css(`font-size:15px`)}>관망</span><span style={css(`font-size:11px;opacity:.7;font-weight:600`)}>HOLD</span></button>
                  </div>
                  <textarea value={v.draftReason} onChange={v.onReason} placeholder="왜 그렇게 판단했나요? 예) 거래량이 터지면서 RSI가 30 아래로 빠져서 반등 노리고 분할 매수…" style={css(`width:100%;min-height:84px;resize:vertical;background:#0d1117;border:1.5px solid #1f2630;border-radius:10px;padding:12px 14px;color:#e6edf3;font-size:13.5px;line-height:1.5`)}></textarea>
                  <div style={css(`display:flex;align-items:center;justify-content:space-between;margin-top:12px`)}>
                    <span style={css(`font-size:11.5px;color:#5a6472`)}>자연어로 자세히 쓸수록 코드 정확도가 올라갑니다</span>
                    <button onClick={v.submitResponse} style={css(v.submitStyle)}>응답 저장 →</button>
                  </div>
                </div>

                {v.allDone && (
                  <div style={css(`display:flex;align-items:center;justify-content:space-between;gap:16px;background:linear-gradient(90deg,rgba(79,140,255,0.12),rgba(34,197,94,0.1));border:1px solid rgba(79,140,255,0.3);border-radius:12px;padding:16px 18px;margin-top:16px`)}>
                    <div><div style={css(`font-weight:700;font-size:15px`)}>설문 10개 완료</div><div style={css(`font-size:12.5px;color:#9aa4b1;margin-top:2px`)}>이제 누적된 응답을 파이썬 전략으로 코드화할 수 있어요.</div></div>
                    <button onClick={v.goStrategy} style={css(`background:#4f8cff;color:#06101f;border:none;border-radius:9px;padding:11px 18px;font-weight:700;font-size:13.5px;cursor:pointer;white-space:nowrap`)}>코드화하러 가기 →</button>
                  </div>
                )}
              </div>
  );
}
