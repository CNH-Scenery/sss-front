import React from "react";
import { css } from "../css.js";

export default function StrategyTab({ v }) {
  return (
              <div>
                <div style={css(`margin-bottom:18px`)}>
                  <div style={css(`font-size:11px;letter-spacing:0.1em;color:#4f8cff;font-weight:700;margin-bottom:6px`)}>STEP 2 · 코드화</div>
                  <h1 style={css(`margin:0;font-size:22px;font-weight:700;letter-spacing:-0.02em`)}>전략 코드화</h1>
                  <div style={css(`color:#7d8794;font-size:13px;margin-top:5px`)}>기본 5개 이상 응답한 자연어 판단 + 지표 스냅샷에서 LLM이 임계값을 역설계해 <span style={css(`color:#d2a8ff;font-family:'JetBrains Mono',monospace`)}>decide()</span> 함수를 만듭니다.</div>
                </div>

                <div style={css(`display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start`)}>
                  <div style={css(`background:#11151c;border:1px solid #1f2630;border-radius:12px;padding:16px;min-width:0`)}>
                    <div style={css(`display:flex;align-items:center;justify-content:space-between;margin-bottom:12px`)}>
                      <div style={css(`font-weight:700;font-size:14px`)}>누적 컨텍스트</div>
                      <span style={css(`font-size:11px;color:#7d8794;font-family:'JetBrains Mono',monospace`)}>{v.doneCount}건</span>
                    </div>
                    {v.hasResponses && (
                      <div style={css(`display:flex;flex-direction:column;gap:8px;max-height:440px;overflow-y:auto`)}>
                        {v.contextItems.map((c, i) => (
                          <div key={i} style={css(`display:flex;gap:10px;padding:10px;background:#0e131b;border:1px solid #181f29;border-radius:9px`)}>
                            <span style={css(`font-family:'JetBrains Mono',monospace;font-size:10.5px;color:#5a6472;padding-top:3px;min-width:22px`)}>{c.survey}</span>
                            <div style={css(`flex:1;min-width:0`)}>
                              <span style={{ display: 'inline-block', fontSize: '10px', fontWeight: 700, color: c.color, border: '1px solid ' + c.color, borderRadius: '5px', padding: '1px 6px', marginBottom: '5px' }}>{c.action}</span>
                              <div style={css(`font-size:12.5px;color:#c2cad4;line-height:1.45`)}>{c.reason}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {v.noResponses && (
                      <div style={css(`text-align:center;padding:44px 12px;color:#5a6472;font-size:13px;line-height:1.6`)}>아직 응답이 없습니다.<br />설문에 먼저 답해주세요.</div>
                    )}
                  </div>

                  <div style={css(`display:flex;flex-direction:column;gap:16px;min-width:0`)}>
                    <div style={css(`background:#11151c;border:1px solid #1f2630;border-radius:12px;padding:16px`)}>
                      <div style={css(`font-weight:700;font-size:14px;margin-bottom:14px`)}>전략 생성</div>
                      <button onClick={v.runCodify} disabled={!v.canCodify || v.codifying} style={css(v.codifyStyle)}>
                        {v.codifying && (<span><span style={css(`display:inline-block;width:14px;height:14px;border:2px solid rgba(6,16,31,.35);border-top-color:#06101f;border-radius:50%;animation:tt-spin .7s linear infinite;margin-right:8px;vertical-align:-2px`)}></span>LLM 분석 중…</span>)}
                        {v.notCodifying && (<span>{v.codifyLabel}</span>)}
                      </button>
                      <div style={css(`font-size:12px;color:#7d8794;line-height:1.45;margin-top:10px`)}>{v.codifyHint}</div>
                    </div>

                    {v.hasStrategy && (
                      <div style={css(`background:#0d1117;border:1px solid #1f2630;border-radius:12px;overflow:hidden`)}>
                        <div style={css(`display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#11151c;border-bottom:1px solid #1f2630`)}>
                          <div style={css(`display:flex;align-items:center;gap:8px`)}>
                            <span style={css(`display:flex;gap:5px`)}><span style={css(`width:10px;height:10px;border-radius:50%;background:#ef4444`)}></span><span style={css(`width:10px;height:10px;border-radius:50%;background:#f59e0b`)}></span><span style={css(`width:10px;height:10px;border-radius:50%;background:#22c55e`)}></span></span>
                            <span style={css(`font-family:'JetBrains Mono',monospace;font-size:12px;color:#9aa4b1;margin-left:6px`)}>strategy.py</span>
                          </div>
                          <span style={css(`font-family:'JetBrains Mono',monospace;font-size:11px;color:#4f8cff;background:rgba(79,140,255,.12);border-radius:5px;padding:2px 8px`)}>{v.versionLabel}</span>
                        </div>
                        <div style={css(`padding:14px 16px;max-height:360px;overflow:auto`)}>{v.codeEl}</div>
                      </div>
                    )}
                  </div>
                </div>

                {v.hasStrategy && (
                  <div style={css(`background:#11151c;border:1px solid #1f2630;border-radius:12px;padding:16px;margin-top:16px`)}>
                    <div style={css(`font-weight:700;font-size:14px;margin-bottom:4px`)}>전략 정제</div>
                    <div style={css(`font-size:12px;color:#7d8794;margin-bottom:12px`)}>결과가 감각과 다르거나 운용 중 생각이 바뀌면, 수정 멘트를 더해 재코드화하세요. 컨텍스트에 누적됩니다.</div>
                    <div style={css(`display:flex;gap:10px;align-items:flex-end`)}>
                      <textarea value={v.correctionDraft} onChange={v.onCorrection} placeholder="예) 손절을 더 빠르게 잡아줘 · 거래량 조건을 더 엄격하게 · 익절은 길게 버텨줘" style={css(`flex:1;min-height:48px;resize:vertical;background:#0d1117;border:1.5px solid #1f2630;border-radius:10px;padding:11px 13px;color:#e6edf3;font-size:13px;line-height:1.5`)}></textarea>
                      <button onClick={v.runRefine} style={css(v.refineStyle)}>재코드화 ↻</button>
                    </div>
                    {v.hasVersions && (
                      <div style={css(`margin-top:14px;border-top:1px solid #1a212c;padding-top:12px`)}>
                        <div style={css(`font-size:11px;color:#5a6472;font-weight:700;margin-bottom:9px`)}>버전 이력</div>
                        <div style={css(`display:flex;flex-direction:column;gap:7px`)}>
                          {v.versionItems.map((ver, i) => (
                            <div key={i} style={css(`display:flex;align-items:center;gap:12px;font-size:12.5px`)}>
                              <span style={css(`font-family:'JetBrains Mono',monospace;color:#4f8cff;font-weight:700;min-width:30px`)}>v{ver.version}</span>
                              <span style={css(`color:#c2cad4;flex:1;min-width:0`)}>{ver.label}</span>
                              <span style={css(`color:#5a6472;font-family:'JetBrains Mono',monospace;font-size:11px`)}>{ver.time}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
  );
}
