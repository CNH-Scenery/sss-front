import React from "react";
import { css } from "../css.js";

export default function Sidebar({ v }) {
  return (
          <div className="tt-sidebar" style={css(`width:222px;flex:0 0 auto;border-right:1px solid #1f2630;background:#0c1118;padding:16px 12px;display:flex;flex-direction:column;gap:3px`)}>
            <div style={css(`font-size:10px;letter-spacing:0.09em;color:#5a6472;font-weight:800;padding:4px 10px 8px`)}>워크플로우</div>
            <div onClick={v.goSurvey} style={css(v.navSurveyStyle)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="3" width="16" height="18" rx="2"></rect><line x1="8" y1="8" x2="16" y2="8"></line><line x1="8" y1="12" x2="16" y2="12"></line><line x1="8" y1="16" x2="12" y2="16"></line></svg>
              <span>설문</span><span style={css(`margin-left:auto;font-family:'JetBrains Mono',monospace;font-size:11px;opacity:.8`)}>{v.doneCount}/10</span>
            </div>
            <div onClick={v.goStrategy} style={css(v.navStrategyStyle)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="8 6 3 12 8 18"></polyline><polyline points="16 6 21 12 16 18"></polyline></svg>
              <span>전략 코드화</span>
            </div>
            <div onClick={v.goBacktest} style={css(v.navBacktestStyle)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="4" y1="20" x2="20" y2="20"></line><polyline points="4 15 9 9 13 13 20 5"></polyline></svg>
              <span>백테스트</span>
            </div>
            <div onClick={v.goMonitor} style={css(v.navMonitorStyle)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.7 21a2 2 0 0 1-3.4 0"></path></svg>
              <span>모니터링</span>
            </div>
            <div style={css(`margin-top:auto;padding:12px 10px;border-top:1px solid #1a212c`)}>
              <div style={css(`font-size:10.5px;color:#5a6472;line-height:1.55`)}>읽기 전용 시세만 사용 · 주문 없음<br />최종 결정은 사용자</div>
            </div>
          </div>
  );
}
