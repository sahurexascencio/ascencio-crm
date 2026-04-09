"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";
import Shell from "@/components/Shell";
import { StatusSelect } from "@/components/ui";
import { C, ALL_STATUSES, STATUS_META } from "@/lib/tokens";
import { leads as leadsApi, contacts as contactsApi, messages as messagesApi, calls as callsApi } from "@/lib/api";

// ── Constants ─────────────────────────────────────────────────────────────────
const TAGS = ["New Lead","Interested","Quoted","Follow Up","Hot","Cold","VIP","No Budget"];
const TAG_COLORS = {
  "New Lead":  { bg: "rgba(59,130,246,0.12)",  color: "#3B82F6" },
  "Interested":{ bg: "rgba(16,185,129,0.12)",  color: "#10B981" },
  "Quoted":    { bg: "rgba(139,92,246,0.12)",  color: "#8B5CF6" },
  "Follow Up": { bg: "rgba(245,158,11,0.12)",  color: "#F59E0B" },
  "Hot":       { bg: "rgba(239,68,68,0.12)",   color: "#EF4444" },
  "Cold":      { bg: "rgba(107,123,141,0.12)", color: "#6B7B8D" },
  "VIP":       { bg: "rgba(201,168,76,0.12)",  color: "#C9A84C" },
  "No Budget": { bg: "rgba(107,123,141,0.12)", color: "#6B7B8D" },
};
const INDUSTRIES = ["clinic","dental","aesthetics","ecommerce","other"];
const COLUMNS = [
  { key: "business_name", label: "Business"  },
  { key: "contact",       label: "Contact"   },
  { key: "phone",         label: "Phone"     },
  { key: "actions",       label: "Actions"   },
  { key: "treatment",     label: "Treatment" },
  { key: "follow_up",     label: "Follow Up" },
  { key: "status",        label: "Stage"     },
  { key: "tags",          label: "Tags"      },
];
const GRID = "1.6fr 1fr 110px 92px 0.8fr 90px 130px 1fr";

// ── Shared input style ────────────────────────────────────────────────────────
const inp = {
  width: "100%", padding: "9px 12px",
  background: "var(--bg-primary)", border: "1px solid var(--border)",
  borderRadius: 8, fontFamily: "'DM Sans', sans-serif", fontSize: 13,
  color: "var(--text-primary)", outline: "none",
};
const lbl = {
  fontFamily: "'DM Mono', monospace", fontSize: 10,
  color: "var(--text-secondary)", letterSpacing: "0.07em",
  display: "block", marginBottom: 6,
};

// ── Tag Badge ─────────────────────────────────────────────────────────────────
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
      {onRemove && <span onClick={onRemove} style={{ cursor: "pointer", opacity: 0.6, fontSize: 10 }}>×</span>}
    </span>
  );
}

// ── Tag Selector ──────────────────────────────────────────────────────────────
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
      <button onClick={() => setOpen(o => !o)} style={{
        fontFamily: "'DM Mono', monospace", fontSize: 10,
        padding: "3px 8px", borderRadius: 5,
        border: "1px solid var(--border)",
        background: "transparent", color: "var(--text-secondary)",
      }}>+ Tag</button>
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

// ── Skeleton Row ──────────────────────────────────────────────────────────────
function SkeletonRow({ index }) {
  const widths = ["70%", "55%", "65%", "80%", "40%", "60%", "72%", "50%"];
  return (
    <div style={{
      display: "grid", gridTemplateColumns: GRID, gap: 12,
      alignItems: "center", padding: "13px 16px",
      borderBottom: "1px solid var(--border)",
    }}>
      {widths.map((w, i) => (
        <div key={i} className="skeleton-pulse" style={{
          height: 12, borderRadius: 6,
          background: "var(--border)", width: w,
          animationDelay: `${(index * 0.08 + i * 0.03).toFixed(2)}s`,
        }} />
      ))}
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState({ onAddLead }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "72px 20px", gap: 14,
      }}
    >
      <div style={{
        width: 52, height: 52, borderRadius: 14,
        background: "var(--gold-dim)", border: "1px solid var(--gold)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 22, marginBottom: 4,
      }}>◈</div>
      <h3 style={{
        fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700,
        color: "var(--text-primary)", margin: 0,
      }}>No leads yet</h3>
      <p style={{
        fontFamily: "'DM Sans', sans-serif", fontSize: 13,
        color: "var(--text-secondary)", margin: 0,
      }}>Add your first lead to start filling the pipeline</p>
      <button
        onClick={onAddLead}
        style={{
          marginTop: 6, fontFamily: "'DM Sans', sans-serif",
          fontSize: 13, fontWeight: 600,
          padding: "10px 24px", borderRadius: 10, border: "none",
          background: "var(--gold)", color: "#0A0B0F", cursor: "pointer",
        }}
      >+ Add Lead</button>
    </motion.div>
  );
}

// ── SMS Modal ─────────────────────────────────────────────────────────────────
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
      toast.success("SMS sent successfully");
      setTimeout(onClose, 1200);
    } catch (e) {
      toast.error(`Failed to send: ${e.message}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <Backdrop onClose={onClose}>
      <ModalCard>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>Send SMS</div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--text-secondary)", marginBottom: 16 }}>
          To: {contact?.name} · {contact?.phone}
        </div>
        <textarea value={body} onChange={e => setBody(e.target.value)}
          placeholder="Type your message…" rows={4}
          style={{ ...inp, resize: "none" }} />
        <ModalActions>
          <SecondaryBtn onClick={onClose}>Cancel</SecondaryBtn>
          <PrimaryBtn onClick={send} disabled={sending || sent} style={{ background: sent ? "#10B981" : "var(--gold)" }}>
            {sent ? "Sent ✓" : sending ? "Sending…" : "Send SMS"}
          </PrimaryBtn>
        </ModalActions>
      </ModalCard>
    </Backdrop>
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

  return (
    <Backdrop onClose={onClose}>
      <ModalCard>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 18 }}>
          Schedule Follow-up Task
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
          <div>
            <label style={lbl}>TASK TITLE</label>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Call back Dr. Walsh" style={inp} />
          </div>
          <div>
            <label style={lbl}>DUE DATE & TIME</label>
            <input type="datetime-local" value={dueDate} onChange={e => setDueDate(e.target.value)}
              style={{ ...inp, colorScheme: "dark" }} />
          </div>
          <div>
            <label style={lbl}>NOTES</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Any additional context…" rows={2}
              style={{ ...inp, resize: "none" }} />
          </div>
        </div>
        <ModalActions>
          <SecondaryBtn onClick={onClose}>Cancel</SecondaryBtn>
          <PrimaryBtn onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save Task"}
          </PrimaryBtn>
        </ModalActions>
      </ModalCard>
    </Backdrop>
  );
}

// ── Add Lead Modal ────────────────────────────────────────────────────────────
function AddLeadModal({ onClose, onCreated }) {
  const [businessName, setBusinessName] = useState("");
  const [industry,     setIndustry]     = useState("clinic");
  const [city,         setCity]         = useState("");
  const [country,      setCountry]      = useState("");
  const [website,      setWebsite]      = useState("");
  const [contactName,  setContactName]  = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [saving,       setSaving]       = useState(false);

  const submit = async () => {
    if (!businessName.trim()) { toast.error("Business name is required"); return; }
    if (!contactName.trim())  { toast.error("Contact name is required");  return; }
    if (!contactPhone.trim()) { toast.error("Contact phone is required"); return; }
    setSaving(true);
    try {
      const lead = await leadsApi.create({
        business_name: businessName,
        industry,
        city,
        country,
        website_url: website || null,
        status: "new",
      });
      await contactsApi.create({
        lead_id: lead.id,
        name: contactName,
        phone: contactPhone,
        email: contactEmail || null,
        role: "primary",
      });
      toast.success(`${businessName} added to pipeline`);
      onCreated();
      onClose();
    } catch (e) {
      toast.error(`Failed: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const SectionLabel = ({ children }) => (
    <p style={{
      fontFamily: "'DM Mono', monospace", fontSize: 9,
      color: "var(--text-secondary)", letterSpacing: "0.1em",
      marginBottom: 12, marginTop: 4,
    }}>{children}</p>
  );

  return (
    <Backdrop onClose={onClose}>
      <ModalCard style={{ width: 500, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 17, fontWeight: 700, color: "var(--text-primary)", marginBottom: 20 }}>
          Add New Lead
        </div>

        {/* Business Details */}
        <SectionLabel>BUSINESS DETAILS</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 11, marginBottom: 20 }}>
          <div>
            <label style={lbl}>BUSINESS NAME *</label>
            <input value={businessName} onChange={e => setBusinessName(e.target.value)}
              placeholder="e.g. Harley Street Clinic" style={inp}
              onFocus={e => (e.target.style.borderColor = "var(--gold)")}
              onBlur={e  => (e.target.style.borderColor = "var(--border)")} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={lbl}>INDUSTRY *</label>
              <select value={industry} onChange={e => setIndustry(e.target.value)}
                style={{ ...inp, appearance: "none", cursor: "pointer" }}>
                {INDUSTRIES.map(i => (
                  <option key={i} value={i} style={{ background: "var(--bg-card)", color: "var(--text-primary)" }}>
                    {i.charAt(0).toUpperCase() + i.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={lbl}>CITY</label>
              <input value={city} onChange={e => setCity(e.target.value)}
                placeholder="e.g. London" style={inp}
                onFocus={e => (e.target.style.borderColor = "var(--gold)")}
                onBlur={e  => (e.target.style.borderColor = "var(--border)")} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={lbl}>COUNTRY</label>
              <input value={country} onChange={e => setCountry(e.target.value)}
                placeholder="e.g. UK" style={inp}
                onFocus={e => (e.target.style.borderColor = "var(--gold)")}
                onBlur={e  => (e.target.style.borderColor = "var(--border)")} />
            </div>
            <div>
              <label style={lbl}>WEBSITE URL</label>
              <input value={website} onChange={e => setWebsite(e.target.value)}
                placeholder="https://..." style={inp}
                onFocus={e => (e.target.style.borderColor = "var(--gold)")}
                onBlur={e  => (e.target.style.borderColor = "var(--border)")} />
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ borderTop: "1px solid var(--border)", marginBottom: 18 }} />

        {/* Primary Contact */}
        <SectionLabel>PRIMARY CONTACT</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          <div>
            <label style={lbl}>CONTACT NAME *</label>
            <input value={contactName} onChange={e => setContactName(e.target.value)}
              placeholder="e.g. Dr. Sarah Walsh" style={inp}
              onFocus={e => (e.target.style.borderColor = "var(--gold)")}
              onBlur={e  => (e.target.style.borderColor = "var(--border)")} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={lbl}>PHONE *</label>
              <input value={contactPhone} onChange={e => setContactPhone(e.target.value)}
                placeholder="+44 7700 900123" style={inp}
                onFocus={e => (e.target.style.borderColor = "var(--gold)")}
                onBlur={e  => (e.target.style.borderColor = "var(--border)")} />
            </div>
            <div>
              <label style={lbl}>EMAIL</label>
              <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)}
                placeholder="sarah@clinic.com" style={inp}
                onFocus={e => (e.target.style.borderColor = "var(--gold)")}
                onBlur={e  => (e.target.style.borderColor = "var(--border)")} />
            </div>
          </div>
        </div>

        <ModalActions style={{ marginTop: 22 }}>
          <SecondaryBtn onClick={onClose}>Cancel</SecondaryBtn>
          <PrimaryBtn onClick={submit} disabled={saving}>
            {saving ? "Adding…" : "Add Lead →"}
          </PrimaryBtn>
        </ModalActions>
      </ModalCard>
    </Backdrop>
  );
}

// ── Modal primitives ──────────────────────────────────────────────────────────
function Backdrop({ children, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.55)", zIndex: 1000,
        display: "flex", alignItems: "center", justifyContent: "center",
        backdropFilter: "blur(4px)", padding: 20,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {children}
    </motion.div>
  );
}

function ModalCard({ children, style }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.94, y: 16 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: 16, padding: "26px 28px", width: 440,
        boxShadow: "var(--shadow)", ...style,
      }}
    >
      {children}
    </motion.div>
  );
}

function ModalActions({ children, style }) {
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end", ...style }}>
      {children}
    </div>
  );
}

function SecondaryBtn({ children, onClick }) {
  return (
    <button onClick={onClick} style={{
      fontFamily: "'DM Sans', sans-serif", fontSize: 12, padding: "8px 18px",
      borderRadius: 8, border: "1px solid var(--border)",
      background: "transparent", color: "var(--text-secondary)", cursor: "pointer",
    }}>{children}</button>
  );
}

function PrimaryBtn({ children, onClick, disabled, style }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600,
      padding: "8px 22px", borderRadius: 8, border: "none",
      background: "var(--gold)", color: "#0A0B0F", cursor: "pointer",
      opacity: disabled ? 0.7 : 1, ...style,
    }}>{children}</button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function PipelinePage() {
  const [leads,         setLeads]         = useState([]);
  const [contacts,      setContacts]      = useState({});
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState("");
  const [filter,        setFilter]        = useState("all");
  const [showAddLead,   setShowAddLead]   = useState(false);
  const [smsLead,       setSmsLead]       = useState(null);
  const [taskLead,      setTaskLead]      = useState(null);
  const [localTags,     setLocalTags]     = useState({});
  const [localFollowUp, setLocalFollowUp] = useState({});

  useEffect(() => { fetchLeads(); }, []);

  const fetchLeads = async () => {
    setLoading(true);
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
    if (!contact?.id) { toast.error("No contact found for this lead"); return; }
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
    } catch {
      toast.error("Failed to save follow-up count");
      setLocalFollowUp(p => ({ ...p, [id]: current }));
    }
  };

  const filtered = filter === "all" ? leads : leads.filter(l => l.status === filter);
  const counts   = Object.fromEntries(
    ["all", ...ALL_STATUSES].map(s => [s, s === "all" ? leads.length : leads.filter(l => l.status === s).length])
  );

  return (
    <Shell
      topbarText={loading ? "Pipeline" : `${leads.length} leads · ${counts.callback || 0} callbacks pending`}
      onAddLead={() => setShowAddLead(true)}
    >
      <AnimatePresence>
        {showAddLead && (
          <AddLeadModal key="add" onClose={() => setShowAddLead(false)} onCreated={fetchLeads} />
        )}
        {smsLead && (
          <SMSModal key="sms" lead={smsLead} contact={contacts[smsLead.id]} onClose={() => setSmsLead(null)} />
        )}
        {taskLead && (
          <TaskModal key="task" lead={taskLead} onClose={() => setTaskLead(null)} onSaved={() => {}} />
        )}
      </AnimatePresence>

      <div className="fade-up">
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          <div>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>Pipeline</h2>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "var(--text-secondary)" }}>
              {loading ? "Loading…" : `${leads.length} leads · ${counts.callback || 0} callbacks pending`}
            </p>
          </div>
          {!loading && leads.length > 0 && (
            <button onClick={() => setShowAddLead(true)} style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600,
              padding: "9px 20px", borderRadius: 9, border: "none",
              background: "var(--gold)", color: "#0A0B0F", cursor: "pointer",
            }}>+ Add Lead</button>
          )}
        </div>

        {/* Error state */}
        {error && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              padding: "64px 20px", gap: 12, textAlign: "center",
            }}
          >
            <div style={{
              width: 48, height: 48, borderRadius: 12, fontSize: 20,
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>⚠</div>
            <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
              Couldn't load leads
            </p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
              {error}
            </p>
            <button onClick={fetchLeads} style={{
              marginTop: 4, fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500,
              padding: "9px 22px", borderRadius: 9, border: "1px solid var(--border)",
              background: "transparent", color: "var(--text-primary)", cursor: "pointer",
            }}>Try again</button>
          </motion.div>
        )}

        {/* Loaded: empty state */}
        {!loading && !error && leads.length === 0 && (
          <EmptyState onAddLead={() => setShowAddLead(true)} />
        )}

        {/* Table — shown when we have leads OR are loading */}
        {(!error && (loading || leads.length > 0)) && (
          <>
            {/* Filters */}
            {!loading && (
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
            )}

            {/* Table */}
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
              {/* Header */}
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

              {/* Loading skeleton */}
              {loading && Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} index={i} />
              ))}

              {/* Rows */}
              {!loading && (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <AnimatePresence mode="popLayout">
                    {filtered.map((lead, index) => {
                      const contact  = contacts[lead.id];
                      const followUp = localFollowUp[lead.id] ?? lead.follow_up_count ?? 0;
                      const tags     = localTags[lead.id] ?? lead.tags ?? [];

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
                            <Link href={`/leads/${lead.id}`} style={{ textDecoration: "none" }}>
                              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", cursor: "pointer" }}
                                onMouseEnter={e => { e.currentTarget.style.color = "var(--gold)"; e.currentTarget.style.textDecoration = "underline"; }}
                                onMouseLeave={e => { e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.textDecoration = "none"; }}
                              >
                                {lead.business_name}
                              </div>
                            </Link>
                            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--text-secondary)" }}>
                              {[lead.city, lead.industry].filter(Boolean).join(" · ")}
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
                              { emoji: "📞", title: "Call",          bg: C.confirmedBg, color: C.confirmed, onClick: () => handleCall(lead, contact) },
                              { emoji: "💬", title: "SMS",           bg: C.newBg,       color: C.new,       onClick: () => setSmsLead(lead) },
                              { emoji: "📅", title: "Schedule task", bg: C.callbackBg,  color: C.callback,  onClick: () => setTaskLead(lead) },
                            ].map(({ emoji, title, bg, color, onClick }) => (
                              <button key={title} title={title} onClick={onClick}
                                style={{
                                  width: 28, height: 28, borderRadius: 7,
                                  border: `1px solid ${bg}`, background: bg, color,
                                  fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center",
                                  transition: "transform 0.12s",
                                }}
                                onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.12)")}
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
                            <button onClick={() => incrementFollowUp(lead.id)} style={{
                              fontFamily: "'DM Mono', monospace", fontSize: 11,
                              color: "var(--gold)", background: "transparent",
                              border: "none", padding: "0 2px", lineHeight: 1,
                            }}>+</button>
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

                  {/* Filter empty state */}
                  {filtered.length === 0 && leads.length > 0 && (
                    <div style={{
                      padding: "40px 20px", textAlign: "center",
                      fontFamily: "'DM Sans', sans-serif", fontSize: 13,
                      color: "var(--text-secondary)",
                    }}>
                      No leads in this stage
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Shell>
  );
}
