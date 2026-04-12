"use client";
import { useState } from "react";
import { C, T } from "@/lib/tokens";

const BASE = "http://localhost:8000";
const getToken = () => typeof window !== "undefined" ? localStorage.getItem("ascencio_token") : null;

const QUICK_DATES = [
  { label: "Tomorrow", days: 1 },
  { label: "In 3 days", days: 3 },
  { label: "Next week", days: 7 },
  { label: "In 2 weeks", days: 14 },
];

export default function TaskModal({ lead, onClose, onSaved }) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("09:00");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const applyQuickDate = (days) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setDueDate(d.toISOString().split("T")[0]);
  };

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const dueDateTime = dueDate ? `${dueDate}T${dueTime}:00` : null;
      await fetch(`${BASE}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ lead_id: lead.id, title, notes, due_date: dueDateTime }),
      });
      setSaved(true);
      setTimeout(() => { onSaved?.(); onClose(); }, 1200);
    } catch (e) {
      alert(`Failed: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "28px 32px", width: 460, boxShadow: "0 16px 48px rgba(0,0,0,0.15)" }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <div style={{ ...T.heading, fontSize: 17, fontWeight: 700, color: C.text }}>Schedule follow-up</div>
            <div style={{ ...T.mono, fontSize: 11, color: C.muted, marginTop: 2 }}>{lead.business_name} · {lead.city}</div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: C.muted, cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          <div>
            <label style={{ ...T.mono, fontSize: 10, color: C.muted, letterSpacing: "0.07em", display: "block", marginBottom: 6 }}>TASK TITLE</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Call back Dr. Walsh to discuss SEO proposal"
              style={{ width: "100%", padding: "9px 12px", background: C.subtle, border: `1px solid ${C.border}`, borderRadius: 8, ...T.body, fontSize: 13, color: C.text, outline: "none" }} />
          </div>

          <div>
            <label style={{ ...T.mono, fontSize: 10, color: C.muted, letterSpacing: "0.07em", display: "block", marginBottom: 6 }}>QUICK DATE</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {QUICK_DATES.map(q => (
                <button key={q.label} onClick={() => applyQuickDate(q.days)}
                  style={{ ...T.body, fontSize: 12, padding: "5px 12px", borderRadius: 7, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, cursor: "pointer" }}>
                  {q.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ flex: 2 }}>
              <label style={{ ...T.mono, fontSize: 10, color: C.muted, letterSpacing: "0.07em", display: "block", marginBottom: 6 }}>DATE</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", background: C.subtle, border: `1px solid ${C.border}`, borderRadius: 8, ...T.body, fontSize: 13, color: C.text, outline: "none" }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ ...T.mono, fontSize: 10, color: C.muted, letterSpacing: "0.07em", display: "block", marginBottom: 6 }}>TIME</label>
              <input type="time" value={dueTime} onChange={e => setDueTime(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", background: C.subtle, border: `1px solid ${C.border}`, borderRadius: 8, ...T.body, fontSize: 13, color: C.text, outline: "none" }} />
            </div>
          </div>

          <div>
            <label style={{ ...T.mono, fontSize: 10, color: C.muted, letterSpacing: "0.07em", display: "block", marginBottom: 6 }}>NOTES</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Any context for this follow-up..."
              rows={2}
              style={{ width: "100%", padding: "9px 12px", background: C.subtle, border: `1px solid ${C.border}`, borderRadius: 8, ...T.body, fontSize: 13, color: C.text, outline: "none", resize: "none" }} />
          </div>

        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: "10px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, ...T.body, fontSize: 13, cursor: "pointer" }}>
            Cancel
          </button>
          <button onClick={save} disabled={!title.trim() || saving}
            style={{ flex: 2, padding: "10px", borderRadius: 8, border: "none", background: saved ? "#2A9455" : title.trim() ? C.accent : C.border, color: "#FFF", ...T.body, fontSize: 13, fontWeight: 500, cursor: title.trim() ? "pointer" : "not-allowed" }}>
            {saved ? "✓ Task saved" : saving ? "Saving..." : "Save task"}
          </button>
        </div>
      </div>
    </div>
  );
}
