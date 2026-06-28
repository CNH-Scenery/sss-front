import React from "react";
import { css } from "../css.js";

export default function Topbar({ v }) {
  return (
        <div style={css(`display:flex;align-items:center;justify-content:space-between;height:56px;padding:0 20px;border-bottom:1px solid #1f2630;background:#0c1118;flex:0 0 auto`)}>
          <div style={css(`display:flex;align-items:center;gap:10px`)}>
            <div style={css(`width:26px;height:26px;border-radius:7px;background:linear-gradient(135deg,#4f8cff,#22c55e);display:flex;align-items:center;justify-content:center;font-weight:800;color:#06101f;font-size:15px;font-family:'JetBrains Mono',monospace`)}>T</div>
            <div style={css(`font-weight:700;font-size:15px;letter-spacing:-0.01em`)}>Tacit Trader</div>
            <div style={css(`font-size:10.5px;color:#5a6472;border:1px solid #1f2630;border-radius:5px;padding:2px 6px;margin-left:2px`)}>internal</div>
          </div>
          <div style={css(`display:flex;align-items:center;gap:9px;font-family:'JetBrains Mono',monospace;font-size:12.5px`)}>
            <span style={css(`width:7px;height:7px;border-radius:50%;background:#22c55e;box-shadow:0 0 7px #22c55e`)}></span>
            <span style={css(`color:#7d8794`)}>업비트 시세 연결됨</span>
            <span style={css(`color:#e6edf3;margin-left:8px`)}>KRW-BTC</span>
            <span style={{ color: v.topPriceColor }}>{v.livePriceFmt}</span>
          </div>
        </div>
  );
}
