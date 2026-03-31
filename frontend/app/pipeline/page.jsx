"use client";
import { useState, useEffect } from "react";
import Shell from "@/components/Shell";
import { StatusSelect, Spinner, ErrorMsg } from "@/components/ui";
import { C, T, ALL_STATUSES, STATUS_META } from "@/lib/tokens";
import { leads as leadsApi } from "@/lib/api";

const COLS = "40px 1fr 96px 150px 130px 36px";

export default function PipelinePage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [openNote, setOpenNote] = useState(null);
  const [notes, setNotes] = useState({});
  const [drafts, setDrafts] = useState({});

  useEffect(() => { fetchLeads(); }, []);

  const fetchLeads = async () => {
    try {
      const data = await leadsApi.list();
      setLeads(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    setLeads(ls => ls.map(l => l.id === id ? { ...l, status } : l));
    try {
      await leadsApi.updateStatus(id, status);
    } catch {
      fetchLeads(); // revert on fail
    }
  };

  const saveNote = (id) => {
    setNotes(n => ({ ...n, [id]: drafts[id] }));
    setOpenNote(null);
  };

  const filtered = filter === "all" ? leads : leads.filter(l => l.status === filter);
  const counts = Object.fromEntries(
    ["all", ...ALL_STATUSES].map(s => [s, s === "all" ? leads.length : leads.filter(l => l.status === s).length])
  );

  const callbackCount = leads.filter(l => l.status === "callback").length;

  return (
    <Shell topbarText={`${leads.length} leads · ${callbackCount} callbacks pending`}>
      <div className="fade-up">
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ ...T.heading, fontSize: 22, color: C.text, fontWeight: 700, marginBottom: 4 }}>Pipeline</h2>
          <p style={{ ...T.body, fontSize: 13, color: C.muted }}>{leads.length} leads tracked · {callbackCount} callbacks pending</p>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 6, marginBottom: 18, flexWrap: "wrap" }}>
          {[["all","All"],["new","New"],["in_progress","In Progress"],["callback","Callback"],["confirmed","Confirmed"],["dead","Dead"]].map(([k,l]) => (
            <button key={k} onClick={() => setFilter(k)}
              style={{ ...T.body, fontSize: 12, fontWeight: 500, padding: "5px 12px", borderRadius: 6, border: `1px solid ${filter===k ? C.accent : C.border}`, background: filter===k ? C.accentDim : "transparent", color: filter===k ? C.accent : C.muted, cursor: "pointer", transition: "all 0.15s" }}>
              {l} <span style={{ ...T.mono, fontSize: 10, opacity: 0.6, marginLeft: 3 }}>{counts[k]??0}</span>
            </button>
          ))}
        </div>

        {/* Table header */}
        <div style={{ display: "grid", gridTemplateColumns: COLS, gap: 12, padding: "7px 16px 10px", borderBottom: `1px solid ${C.border}` }}>
          {["","Business","Assigned","Last activity","Status",""].map((h,i) => (
            <span key={i} style={{ ...T.mono, fontSize: 10, color: C.muted, letterSpacing: "0.07em" }}>{h.toUpperCase()}</span>
          ))}
        </div>

        {loading && <Spinner />}
        {error && <ErrorMsg message={error} />}

        {/* Rows */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 2 }}>
          {filtered.map(lead => (
            <div key={lead.id}>
              <div
                style={{ display: "grid", gridTemplateColumns: COLS, gap: 12, alignItems: "center", padding: "11px 16px", borderRadius: openNote===lead.id ? "9px 9px 0 0" : 9, border: `1px solid ${openNote===lead.id ? C.accent+"45" : "transparent"}`, borderBottom: openNote===lead.id ? `1px solid ${C.border}` : "1px solid transparent", transition: "all 0.12s", background: openNote===lead.id ? C.accentGlow : "transparent" }}
                onMouseEnter={e => { if (openNote!==lead.id) e.currentTarget.style.background = C.card; }}
                onMouseLeave={e => { if (openNote!==lead.id) e.currentTarget.style.background = "transparent"; }}>

                <div style={{ width: 34, height: 34, borderRadius: 8, background: C.accentDim, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <span style={{ ...T.heading, fontSize: 13, color: C.accent, fontWeight: 700 }}>{lead.business_name?.[0]}</span>
                </div>

                <div style={{ minWidth: 0 }}>
                  <div style={{ ...T.body, fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lead.business_name}</div>
                  <div style={{ ...T.mono, fontSize: 11, color: C.muted }}>{lead.city} · {lead.industry}</div>
                </div>

                <div style={{ ...T.body, fontSize: 12, color: C.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {lead.assigned_name || "Unassigned"}
                </div>

                <div style={{ ...T.mono, fontSize: 11, color: C.muted, display: "flex", alignItems: "center", gap: 5 }}>
                  {notes[lead.id] && <span style={{ color: C.accent }}>✎</span>}
                  {new Date(lead.updated_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </div>

                <div onClick={e => e.stopPropagation()}>
                  <StatusSelect status={lead.status} onChange={(s) => updateStatus(lead.id, s)} />
                </div>

                <button onClick={() => { if (openNote===lead.id) { setOpenNote(null); return; } setDrafts(d => ({...d,[lead.id]:notes[lead.id]||""})); setOpenNote(lead.id); }}
                  style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${openNote===lead.id ? C.accent+"60" : C.border}`, background: openNote===lead.id ? C.accentDim : "transparent", color: openNote===lead.id ? C.accent : C.muted, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.13s", flexShrink: 0 }}>
                  ✎
                </button>
              </div>

              {openNote===lead.id && (
                <div className="note-slide" style={{ background: C.card, border: `1px solid ${C.accent}40`, borderTop: "none", borderRadius: "0 0 9px 9px", padding: "14px 16px" }}>
                  <div style={{ ...T.mono, fontSize: 10, color: C.accent, letterSpacing: "0.08em", marginBottom: 8 }}>NOTES — {lead.business_name}</div>
                  <textarea value={drafts[lead.id]||""} onChange={e => setDrafts(d=>({...d,[lead.id]:e.target.value}))}
                    placeholder="Add your notes — what was said, follow-up details, anything useful..."
                    rows={3}
                    style={{ width: "100%", background: C.subtle, border: `1px solid ${C.border}`, borderRadius: 7, padding: "10px 12px", ...T.body, fontSize: 13, color: C.text, lineHeight: 1.6 }} />
                  <div style={{ display: "flex", gap: 8, marginTop: 10, justifyContent: "flex-end" }}>
                    <button onClick={() => setOpenNote(null)} style={{ ...T.body, fontSize: 12, padding: "6px 14px", borderRadius: 7, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, cursor: "pointer" }}>Cancel</button>
                    <button onClick={() => saveNote(lead.id)} style={{ ...T.body, fontSize: 12, fontWeight: 500, padding: "6px 16px", borderRadius: 7, border: "none", background: C.accent, color: "#FFFFFF", cursor: "pointer" }}>Save note</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}
