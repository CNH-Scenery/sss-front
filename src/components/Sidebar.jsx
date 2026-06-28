import React from "react";
import { css } from "../css.js";

export default function Sidebar({ v }) {
  return (
          <div className="tt-sidebar" style={css(`width:222px;flex:0 0 auto;border-right:1px solid #1f2630;background:#0c1118;padding:16px 12px;display:flex;flex-direction:column;gap:3px`)}>
            <div style={css(`font-size:10px;letter-spacing:0.09em;color:#5a6472;font-weight:800;padding:4px 10px 8px`)}>워크플로우</div>
            <div onClick={v.goSurvey} style={css(v.navSurveyStyle)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="3" width="16" height="18" rx="2"></rect><line x1="8" y1="8" x2="16" y2="8"></line><line x1="8" y1="12" x2="16" y2="12"></line><line x1="8" y1="16" x2="12" y2="16"></line></svg>
              <span>설문</span><span style={css(`margin-left:auto;font-family:'JetBrains Mono',monospace;font-size:11px;opacity:.8`)}>{v.surveyCountBadge}</span>
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
            <div style={css(`height:1px;background:#1a212c;margin:8px 6px`)}></div>
            <div style={css(`font-size:10px;letter-spacing:0.09em;color:#5a6472;font-weight:800;padding:4px 10px 8px`)}>AI 어시스턴트</div>
            <div onClick={v.goChat} style={css(v.navChatStyle)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
              <span>AI 시세 챗봇</span>
            </div>
            <div style={css(`height:1px;background:#1a212c;margin:8px 6px`)}></div>
            <div style={css(`font-size:10px;letter-spacing:0.09em;color:#5a6472;font-weight:800;padding:4px 10px 8px`)}>설정</div>
            <div onClick={v.goSettings} style={css(v.navSettingsStyle)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
              <span>알림 설정</span>
            </div>
            <div style={css(`margin-top:auto;padding:12px 10px;border-top:1px solid #1a212c`)}>
              <div style={css(`font-size:10.5px;color:#5a6472;line-height:1.55`)}>읽기 전용 시세만 사용 · 주문 없음<br />최종 결정은 사용자</div>
            </div>
          </div>
  );
}
