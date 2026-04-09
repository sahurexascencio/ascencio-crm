"use client";
import { useState, useRef, useEffect } from "react";
import { C, T, STATUS_META, ALL_STATUSES } from "@/lib/tokens";

// ── Status Badge (read-only) ──────────────────────────────────────────────────
export function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.new;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 500,
      padding: "4px 11px", borderRadius: 20,
      color: m.color, background: m.bg,
      border: `1px solid ${m.color}22`,
      whiteSpace: "nowrap",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: m.color, flexShrink: 0 }} />
      {m.label}
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
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        style={{
          display: "inline-flex", alignItems: "center", gap: 5,
          fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 500,
          padding: "4px 11px", borderRadius: 20,
          color: m.color, background: m.bg,
          border: `1px solid ${m.color}22`,
          cursor: "pointer", whiteSpace: "nowrap",
        }}
      >
        <span style={{ width: 5, height: 5, borderRadius: "50%", background: m.color, flexShrink: 0 }} />
        {m.label}
        <span style={{ fontSize: 9, opacity: 0.6, marginLeft: 1 }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", right: 0,
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: 11, overflow: "hidden", zIndex: 100, minWidth: 150,
          boxShadow: "var(--shadow-sm)",
        }}>
          {ALL_STATUSES.map(s => {
            const sm = STATUS_META[s];
            const active = s === status;
            return (
              <button key={s}
                onClick={(e) => { e.stopPropagation(); onChange(s); setOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", gap: 9,
                  width: "100%", padding: "9px 14px", border: "none",
                  background: active ? "var(--gold-dim)" : "transparent",
                  cursor: "pointer",
                  fontFamily: "'DM Sans', sans-serif", fontSize: 12,
                  color: active ? "var(--gold)" : "var(--text-primary)",
                  textAlign: "left", transition: "background 0.1s",
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = "var(--bg-secondary)"; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
              >
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
  const col = color || (pct >= 70 ? C.confirmed : pct >= 40 ? C.callback : "#EF4444");
  return (
    <div style={{ marginBottom: 13 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "var(--text-secondary)" }}>{label}</span>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: col }}>{value}{max === 5 ? "/5.0" : "/100"}</span>
      </div>
      <div className="score-bar" style={{ height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
        <span style={{ "--w": `${pct}%`, display: "block", height: "100%", width: `${pct}%`, background: col, borderRadius: 2 }} />
      </div>
    </div>
  );
}

// ── Loading Spinner ───────────────────────────────────────────────────────────
export function Spinner() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 48 }}>
      <div style={{
        width: 24, height: 24, borderRadius: "50%",
        border: "2px solid var(--border)",
        borderTop: "2px solid var(--gold)",
        animation: "spin 0.8s linear infinite",
      }} />
    </div>
  );
}

// ── Error message ─────────────────────────────────────────────────────────────
export function ErrorMsg({ message }) {
  return (
    <div style={{
      fontFamily: "'DM Sans', sans-serif", fontSize: 13,
      color: "#EF4444", background: "rgba(239,68,68,0.07)",
      border: "1px solid rgba(239,68,68,0.18)",
      borderRadius: 9, padding: "12px 16px",
    }}>
      {message}
    </div>
  );
}
