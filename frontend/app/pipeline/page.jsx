"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import Shell from "@/components/Shell";
import { StatusSelect, Spinner, ErrorMsg } from "@/components/ui";
import { C, T, ALL_STATUSES, STATUS_META } from "@/lib/tokens";
import { leads as leadsApi, contacts as contactsApi, messages as messagesApi, calls as callsApi } from "@/lib/api";

// ── Tag config ────────────────────────────────────────────────────────────────
const TAGS = ["New Lead","Interested","Quoted","Follow Up","Hot","Cold","VIP","No Budget"];
const TAG_COLORS = {
  "New Lead":  { bg: "rgba(59,130,246,0.12)",  color: "#3B82F6" },
  "Interested":{ bg: "rgba(16,185,129,0.12)",  color: "#10B981" },
  "Quoted":    { bg: "rgba(139,92,246,0.12)",   color: "#8B5CF6" },
  "Follow Up": { bg: "rgba(245,158,11,0.12)",  color: "#F59E0B" },
  "Hot":       { bg: "rgba(239,68,68,0.12)",   color: "#EF4444" },
  "Cold":      { bg: "rgba(107,123,141,0.12)", color: "#6B7B8D" },
  "VIP":       { bg: "rgba(201,168,76,0.12)",  color: "#C9A84C" },
  "No Budget": { bg: "rgba(107,123,141,0.12)", color: "#6B7B8D" },
};

const COLUMNS = [
  { key: "business_name", label: "Business" },
  { key: "contact",       label: "Contact"  },
  { key: "phone",         label: "Phone"    },
  { key: "actions",       label: "Actions"  },
  { key: "treatment",     label: "Treatment"},
  { key: "follow_up",     label: "Follow Up"},
  { key: "status",        label: "Stage"    },
  { key: "tags",          label: "Tags"     },
];

const GRID = "1.6fr 1fr 110px 92px 0.8fr 90px 130px 1fr";

// ── Sub-components ─────────────────────────────────────────────────────────────

function TagBadge({ tag, onRemove }) {
  const s = TAG_COLORS[tag] || { bg: "var(--gold-dim)", color: "var(--gold)" };
  return (
    <span style={{
      fontFamily: "'DM Mono', monospace", fontSize: 10,
      padding: "2px 7px", borderRadius: 4,
      background: s.bg, color: s.color,
      display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap",
    }}>
      {tag}
      {onRemove && (
        <span onClick={onRemove} style={{ cursor: "pointer", opacity: 0.6, fontSize: 10 }}>×</span>
      )}
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

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          fontFamily: "'DM Mono', monospace", fontSize: 10,
          padding: "3px 8px", borderRadius: 5,
          border: "1px solid var(--border)",
          background: "transparent", color: "var(--text-secondary)",
        }}
      >+ Tag</button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0,
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: 9, padding: 6, zIndex: 100, minWidth: 140,
          boxShadow: "var(--shadow-sm)", display: "flex", flexDirection: "column", gap: 2,
        }}>
          {TAGS.map(tag => (
            <button key={tag}
              onClick={() => {
                const next = selectedTags.includes(tag)
                  ? selectedTags.filter(t => t !== tag)
                  : [...selectedTags, tag];
                onChange(next);
              }}
              style={{
                fontFamily: "'DM Sans', sans-serif", fontSize: 12,
                padding: "5px 9px", borderRadius: 6, border: "none",
                background: selectedTags.includes(tag) ? "var(--gold-dim)" : "transparent",
                color: selectedTags.includes(tag) ? "var(--gold)" : "var(--text-primary)",
                textAlign: "left",
              }}
            >{tag}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function NotePreview({ notes }) {
  const [show, setShow] = useState(false);
  if (!notes) return <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--text-secondary)" }}>—</span>;
  return (
    <div style={{ position: "relative" }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span style={{
        fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "var(--text-secondary)",
        maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block",
      }}>
        {notes.slice(0, 20)}…
      </span>
      {show && (
        <div style={{
          position: "absolute", top: "100%", left: 0,
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: 9, padding: "10px 13px",
          zIndex: 200, width: 240, boxShadow: "var(--shadow-sm)",
          fontFamily: "'DM Sans', sans-serif", fontSize: 12,
          color: "var(--text-primary)", lineHeight: 1.6,
        }}>
          {notes}
        </div>
      )}
    </div>
  );
}

// ── SMS Modal ─────────────────────────────────────────────────────────────────
function SMSModal({ lead, contact, onClose }) {
  const [body,    setBody]    = useState("");
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);

  const send = async () => {
    if (!body.trim()) return;
    setSending(true);
    try {
      await messagesApi.sendSMS({ lead_id: lead.id, contact_id: contact?.id, body });
      setSent(true);
      toast.success("SMS sent successfully");
      setTimeout(onClose, 1200);
    } catch (e) {
      toast.error(`Failed to send: ${e.message}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.5)", zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        style={{
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: 16, padding: "26px 28px", width: 440,
          boxShadow: "var(--shadow)",
        }}
      >
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>Send SMS</div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--text-secondary)", marginBottom: 16 }}>
          To: {contact?.name} · {contact?.phone}
        </div>
        <textarea
          value={body} onChange={e => setBody(e.target.value)}
          placeholder="Type your message…" rows={4}
          style={{
            width: "100%", background: "var(--bg-primary)",
            border: "1px solid var(--border)", borderRadius: 9,
            padding: "10px 13px",
            fontFamily: "'DM Sans', sans-serif", fontSize: 13,
            color: "var(--text-primary)", lineHeight: 1.6,
          }}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 12, padding: "7px 16px",
            borderRadius: 8, border: "1px solid var(--border)",
            background: "transparent", color: "var(--text-secondary)",
          }}>Cancel</button>
          <button onClick={send} disabled={sending || sent} style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600,
            padding: "7px 20px", borderRadius: 8, border: "none",
            background: sent ? "#10B981" : "var(--gold)", color: "#0A0B0F",
            opacity: sending ? 0.7 : 1,
          }}>
            {sent ? "Sent ✓" : sending ? "Sending…" : "Send SMS"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Task Modal ────────────────────────────────────────────────────────────────
function TaskModal({ lead, onClose, onSaved }) {
  const [title,   setTitle]   = useState("");
  const [notes,   setNotes]   = useState("");
  const [dueDate, setDueDate] = useState("");
  const [saving,  setSaving]  = useState(false);

  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const token = localStorage.getItem("ascencio_token");
      const base  = process.env.NEXT_PUBLIC_API_URL || "https://ascencio-crm-production.up.railway.app";
      const res   = await fetch(`${base}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ lead_id: lead.id, title, notes, due_date: dueDate || null }),
      });
      if (!res.ok) throw new Error("Failed to save task");
      toast.success("Task scheduled");
      onSaved();
      onClose();
    } catch (e) {
      toast.error(`Failed: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const labelStyle = {
    fontFamily: "'DM Mono', monospace", fontSize: 10,
    color: "var(--text-secondary)", letterSpacing: "0.07em",
    display: "block", marginBottom: 6,
  };
  const inputStyle = {
    width: "100%", padding: "9px 12px",
    background: "var(--bg-primary)", border: "1px solid var(--border)",
    borderRadius: 8, fontFamily: "'DM Sans', sans-serif", fontSize: 13,
    color: "var(--text-primary)", outline: "none",
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.5)", zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
        backdropFilter: "blur(4px)",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        style={{
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: 16, padding: "26px 28px", width: 440,
          boxShadow: "var(--shadow)",
        }}
      >
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 18 }}>
          Schedule Follow-up Task
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          <div>
            <label style={labelStyle}>TASK TITLE</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Call back Dr. Walsh" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>DUE DATE & TIME</label>
            <input type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)}
              style={{ ...inputStyle, colorScheme: "dark" }} />
          </div>
          <div>
            <label style={labelStyle}>NOTES</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Any additional context…" rows={2}
              style={{ ...inputStyle, resize: "none" }} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 18, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 12, padding: "7px 16px",
            borderRadius: 8, border: "1px solid var(--border)",
            background: "transparent", color: "var(--text-secondary)",
          }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600,
            padding: "7px 20px", borderRadius: 8, border: "none",
            background: "var(--gold)", color: "#0A0B0F",
            opacity: saving ? 0.7 : 1,
          }}>
            {saving ? "Saving…" : "Save Task"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PipelinePage() {
  const [leads,         setLeads]        = useState([]);
  const [contacts,      setContacts]     = useState({});
  const [loading,       setLoading]      = useState(true);
  const [error,         setError]        = useState("");
  const [filter,        setFilter]       = useState("all");
  const [smsLead,       setSmsLead]      = useState(null);
  const [taskLead,      setTaskLead]     = useState(null);
  const [localTags,     setLocalTags]    = useState({});
  const [localNotes,    setLocalNotes]   = useState({});
  const [localFollowUp, setLocalFollowUp]= useState({});

  useEffect(() => { fetchLeads(); }, []);

  const fetchLeads = async () => {
    try {
      const data = await leadsApi.list();
      setLeads(data);
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

  const handleCall = async (lead, contact) => {
    if (!contact?.id) {
      toast.error("No contact found for this lead");
      return;
    }
    try {
      await callsApi.initiate({ lead_id: lead.id, contact_id: contact.id });
      toast.success("Call initiated — your phone will ring now");
    } catch (e) {
      toast.error(`Call failed: ${e.message}`);
    }
  };

  const incrementFollowUp = async (id) => {
    const current = localFollowUp[id] ?? leads.find(l => l.id === id)?.follow_up_count ?? 0;
    if (current >= 8) return;
    const next = current + 1;
    setLocalFollowUp(p => ({ ...p, [id]: next }));
    try {
      await leadsApi.update(id, { follow_up_count: next });
    } catch (e) {
      toast.error("Failed to save follow-up count");
      setLocalFollowUp(p => ({ ...p, [id]: current }));
    }
  };

  const filtered = filter === "all" ? leads : leads.filter(l => l.status === filter);
  const counts   = Object.fromEntries(
    ["all", ...ALL_STATUSES].map(s => [s, s === "all" ? leads.length : leads.filter(l => l.status === s).length])
  );

  return (
    <Shell topbarText={`${leads.length} leads · ${counts.callback || 0} callbacks pending`}>
      <AnimatePresence>
        {smsLead  && <SMSModal  key="sms"  lead={smsLead}  contact={contacts[smsLead.id]}  onClose={() => setSmsLead(null)} />}
        {taskLead && <TaskModal key="task" lead={taskLead} onClose={() => setTaskLead(null)} onSaved={() => {}} />}
      </AnimatePresence>

      <div className="fade-up">
        {/* Header */}
        <div style={{ marginBottom: 22 }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>Pipeline</h2>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "var(--text-secondary)" }}>
            {leads.length} leads · {counts.callback || 0} callbacks pending
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
          {[["all","All"],["new","New"],["in_progress","In Progress"],["callback","Callback"],["confirmed","Confirmed"],["dead","Dead"]].map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 500,
              padding: "5px 13px", borderRadius: 7,
              border: `1px solid ${filter === k ? "var(--gold)" : "var(--border)"}`,
              background: filter === k ? "var(--gold-dim)" : "transparent",
              color: filter === k ? "var(--gold)" : "var(--text-secondary)",
              transition: "all 0.15s",
            }}>
              {l} <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, opacity: 0.6, marginLeft: 2 }}>{counts[k] ?? 0}</span>
            </button>
          ))}
        </div>

        {/* Table */}
        <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
          {/* Header row */}
          <div style={{
            display: "grid", gridTemplateColumns: GRID, gap: 12,
            padding: "10px 16px 12px",
            borderBottom: "1px solid var(--border)",
            background: "var(--bg-secondary)",
          }}>
            {COLUMNS.map(col => (
              <span key={col.key} style={{
                fontFamily: "'DM Mono', monospace", fontSize: 10,
                color: "var(--text-secondary)", letterSpacing: "0.07em",
              }}>{col.label.toUpperCase()}</span>
            ))}
          </div>

          {loading && <Spinner />}
          {error   && <ErrorMsg message={error} />}

          {/* Rows */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <AnimatePresence mode="popLayout">
              {filtered.map((lead, index) => {
                const contact  = contacts[lead.id];
                const followUp = localFollowUp[lead.id] ?? lead.follow_up_count ?? 0;
                const tags     = localTags[lead.id]  ?? lead.tags  ?? [];
                const notes    = localNotes[lead.id] ?? lead.notes ?? "";

                return (
                  <motion.div
                    key={lead.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ delay: Math.min(index * 0.025, 0.25), duration: 0.22 }}
                    style={{
                      display: "grid", gridTemplateColumns: GRID, gap: 12,
                      alignItems: "center", padding: "12px 16px",
                      borderBottom: "1px solid var(--border)",
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-secondary)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    {/* Business */}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {lead.business_name}
                      </div>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--text-secondary)" }}>
                        {lead.city} · {lead.industry}
                      </div>
                    </div>

                    {/* Contact */}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {contact?.name || "—"}
                      </div>
                      {contact?.email && (
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {contact.email}
                        </div>
                      )}
                    </div>

                    {/* Phone */}
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {contact?.phone || "—"}
                    </div>

                    {/* Actions */}
                    <div style={{ display: "flex", gap: 5 }}>
                      {[
                        { emoji: "📞", title: "Call",           bg: C.confirmedBg, color: C.confirmed, onClick: () => handleCall(lead, contact) },
                        { emoji: "💬", title: "SMS",            bg: C.newBg,       color: C.new,       onClick: () => setSmsLead(lead) },
                        { emoji: "📅", title: "Schedule task",  bg: C.callbackBg,  color: C.callback,  onClick: () => setTaskLead(lead) },
                      ].map(({ emoji, title, bg, color, onClick }) => (
                        <button key={title} title={title} onClick={onClick}
                          style={{
                            width: 28, height: 28, borderRadius: 7,
                            border: `1px solid ${bg}`, background: bg, color,
                            fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center",
                            transition: "transform 0.12s",
                          }}
                          onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.1)")}
                          onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
                        >{emoji}</button>
                      ))}
                    </div>

                    {/* Treatment */}
                    <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {lead.treatment || <span style={{ opacity: 0.35 }}>—</span>}
                    </div>

                    {/* Follow-up dots */}
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                      <div style={{ display: "flex", gap: 2 }}>
                        {Array.from({ length: 8 }).map((_, i) => (
                          <div key={i} style={{
                            width: 7, height: 7, borderRadius: "50%",
                            background: i < followUp ? "var(--gold)" : "var(--border)",
                            transition: "background 0.2s",
                          }} />
                        ))}
                      </div>
                      <button
                        onClick={() => incrementFollowUp(lead.id)}
                        style={{
                          fontFamily: "'DM Mono', monospace", fontSize: 11,
                          color: "var(--gold)", background: "transparent",
                          border: "none", padding: "0 2px", lineHeight: 1,
                        }}
                      >+</button>
                    </div>

                    {/* Status */}
                    <div onClick={e => e.stopPropagation()}>
                      <StatusSelect status={lead.status} onChange={(s) => updateStatus(lead.id, s)} />
                    </div>

                    {/* Tags */}
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                      {tags.map(tag => (
                        <TagBadge key={tag} tag={tag}
                          onRemove={() => setLocalTags(p => ({ ...p, [lead.id]: tags.filter(t => t !== tag) }))}
                        />
                      ))}
                      <TagSelector selectedTags={tags}
                        onChange={(next) => setLocalTags(p => ({ ...p, [lead.id]: next }))}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {!loading && !error && filtered.length === 0 && (
              <div style={{
                padding: "40px 20px", textAlign: "center",
                fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "var(--text-secondary)",
              }}>
                No leads in this stage
              </div>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}
