"use client";
import { useState, useRef, useEffect } from "react";
import { C, T, STATUS_META, ALL_STATUSES } from "@/lib/tokens";

// ── Status Badge (read-only) ───────────────────────────────────────────────────
export function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.new;
  return (
    <span style={{ ...T.mono, fontSize: 11, fontWeight: 500, letterSpacing: "0.04em", padding: "4px 9px", borderRadius: 5, color: m.color, background: m.bg, border: `1px solid ${m.color}35` }}>
      {m.label.toUpperCase()}
    </span>
  );
}

// ── Status Dropdown ───────────────────────────────────────────────────────────
export function StatusSelect({ status, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const m = STATUS_META[status] || STATUS_META.new;

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        style={{ ...T.mono, fontSize: 11, fontWeight: 500, letterSpacing: "0.04em", padding: "4px 9px", borderRadius: 5, color: m.color, background: m.bg, border: `1px solid ${m.color}35`, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
        {m.label.toUpperCase()} <span style={{ fontSize: 8, opacity: 0.7 }}>▾</span>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 5px)", right: 0, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 9, overflow: "hidden", zIndex: 100, minWidth: 138, boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
          {ALL_STATUSES.map(s => {
            const sm = STATUS_META[s];
            const active = s === status;
            return (
              <button key={s} onClick={(e) => { e.stopPropagation(); onChange(s); setOpen(false); }}
                style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "9px 14px", border: "none", background: active ? C.accentDim : "transparent", cursor: "pointer", ...T.body, fontSize: 12, color: active ? C.accent : C.text, textAlign: "left", transition: "background 0.1s" }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = C.subtle; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: sm.color, flexShrink: 0 }} />
                {sm.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Score Bar ─────────────────────────────────────────────────────────────────
export function ScoreBar({ label, value, max = 100, color }) {
  const pct = Math.min((value / max) * 100, 100);
  const col = color || (pct >= 70 ? C.confirmed : pct >= 40 ? C.callback : "#E05555");
  return (
    <div style={{ marginBottom: 13 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ ...T.body, fontSize: 12, color: C.muted }}>{label}</span>
        <span style={{ ...T.mono, fontSize: 12, color: col }}>{value}{max === 5 ? "/5.0" : "/100"}</span>
      </div>
      <div className="score-bar" style={{ height: 4, background: C.border, borderRadius: 2, overflow: "hidden" }}>
        <span style={{ "--w": `${pct}%`, display: "block", height: "100%", width: `${pct}%`, background: col, borderRadius: 2 }} />
      </div>
    </div>
  );
}

// ── Loading Spinner ───────────────────────────────────────────────────────────
export function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 48 }}>
      <div style={{ width: 24, height: 24, border: `2px solid ${C.border}`, borderTop: `2px solid ${C.accent}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Error message ─────────────────────────────────────────────────────────────
export function ErrorMsg({ message }) {
  return (
    <div style={{ ...T.body, fontSize: 13, color: "#C0392B", background: "rgba(192,57,43,0.07)", border: "1px solid rgba(192,57,43,0.18)", borderRadius: 8, padding: "12px 16px" }}>
      {message}
    </div>
  );
}
