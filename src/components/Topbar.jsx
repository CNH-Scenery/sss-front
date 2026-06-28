import React from "react";
import { useNavigate } from "react-router-dom";
import { css } from "../css.js";
import { currentUser, logout } from "../auth.js";

export default function Topbar({ v }) {
  const navigate = useNavigate();
  const user = currentUser();
  const onLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };
  return (
        <div className="tt-topbar" style={css(`display:flex;align-items:center;justify-content:space-between;height:56px;padding:0 20px;border-bottom:1px solid #1f2630;background:#0c1118;flex:0 0 auto`)}>
          <div style={css(`display:flex;align-items:center;gap:10px`)}>
            <div style={css(`width:26px;height:26px;border-radius:7px;background:linear-gradient(135deg,#4f8cff,#22c55e);display:flex;align-items:center;justify-content:center;font-weight:800;color:#06101f;font-size:15px;font-family:'JetBrains Mono',monospace`)}>T</div>
            <div style={css(`font-weight:700;font-size:15px;letter-spacing:-0.01em`)}>Tacit Trader</div>
            <div style={css(`font-size:10.5px;color:#5a6472;border:1px solid #1f2630;border-radius:5px;padding:2px 6px;margin-left:2px`)}>internal</div>
          </div>
          <div className="tt-topbar-status" style={css(`display:flex;align-items:center;gap:9px;font-family:'JetBrains Mono',monospace;font-size:12.5px`)}>
            <span style={css(`width:7px;height:7px;border-radius:50%;background:#22c55e;box-shadow:0 0 7px #22c55e`)}></span>
            <span style={css(`color:#7d8794`)}>업비트 시세 연결됨</span>
            <span style={css(`color:#e6edf3;margin-left:8px`)}>KRW-BTC</span>
            <span style={{ color: v.topPriceColor }}>{v.livePriceFmt}</span>
            <span style={css(`width:1px;height:18px;background:#1f2630;margin:0 4px`)}></span>
            {user && <span style={css(`color:#9aa4b1;font-family:'Pretendard',sans-serif`)}>{user.name}</span>}
            <button onClick={onLogout} style={css(`background:#0e131b;border:1px solid #1f2630;color:#9aa4b1;border-radius:7px;padding:5px 11px;font-size:12px;cursor:pointer;font-family:'Pretendard',sans-serif`)}>로그아웃</button>
          </div>
        </div>
  );
}
