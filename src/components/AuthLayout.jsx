import React from "react";
import { css } from "../css.js";

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div style={css(`min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0a0e14;color:#e6edf3;font-family:'Pretendard',-apple-system,sans-serif;padding:24px`)}>
      <div style={css(`width:100%;max-width:380px`)}>
        <div style={css(`display:flex;align-items:center;gap:10px;justify-content:center;margin-bottom:26px`)}>
          <div style={css(`width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,#4f8cff,#22c55e);display:flex;align-items:center;justify-content:center;font-weight:800;color:#06101f;font-size:19px;font-family:'JetBrains Mono',monospace`)}>T</div>
          <div style={css(`font-weight:700;font-size:19px;letter-spacing:-0.01em`)}>Tacit Trader</div>
        </div>
        <div style={css(`background:#11151c;border:1px solid #1f2630;border-radius:16px;padding:28px 26px`)}>
          <h1 style={css(`margin:0 0 6px;font-size:20px;font-weight:700;letter-spacing:-0.02em`)}>{title}</h1>
          {subtitle && <div style={css(`color:#7d8794;font-size:13px;margin-bottom:22px;line-height:1.5`)}>{subtitle}</div>}
          {children}
        </div>
        {footer && <div style={css(`text-align:center;margin-top:18px;font-size:13px;color:#7d8794`)}>{footer}</div>}
      </div>
    </div>
  );
}

export function Field({ label, type = "text", value, onChange, placeholder, autoComplete, error }) {
  return (
    <label style={css(`display:block;margin-bottom:14px`)}>
      <div style={css(`font-size:12.5px;color:#9aa4b1;font-weight:600;margin-bottom:7px`)}>{label}</div>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        style={css(`width:100%;background:#0d1117;border:1.5px solid ${error ? "#ef4444" : "#1f2630"};border-radius:10px;padding:11px 13px;color:#e6edf3;font-size:14px`)}
      />
      {error && <div style={css(`color:#ef4444;font-size:11.5px;margin-top:6px`)}>{error}</div>}
    </label>
  );
}

export function FormError({ children }) {
  if (!children) return null;
  return (
    <div style={css(`background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.25);color:#f87171;font-size:12.5px;border-radius:9px;padding:9px 12px;margin-bottom:14px`)}>{children}</div>
  );
}

export function PrimaryButton({ children, disabled, ...props }) {
  return (
    <button
      {...props}
      disabled={disabled}
      style={css(`width:100%;border:none;border-radius:10px;padding:12px;font-weight:700;font-size:14px;margin-top:4px;${disabled ? "cursor:not-allowed;background:#1a212c;color:#5a6472;" : "cursor:pointer;background:linear-gradient(90deg,#4f8cff,#22c55e);color:#06101f;"}`)}
    >
      {children}
    </button>
  );
}
