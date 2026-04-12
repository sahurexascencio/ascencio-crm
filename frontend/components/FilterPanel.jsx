"use client";
import { useState, useEffect } from "react";
import { C, T, ALL_STATUSES, STATUS_META, getStatusMeta } from "@/lib/tokens";

const BASE = "http://localhost:8000";
const getToken = () => typeof window !== "undefined" ? localStorage.getItem("ascencio_token") : null;

const DATE_PRESETS = [
  { label: "Today", days: 0 },
  { label: "Yesterday", days: 1, single: true },
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
  { label: "This year", year: true },
];

const SOURCE_OPERATORS = ["is", "is not", "is empty", "is not empty"];
const SOURCES = ["Facebook Ad", "Instagram Ad", "Google Ad", "Referral", "Cold Call", "Website", "Other"];
const CAMPAIGNS = ["Summer 2026", "Spring Aesthetics", "Dental Drive", "General"];
const VALUE_OPERATORS = [
  { label: "Greater than", value: "gt" },
  { label: "Less than", value: "lt" },
  { label: "Equal to", value: "eq" },
  { label: "Between", value: "between" },
];

function DatePresetPicker({ label, value = {}, onChange }) {
  const applyPreset = (preset) => {
    const now = new Date();
    if (preset.year) {
      const jan1 = new Date(now.getFullYear(), 0, 1);
      onChange({ after: jan1.toISOString().split("T")[0], before: now.toISOString().split("T")[0] });
      return;
    }
    if (preset.single) {
      const d = new Date(now);
      d.setDate(d.getDate() - preset.days);
      const ds = d.toISOString().split("T")[0];
      onChange({ after: ds, before: ds });
      return;
    }
    const from = new Date(now);
    from.setDate(from.getDate() - preset.days);
    onChange({ after: from.toISOString().split("T")[0], before: now.toISOString().split("T")[0] });
  };

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ ...T.mono, fontSize: 10, color: C.muted, letterSpacing: "0.07em", marginBottom: 8 }}>{label.toUpperCase()}</div>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 8 }}>
        {DATE_PRESETS.map(p => (
          <button key={p.label} onClick={() => applyPreset(p)}
            style={{ ...T.body, fontSize: 11, padding: "3px 8px", borderRadius: 5, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, cursor: "pointer" }}>
            {p.label}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input type="date" value={value.after || ""} onChange={e => onChange({ ...value, after: e.target.value })}
          style={{ flex: 1, padding: "6px 8px", background: C.subtle, border: `1px solid ${C.border}`, borderRadius: 6, ...T.mono, fontSize: 12, color: C.text, outline: "none" }} />
        <span style={{ ...T.body, fontSize: 12, color: C.muted, alignSelf: "center" }}>to</span>
        <input type="date" value={value.before || ""} onChange={e => onChange({ ...value, before: e.target.value })}
          style={{ flex: 1, padding: "6px 8px", background: C.subtle, border: `1px solid ${C.border}`, borderRadius: 6, ...T.mono, fontSize: 12, color: C.text, outline: "none" }} />
      </div>
    </div>
  );
}

export default function FilterPanel({ filters, onChange, onClose, onReset }) {
  const [users, setUsers] = useState([]);
  const [valueOp, setValueOp] = useState("gt");
  const set = (key, value) => onChange({ ...filters, [key]: value });

  useEffect(() => {
    fetch(`${BASE}/users`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.json()).then(setUsers).catch(() => {});
  }, []);

  return (
    <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 360, background: C.surface, borderLeft: `1px solid ${C.border}`, zIndex: 200, display: "flex", flexDirection: "column", boxShadow: "-8px 0 32px rgba(0,0,0,0.12)" }}>

      {/* Header */}
      <div style={{ padding: "20px 20px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", flexShrink: 0 }}>
        <span style={{ ...T.heading, fontSize: 16, fontWeight: 700, color: C.text }}>Advanced Filters</span>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onReset} style={{ ...T.body, fontSize: 12, color: C.muted, background: "transparent", border: "none", cursor: "pointer" }}>Reset all</button>
          <button onClick={onClose} style={{ ...T.body, fontSize: 14, color: C.muted, background: "transparent", border: "none", cursor: "pointer" }}>✕</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>

        {/* STATUS */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ ...T.mono, fontSize: 10, color: C.muted, letterSpacing: "0.07em", marginBottom: 8 }}>STATUS</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {ALL_STATUSES.map(s => {
              const m = STATUS_META[s];
              const active = filters.status === s;
              return (
                <button key={s} onClick={() => set("status", active ? "" : s)}
                  style={{ ...T.mono, fontSize: 11, padding: "4px 10px", borderRadius: 5, border: `1px solid ${active ? m.color : C.border}`, background: active ? m.bg : "transparent", color: active ? m.color : C.muted, cursor: "pointer" }}>
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* ASSIGNED TO / OWNER */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ ...T.mono, fontSize: 10, color: C.muted, letterSpacing: "0.07em", marginBottom: 8 }}>OWNER / ASSIGNED TO</div>
          <select value={filters.assigned_to || ""} onChange={e => set("assigned_to", e.target.value)}
            style={{ width: "100%", padding: "7px 10px", background: C.subtle, border: `1px solid ${C.border}`, borderRadius: 7, ...T.body, fontSize: 12, color: C.text, outline: "none" }}>
            <option value="">Any team member</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
          </select>
        </div>

        {/* OPPORTUNITY SOURCE with operators */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ ...T.mono, fontSize: 10, color: C.muted, letterSpacing: "0.07em", marginBottom: 8 }}>OPPORTUNITY SOURCE</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            {["is", "is not", "is empty", "is not empty"].map(op => (
              <button key={op} onClick={() => set("source_operator", op)}
                style={{ ...T.mono, fontSize: 10, padding: "3px 8px", borderRadius: 5, border: `1px solid ${filters.source_operator === op ? C.accent : C.border}`, background: filters.source_operator === op ? C.accentDim : "transparent", color: filters.source_operator === op ? C.accent : C.muted, cursor: "pointer" }}>
                {op}
              </button>
            ))}
          </div>
          {(!filters.source_operator || ["is", "is not"].includes(filters.source_operator)) && (
            <select value={filters.opportunity_source || ""} onChange={e => set("opportunity_source", e.target.value)}
              style={{ width: "100%", padding: "7px 10px", background: C.subtle, border: `1px solid ${C.border}`, borderRadius: 7, ...T.body, fontSize: 12, color: C.text, outline: "none" }}>
              <option value="">Any source</option>
              {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
        </div>

        {/* OPPORTUNITY VALUE */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ ...T.mono, fontSize: 10, color: C.muted, letterSpacing: "0.07em", marginBottom: 8 }}>OPPORTUNITY VALUE (£)</div>
          <div style={{ display: "flex", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
            {VALUE_OPERATORS.map(op => (
              <button key={op.value} onClick={() => setValueOp(op.value)}
                style={{ ...T.mono, fontSize: 10, padding: "3px 8px", borderRadius: 5, border: `1px solid ${valueOp === op.value ? C.accent : C.border}`, background: valueOp === op.value ? C.accentDim : "transparent", color: valueOp === op.value ? C.accent : C.muted, cursor: "pointer" }}>
                {op.label}
              </button>
            ))}
          </div>
          {valueOp === "between" ? (
            <div style={{ display: "flex", gap: 8 }}>
              <input type="number" placeholder="Min £" value={filters.value_min || ""} onChange={e => set("value_min", e.target.value)}
                style={{ flex: 1, padding: "7px 10px", background: C.subtle, border: `1px solid ${C.border}`, borderRadius: 7, ...T.mono, fontSize: 12, color: C.text, outline: "none" }} />
              <input type="number" placeholder="Max £" value={filters.value_max || ""} onChange={e => set("value_max", e.target.value)}
                style={{ flex: 1, padding: "7px 10px", background: C.subtle, border: `1px solid ${C.border}`, borderRadius: 7, ...T.mono, fontSize: 12, color: C.text, outline: "none" }} />
            </div>
          ) : (
            <input type="number" placeholder="Enter amount £"
              value={valueOp === "gt" ? filters.value_min || "" : valueOp === "lt" ? filters.value_max || "" : filters.value_min || ""}
              onChange={e => {
                if (valueOp === "gt") set("value_min", e.target.value);
                else if (valueOp === "lt") set("value_max", e.target.value);
                else { set("value_min", e.target.value); set("value_max", e.target.value); }
              }}
              style={{ width: "100%", padding: "7px 10px", background: C.subtle, border: `1px solid ${C.border}`, borderRadius: 7, ...T.mono, fontSize: 12, color: C.text, outline: "none" }} />
          )}
        </div>

        {/* CAMPAIGN TYPE */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ ...T.mono, fontSize: 10, color: C.muted, letterSpacing: "0.07em", marginBottom: 8 }}>CAMPAIGN TYPE</div>
          <select value={filters.campaign_type || ""} onChange={e => set("campaign_type", e.target.value)}
            style={{ width: "100%", padding: "7px 10px", background: C.subtle, border: `1px solid ${C.border}`, borderRadius: 7, ...T.body, fontSize: 12, color: C.text, outline: "none" }}>
            <option value="">Any campaign</option>
            {CAMPAIGNS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* SORT */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ ...T.mono, fontSize: 10, color: C.muted, letterSpacing: "0.07em", marginBottom: 8 }}>SORT BY</div>
          <div style={{ display: "flex", gap: 8 }}>
            <select value={filters.sort_by || "created_at"} onChange={e => set("sort_by", e.target.value)}
              style={{ flex: 1, padding: "7px 10px", background: C.subtle, border: `1px solid ${C.border}`, borderRadius: 7, ...T.body, fontSize: 12, color: C.text, outline: "none" }}>
              <option value="created_at">Date created</option>
              <option value="updated_at">Last updated</option>
              <option value="last_contacted_at">Last contacted</option>
              <option value="opportunity_value">Value</option>
              <option value="business_name">Business name</option>
            </select>
            <select value={filters.sort_dir || "desc"} onChange={e => set("sort_dir", e.target.value)}
              style={{ width: 80, padding: "7px 8px", background: C.subtle, border: `1px solid ${C.border}`, borderRadius: 7, ...T.body, fontSize: 12, color: C.text, outline: "none" }}>
              <option value="desc">↓ Desc</option>
              <option value="asc">↑ Asc</option>
            </select>
          </div>
        </div>

        {/* MISSING DATA */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ ...T.mono, fontSize: 10, color: C.muted, letterSpacing: "0.07em", marginBottom: 8 }}>MISSING DATA</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { key: "no_website", label: "🌐 No website", desc: "Website URL is empty" },
              { key: "never_contacted", label: "📭 Never contacted", desc: "No calls or messages logged" },
            ].map(opt => (
              <label key={opt.key} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                <input type="checkbox" checked={!!filters[opt.key]} onChange={e => set(opt.key, e.target.checked || "")}
                  style={{ width: 14, height: 14, accentColor: C.accent }} />
                <div>
                  <div style={{ ...T.body, fontSize: 12, color: C.text }}>{opt.label}</div>
                  <div style={{ ...T.mono, fontSize: 10, color: C.muted }}>{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div style={{ height: 1, background: C.border, margin: "4px 0 18px" }} />

        {/* DATE FILTERS */}
        <DatePresetPicker label="Created on"
          value={{ after: filters.created_after, before: filters.created_before }}
          onChange={v => onChange({ ...filters, created_after: v.after, created_before: v.before })} />

        <DatePresetPicker label="Last contacted"
          value={{ after: filters.contacted_after, before: filters.contacted_before }}
          onChange={v => onChange({ ...filters, contacted_after: v.after, contacted_before: v.before })} />

        <DatePresetPicker label="Last updated"
          value={{ after: filters.updated_after, before: filters.updated_before }}
          onChange={v => onChange({ ...filters, updated_after: v.after, updated_before: v.before })} />

        <DatePresetPicker label="Opportunity won on"
          value={{ after: filters.won_after, before: filters.won_before }}
          onChange={v => onChange({ ...filters, won_after: v.after, won_before: v.before })} />

        <DatePresetPicker label="Opportunity lost on"
          value={{ after: filters.lost_after, before: filters.lost_before }}
          onChange={v => onChange({ ...filters, lost_after: v.after, lost_before: v.before })} />

      </div>

      <div style={{ padding: "16px 20px", borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
        <button onClick={onClose}
          style={{ width: "100%", padding: "11px", borderRadius: 9, border: "none", background: C.accent, color: "#FFFFFF", ...T.body, fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
          Apply filters
        </button>
      </div>
    </div>
  );
}
