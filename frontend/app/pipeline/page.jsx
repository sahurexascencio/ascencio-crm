"use client";
import { useState, useEffect, useRef } from "react";
import Shell from "@/components/Shell";
import { StatusSelect, Spinner, ErrorMsg } from "@/components/ui";
import { C, T, ALL_STATUSES, STATUS_META } from "@/lib/tokens";
import { leads as leadsApi, contacts as contactsApi, messages as messagesApi } from "@/lib/api";

const TAGS = ["New Lead", "Interested", "Quoted", "Follow Up", "Hot", "Cold", "VIP", "No Budget"];

const COLUMNS = [
  { key: "business_name", label: "Business" },
  { key: "contact", label: "Contact" },
  { key: "phone", label: "Phone" },
  { key: "actions", label: "Actions" },
  { key: "treatment", label: "Treatment" },
  { key: "follow_up", label: "Follow Up" },
  { key: "status", label: "Stage" },
  { key: "tags", label: "Tags" },
];

function TagBadge({ tag, onRemove }) {
  const colors = {
    "New Lead": { bg: "rgba(46,123,196,0.1)", color: "#2E7BC4" },
    "Interested": { bg: "rgba(59,168,106,0.1)", color: "#2A9455" },
    "Quoted": { bg: "rgba(102,80,184,0.1)", color: "#6650B8" },
    "Follow Up": { bg: "rgba(196,118,10,0.1)", color: "#C4760A" },
    "Hot": { bg: "rgba(220,50,50,0.1)", color: "#DC3232" },
    "Cold": { bg: "rgba(107,123,141,0.1)", color: "#6B7B8D" },
    "VIP": { bg: "rgba(154,122,48,0.12)", color: "#9A7A30" },
    "No Budget": { bg: "rgba(107,123,141,0.1)", color: "#6B7B8D" },
  };
  const style = colors[tag] || { bg: C.subtle, color: C.muted };
  return (
    <span style={{ ...T.mono, fontSize: 10, padding: "2px 7px", borderRadius: 4, background: style.bg, color: style.color, display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
      {tag}
      {onRemove && <span onClick={onRemove} style={{ cursor: "pointer", opacity: 0.6, fontSize: 10 }}>×</span>}
    </span>
  );
}

function TagSelector({ selectedTags = [], onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const toggle = (tag) => {
    const next = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    onChange(next);
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(o => !o)} style={{ ...T.mono, fontSize: 10, padding: "3px 8px", borderRadius: 5, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, cursor: "pointer" }}>
        + Tag
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 8, zIndex: 100, minWidth: 140, boxShadow: "0 8px 24px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column", gap: 4 }}>
          {TAGS.map(tag => (
            <button key={tag} onClick={() => toggle(tag)} style={{ ...T.body, fontSize: 12, padding: "5px 8px", borderRadius: 5, border: "none", background: selectedTags.includes(tag) ? C.accentDim : "transparent", color: selectedTags.includes(tag) ? C.accent : C.text, cursor: "pointer", textAlign: "left" }}>
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function NotePreview({ notes }) {
  const [show, setShow] = useState(false);
  if (!notes) return <span style={{ ...T.mono, fontSize: 11, color: C.muted }}>—</span>;
  return (
    <div style={{ position: "relative" }} onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <span style={{ ...T.body, fontSize: 12, color: C.muted, cursor: "default", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
        {notes.slice(0, 20)}...
      </span>
      {show && (
        <div style={{ position: "absolute", top: "100%", left: 0, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", zIndex: 200, width: 240, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", ...T.body, fontSize: 12, color: C.text, lineHeight: 1.6 }}>
          {notes}
        </div>
      )}
    </div>
  );
}

function SMSModal({ lead, contact, onClose }) {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const send = async () => {
    if (!body.trim()) return;
    setSending(true);
    try {
      await messagesApi.sendSMS({ lead_id: lead.id, contact_id: contact?.id, body });
      setSent(true);
      setTimeout(onClose, 1500);
    } catch (e) {
      alert(`Failed: ${e.message}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "24px 28px", width: 440, boxShadow: "0 16px 48px rgba(0,0,0,0.15)" }}>
        <div style={{ ...T.heading, fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4 }}>Send SMS</div>
        <div style={{ ...T.mono, fontSize: 11, color: C.muted, marginBottom: 16 }}>To: {contact?.name} · {contact?.phone}</div>
        <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Type your message..." rows={4}
          style={{ width: "100%", background: C.subtle, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", ...T.body, fontSize: 13, color: C.text, lineHeight: 1.6, resize: "none", outline: "none" }} />
        <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ ...T.body, fontSize: 12, padding: "7px 16px", borderRadius: 7, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, cursor: "pointer" }}>Cancel</button>
          <button onClick={send} disabled={sending || sent} style={{ ...T.body, fontSize: 12, fontWeight: 500, padding: "7px 18px", borderRadius: 7, border: "none", background: sent ? C.confirmed : C.accent, color: "#FFFFFF", cursor: "pointer" }}>
            {sent ? "Sent ✓" : sending ? "Sending..." : "Send SMS"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TaskModal({ lead, onClose, onSaved }) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const token = localStorage.getItem("ascencio_token");
      await fetch(`${process.env.NEXT_PUBLIC_API_URL || "https://ascencio-crm-production.up.railway.app"}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ lead_id: lead.id, title, notes, due_date: dueDate || null }),
      });
      onSaved();
      onClose();
    } catch (e) {
      alert(`Failed: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "24px 28px", width: 440, boxShadow: "0 16px 48px rgba(0,0,0,0.15)" }}>
        <div style={{ ...T.heading, fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 16 }}>Schedule Follow-up Task</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ ...T.mono, fontSize: 10, color: C.muted, letterSpacing: "0.07em", display: "block", marginBottom: 5 }}>TASK TITLE</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Call back Dr. Walsh"
              style={{ width: "100%", padding: "9px 12px", background: C.subtle, border: `1px solid ${C.border}`, borderRadius: 7, ...T.body, fontSize: 13, color: C.text, outline: "none" }} />
          </div>
          <div>
            <label style={{ ...T.mono, fontSize: 10, color: C.muted, letterSpacing: "0.07em", display: "block", marginBottom: 5 }}>DUE DATE & TIME</label>
            <input type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)}
              style={{ width: "100%", padding: "9px 12px", background: C.subtle, border: `1px solid ${C.border}`, borderRadius: 7, ...T.body, fontSize: 13, color: C.text, outline: "none" }} />
          </div>
          <div>
            <label style={{ ...T.mono, fontSize: 10, color: C.muted, letterSpacing: "0.07em", display: "block", marginBottom: 5 }}>NOTES</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any additional context..." rows={2}
              style={{ width: "100%", padding: "9px 12px", background: C.subtle, border: `1px solid ${C.border}`, borderRadius: 7, ...T.body, fontSize: 13, color: C.text, outline: "none", resize: "none" }} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ ...T.body, fontSize: 12, padding: "7px 16px", borderRadius: 7, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, cursor: "pointer" }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ ...T.body, fontSize: 12, fontWeight: 500, padding: "7px 18px", borderRadius: 7, border: "none", background: C.accent, color: "#FFFFFF", cursor: "pointer" }}>
            {saving ? "Saving..." : "Save Task"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const [leads, setLeads] = useState([]);
  const [contacts, setContacts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");
  const [smsLead, setSmsLead] = useState(null);
  const [taskLead, setTaskLead] = useState(null);
  const [localTags, setLocalTags] = useState({});
  const [localNotes, setLocalNotes] = useState({});
  const [localFollowUp, setLocalFollowUp] = useState({});

  useEffect(() => { fetchLeads(); }, []);

  const fetchLeads = async () => {
    try {
      const data = await leadsApi.list();
      setLeads(data);
      // Fetch primary contact for each lead
      data.forEach(async (lead) => {
        try {
          const c = await contactsApi.forLead(lead.id);
          if (c?.length) setContacts(prev => ({ ...prev, [lead.id]: c[0] }));
        } catch {}
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id, status) => {
    setLeads(ls => ls.map(l => l.id === id ? { ...l, status } : l));
    try { await leadsApi.updateStatus(id, status); } catch { fetchLeads(); }
  };

  const incrementFollowUp = (id) => {
    const current = localFollowUp[id] ?? 0;
    if (current < 8) setLocalFollowUp(p => ({ ...p, [id]: current + 1 }));
  };

  const filtered = filter === "all" ? leads : leads.filter(l => l.status === filter);
  const counts = Object.fromEntries(
    ["all", ...ALL_STATUSES].map(s => [s, s === "all" ? leads.length : leads.filter(l => l.status === s).length])
  );

  return (
    <Shell topbarText={`${leads.length} leads · ${counts.callback || 0} callbacks pending`}>
      {smsLead && <SMSModal lead={smsLead} contact={contacts[smsLead.id]} onClose={() => setSmsLead(null)} />}
      {taskLead && <TaskModal lead={taskLead} onClose={() => setTaskLead(null)} onSaved={() => {}} />}

      <div className="fade-up">
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ ...T.heading, fontSize: 22, color: C.text, fontWeight: 700, marginBottom: 4 }}>Pipeline</h2>
          <p style={{ ...T.body, fontSize: 13, color: C.muted }}>{leads.length} leads · {counts.callback || 0} callbacks pending</p>
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

        {/* Table */}
        <div>
          {/* Header */}
          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 110px 88px 0.8fr 90px 120px 1fr", gap: 12, padding: "8px 16px 10px", borderBottom: `1px solid ${C.border}` }}>
            {COLUMNS.map(col => (
              <span key={col.key} style={{ ...T.mono, fontSize: 10, color: C.muted, letterSpacing: "0.07em" }}>{col.label.toUpperCase()}</span>
            ))}
          </div>

          {loading && <Spinner />}
          {error && <ErrorMsg message={error} />}

          {/* Rows */}
          <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 2 }}>
            {filtered.map(lead => {
              const contact = contacts[lead.id];
              const followUp = localFollowUp[lead.id] ?? lead.follow_up_count ?? 0;
              const tags = localTags[lead.id] ?? lead.tags ?? [];
              const notes = localNotes[lead.id] ?? lead.notes ?? "";

              return (
                <div key={lead.id}
                  style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr 110px 88px 0.8fr 90px 120px 1fr", gap: 12, alignItems: "center", padding: "11px 16px", borderRadius: 9, border: "1px solid transparent", transition: "all 0.12s", background: "transparent" }}
                  onMouseEnter={e => { e.currentTarget.style.background = C.card; e.currentTarget.style.borderColor = C.border; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; }}>

                  {/* Business */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ ...T.body, fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lead.business_name}</div>
                    <div style={{ ...T.mono, fontSize: 10, color: C.muted }}>{lead.city} · {lead.industry}</div>
                  </div>

                  {/* Contact */}
                  <div style={{ minWidth: 0 }}>
                    <div style={{ ...T.body, fontSize: 12, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{contact?.name || "—"}</div>
                    {contact?.email && <div style={{ ...T.mono, fontSize: 10, color: C.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{contact.email}</div>}
                  </div>

                  {/* Phone */}
                  <div style={{ ...T.mono, fontSize: 11, color: C.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {contact?.phone || "—"}
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 6 }}>
                    <button title="Call" style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${C.confirmedBg}`, background: C.confirmedBg, color: C.confirmed, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      📞
                    </button>
                    <button title="SMS" onClick={() => setSmsLead(lead)} style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${C.newBg}`, background: C.newBg, color: C.new, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      💬
                    </button>
                    <button title="Schedule task" onClick={() => setTaskLead(lead)} style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${C.callbackBg}`, background: C.callbackBg, color: C.callback, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      📅
                    </button>
                  </div>

                  {/* Treatment */}
                  <div style={{ ...T.body, fontSize: 12, color: C.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {lead.treatment || <span style={{ opacity: 0.4 }}>—</span>}
                  </div>

                  {/* Follow up counter */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ display: "flex", gap: 2 }}>
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: i < followUp ? C.accent : C.border, transition: "background 0.15s" }} />
                      ))}
                    </div>
                    <button onClick={() => incrementFollowUp(lead.id)} style={{ ...T.mono, fontSize: 10, color: C.accent, background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>
                      +
                    </button>
                  </div>

                  {/* Status */}
                  <div onClick={e => e.stopPropagation()}>
                    <StatusSelect status={lead.status} onChange={(s) => updateStatus(lead.id, s)} />
                  </div>

                  {/* Tags */}
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                    {tags.map(tag => (
                      <TagBadge key={tag} tag={tag} onRemove={() => setLocalTags(p => ({ ...p, [lead.id]: tags.filter(t => t !== tag) }))} />
                    ))}
                    <TagSelector selectedTags={tags} onChange={(next) => setLocalTags(p => ({ ...p, [lead.id]: next }))} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Shell>
  );
}