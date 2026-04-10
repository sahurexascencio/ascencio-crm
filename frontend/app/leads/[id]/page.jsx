"use client";
import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import Link from "next/link";
import {
  ArrowLeft, PhoneCall, MessageSquare, Pencil, Plus,
  ExternalLink, CheckCircle2, Circle, X, AlertCircle,
  Clock, User, ChevronRight, Globe,
} from "lucide-react";
import Shell from "@/components/Shell";
import {
  leads as leadsApi,
  contacts as contactsApi,
  calls as callsApi,
  intelligence as intelApi,
  tasks as tasksApi,
} from "@/lib/api";

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUS_META = {
  new:         { label: "New",         color: "#3B82F6", bg: "rgba(59,130,246,0.10)"  },
  callback:    { label: "Callback",    color: "#F59E0B", bg: "rgba(245,158,11,0.10)"  },
  confirmed:   { label: "Confirmed",   color: "#10B981", bg: "rgba(16,185,129,0.10)"  },
  dead:        { label: "Dead",        color: "#6B7B8D", bg: "rgba(107,123,141,0.10)" },
  in_progress: { label: "In Progress", color: "#8B5CF6", bg: "rgba(139,92,246,0.10)"  },
};

const CALL_OUTCOMES = {
  completed:   { label: "Completed",   color: "#10B981", bg: "rgba(16,185,129,0.10)"  },
  no_answer:   { label: "No Answer",   color: "#6B7B8D", bg: "rgba(107,123,141,0.10)" },
  callback:    { label: "Callback",    color: "#F59E0B", bg: "rgba(245,158,11,0.10)"  },
  in_progress: { label: "In Progress", color: "#8B5CF6", bg: "rgba(139,92,246,0.10)"  },
  voicemail:   { label: "Voicemail",   color: "#6B7B8D", bg: "rgba(107,123,141,0.10)" },
};

const INDUSTRIES = ["clinic", "dental", "aesthetics", "ecommerce", "other"];

const scoreColor = (n) =>
  n == null ? "var(--text-secondary)" : n >= 70 ? "#10B981" : n >= 40 ? "#F59E0B" : "#EF4444";

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

const fmtDateTime = (d) =>
  d ? new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

const timeAgo = (d) => {
  if (!d) return "";
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

// ── Shared primitives ─────────────────────────────────────────────────────────
function Skel({ w = "100%", h = 13, r = 5, delay = 0 }) {
  return (
    <div className="skeleton-pulse" style={{
      width: w, height: h, borderRadius: r, background: "var(--border)",
      animationDelay: `${delay}s`, flexShrink: 0,
    }} />
  );
}

function SectionCard({ title, icon: Icon, iconColor = "var(--gold)", action, children }) {
  return (
    <div style={{
      background: "var(--bg-card)", border: "1px solid var(--border)",
      borderRadius: 14, overflow: "hidden", marginBottom: 14,
    }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "13px 18px", borderBottom: "1px solid var(--border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon size={13} color={iconColor} strokeWidth={1.8} />
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--text-secondary)", letterSpacing: "0.08em" }}>
            {title}
          </span>
        </div>
        {action}
      </div>
      <div style={{ padding: "16px 18px" }}>
        {children}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.new;
  return (
    <span style={{
      fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 500,
      padding: "3px 10px", borderRadius: 20,
      color: m.color, background: m.bg, border: `1px solid ${m.color}25`,
      display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap",
    }}>
      <span style={{ width: 4, height: 4, borderRadius: "50%", background: m.color }} />
      {m.label}
    </span>
  );
}

function OutcomeBadge({ outcome }) {
  const m = CALL_OUTCOMES[outcome] || { label: outcome || "—", color: "#6B7B8D", bg: "rgba(107,123,141,0.10)" };
  return (
    <span style={{
      fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 500,
      padding: "2px 8px", borderRadius: 20,
      color: m.color, background: m.bg, border: `1px solid ${m.color}22`,
      whiteSpace: "nowrap",
    }}>{m.label}</span>
  );
}

// ── Modal primitives ──────────────────────────────────────────────────────────
function Backdrop({ onClose, children }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}
    >
      {children}
    </motion.div>
  );
}

function ModalCard({ children, width = 480 }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 8 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      style={{
        width: "100%", maxWidth: width,
        background: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: 16, overflow: "hidden", boxShadow: "var(--shadow)",
      }}
    >
      {children}
    </motion.div>
  );
}

const labelStyle = {
  fontFamily: "'DM Mono', monospace", fontSize: 10,
  color: "var(--text-secondary)", letterSpacing: "0.07em",
  display: "block", marginBottom: 6,
};

const inputStyle = {
  width: "100%", padding: "9px 12px", borderRadius: 8,
  background: "var(--bg-secondary)", border: "1px solid var(--border)",
  color: "var(--text-primary)", fontFamily: "'DM Sans', sans-serif",
  fontSize: 13, outline: "none", boxSizing: "border-box",
  transition: "border-color 0.15s",
};

// ── Edit Lead Modal ───────────────────────────────────────────────────────────
function EditLeadModal({ lead, onClose, onSaved }) {
  const [form, setForm] = useState({
    business_name: lead.business_name || "",
    industry:      lead.industry || "",
    city:          lead.city || "",
    country:       lead.country || "",
    website_url:   lead.website_url || "",
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.business_name.trim()) { toast.error("Business name is required"); return; }
    setSaving(true);
    try {
      const result = await leadsApi.update(lead.id, form);
      toast.success("Lead updated");
      onSaved(result);
      onClose();
    } catch (e) {
      toast.error(e.message || "Failed to update lead");
    } finally {
      setSaving(false);
    }
  };

  const focusGold = (e) => (e.target.style.borderColor = "var(--gold)");
  const blurBorder = (e) => (e.target.style.borderColor = "var(--border)");

  return (
    <Backdrop onClose={onClose}>
      <ModalCard>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "17px 22px", borderBottom: "1px solid var(--border)" }}>
          <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Edit Lead</p>
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onClose}
            style={{ background: "none", border: "none", color: "var(--text-secondary)", display: "flex" }}>
            <X size={17} />
          </motion.button>
        </div>

        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={labelStyle}>BUSINESS NAME</label>
            <input value={form.business_name} onChange={set("business_name")} style={inputStyle} onFocus={focusGold} onBlur={blurBorder} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>INDUSTRY</label>
              <select value={form.industry} onChange={set("industry")} style={{ ...inputStyle, appearance: "none", cursor: "pointer" }} onFocus={focusGold} onBlur={blurBorder}>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i.charAt(0).toUpperCase() + i.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>COUNTRY</label>
              <input value={form.country} onChange={set("country")} style={inputStyle} onFocus={focusGold} onBlur={blurBorder} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>CITY</label>
            <input value={form.city} onChange={set("city")} style={inputStyle} onFocus={focusGold} onBlur={blurBorder} />
          </div>
          <div>
            <label style={labelStyle}>WEBSITE URL</label>
            <input value={form.website_url} onChange={set("website_url")} placeholder="https://…" style={inputStyle} onFocus={focusGold} onBlur={blurBorder} />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 22px", borderTop: "1px solid var(--border)" }}>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={onClose}
            style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontFamily: "'DM Sans', sans-serif", fontSize: 13, cursor: "pointer" }}>
            Cancel
          </motion.button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleSave} disabled={saving}
            style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid var(--gold)", background: "var(--gold-dim)", color: "var(--gold)", fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Saving…" : "Save Changes"}
          </motion.button>
        </div>
      </ModalCard>
    </Backdrop>
  );
}

// ── Add Task Modal ────────────────────────────────────────────────────────────
function AddTaskModal({ leadId, onClose, onAdded }) {
  const [title, setTitle]   = useState("");
  const [due, setDue]       = useState("");
  const [notes, setNotes]   = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    setSaving(true);
    try {
      const result = await tasksApi.create({ lead_id: leadId, title: title.trim(), due_date: due || null, notes: notes || null });
      toast.success("Task added");
      onAdded(result);
      onClose();
    } catch (e) {
      toast.error(e.message || "Failed to create task");
    } finally {
      setSaving(false);
    }
  };

  const focusGold = (e) => (e.target.style.borderColor = "var(--gold)");
  const blurBorder = (e) => (e.target.style.borderColor = "var(--border)");

  return (
    <Backdrop onClose={onClose}>
      <ModalCard width={420}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "17px 22px", borderBottom: "1px solid var(--border)" }}>
          <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Add Task</p>
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onClose}
            style={{ background: "none", border: "none", color: "var(--text-secondary)", display: "flex" }}>
            <X size={17} />
          </motion.button>
        </div>
        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={labelStyle}>TITLE</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Send follow-up email" style={inputStyle} onFocus={focusGold} onBlur={blurBorder} />
          </div>
          <div>
            <label style={labelStyle}>DUE DATE</label>
            <input type="datetime-local" value={due} onChange={e => setDue(e.target.value)} style={{ ...inputStyle, fontFamily: "'DM Mono', monospace", fontSize: 12 }} />
          </div>
          <div>
            <label style={labelStyle}>NOTES</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.6 }} onFocus={focusGold} onBlur={blurBorder} />
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 22px", borderTop: "1px solid var(--border)" }}>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={onClose}
            style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontFamily: "'DM Sans', sans-serif", fontSize: 13, cursor: "pointer" }}>
            Cancel
          </motion.button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleSave} disabled={saving}
            style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid var(--gold)", background: "var(--gold-dim)", color: "var(--gold)", fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
            {saving ? "Adding…" : "Add Task"}
          </motion.button>
        </div>
      </ModalCard>
    </Backdrop>
  );
}

// ── Left column sections ──────────────────────────────────────────────────────
function ContactsSection({ contacts, loading }) {
  if (loading) return (
    <SectionCard title="CONTACTS" icon={User}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {[0,1].map(i => (
          <div key={i} style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <Skel w={40} h={40} r={50} delay={i * 0.07} />
            <div style={{ flex: 1 }}>
              <Skel w="55%" h={12} delay={i * 0.07} style={{ marginBottom: 6 }} />
              <Skel w="70%" h={10} delay={i * 0.07 + 0.03} />
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );

  return (
    <SectionCard title="CONTACTS" icon={User}>
      {contacts.length === 0 ? (
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "var(--text-secondary)" }}>No contacts on file</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {contacts.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              style={{
                display: "flex", gap: 12, alignItems: "flex-start",
                padding: "12px 14px", borderRadius: 10,
                background: c.is_primary ? "var(--gold-glow)" : "var(--bg-secondary)",
                border: `1px solid ${c.is_primary ? "var(--gold)" : "var(--border)"}`,
              }}
            >
              {/* Avatar */}
              <div style={{
                width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                background: c.is_primary ? "var(--gold-dim)" : "var(--bg-card)",
                border: `1px solid ${c.is_primary ? "var(--gold)" : "var(--border)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: c.is_primary ? "var(--gold)" : "var(--text-secondary)" }}>
                  {c.name?.[0]?.toUpperCase() || "?"}
                </span>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{c.name}</p>
                  {c.is_primary && (
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, padding: "1px 6px", borderRadius: 4, background: "var(--gold-dim)", color: "var(--gold)", border: "1px solid var(--gold)30" }}>PRIMARY</span>
                  )}
                  {c.role && (
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "var(--text-secondary)" }}>{c.role}</span>
                  )}
                </div>
                {c.phone && (
                  <p style={{ fontFamily: "'Syne', monospace", fontSize: 14, fontWeight: 600, color: c.is_primary ? "var(--gold)" : "var(--text-primary)", marginBottom: 2 }}>{c.phone}</p>
                )}
                {c.email && (
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--text-secondary)" }}>{c.email}</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function CallHistorySection({ calls, loading }) {
  if (loading) return (
    <SectionCard title="CALL HISTORY" icon={PhoneCall} iconColor="#8B5CF6">
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ display: "flex", gap: 10 }}>
            <Skel w={32} h={32} r={50} delay={i * 0.07} />
            <div style={{ flex: 1 }}>
              <Skel w="50%" h={11} delay={i * 0.07} style={{ marginBottom: 5 }} />
              <Skel w="70%" h={10} delay={i * 0.07 + 0.03} />
            </div>
            <Skel w={65} h={20} r={20} delay={i * 0.07} />
          </div>
        ))}
      </div>
    </SectionCard>
  );

  return (
    <SectionCard title="CALL HISTORY" icon={PhoneCall} iconColor="#8B5CF6">
      {calls.length === 0 ? (
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "var(--text-secondary)" }}>No calls logged yet</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {calls.map((call, i) => (
            <motion.div
              key={call.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              style={{
                display: "flex", gap: 10, alignItems: "flex-start",
                padding: "10px 0",
                borderBottom: i < calls.length - 1 ? "1px solid var(--border)" : "none",
              }}
            >
              <div style={{
                width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                background: call.outcome === "completed" ? "rgba(16,185,129,0.1)" : "rgba(107,123,141,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <PhoneCall size={13} color={call.outcome === "completed" ? "#10B981" : "#6B7B8D"} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                  <OutcomeBadge outcome={call.outcome} />
                  {call.duration_seconds != null && (
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 3 }}>
                      <Clock size={9} /> {Math.floor(call.duration_seconds / 60)}m {call.duration_seconds % 60}s
                    </span>
                  )}
                </div>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--text-secondary)", marginBottom: call.notes ? 4 : 0 }}>
                  {fmtDateTime(call.called_at)}
                </p>
                {call.notes && (
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5, fontStyle: "italic" }}>
                    "{call.notes}"
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function NotesSection({ notes, setNotes, onSave }) {
  return (
    <SectionCard title="NOTES" icon={Pencil}>
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Add notes about this lead…"
        rows={5}
        style={{
          width: "100%", background: "var(--bg-secondary)", border: "1px solid var(--border)",
          borderRadius: 8, padding: "10px 12px", color: "var(--text-primary)",
          fontFamily: "'DM Sans', sans-serif", fontSize: 13, resize: "vertical",
          outline: "none", lineHeight: 1.6, boxSizing: "border-box",
        }}
        onFocus={e => (e.target.style.borderColor = "var(--gold)")}
        onBlur={e => { e.target.style.borderColor = "var(--border)"; onSave(notes); }}
      />
    </SectionCard>
  );
}

// ── Right column sections ─────────────────────────────────────────────────────
function IntelSection({ intel, loading }) {
  if (loading) return (
    <SectionCard title="INTEL BRIEF" icon={Globe} iconColor="#3B82F6">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ background: "var(--bg-secondary)", borderRadius: 8, padding: "10px 12px" }}>
            <Skel w="60%" h={9} delay={i * 0.06} style={{ marginBottom: 6 }} />
            <Skel w="40%" h={20} delay={i * 0.06 + 0.03} />
          </div>
        ))}
      </div>
    </SectionCard>
  );

  if (!intel) return (
    <SectionCard title="INTEL BRIEF" icon={Globe} iconColor="#3B82F6">
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "var(--text-secondary)" }}>No intel scraped yet</p>
    </SectionCard>
  );

  const metrics = [
    { label: "Website Score",  value: intel.website_score,           suffix: "",   color: scoreColor(intel.website_score)           },
    { label: "SEO Score",      value: intel.seo_score,               suffix: "",   color: scoreColor(intel.seo_score)               },
    { label: "Social Score",   value: intel.social_engagement_score, suffix: "",   color: scoreColor(intel.social_engagement_score) },
    { label: "Google Rating",  value: intel.google_rating != null ? `${Number(intel.google_rating).toFixed(1)}★` : null, suffix: "", color: "#F59E0B" },
  ].filter(m => m.value != null);

  return (
    <SectionCard title="INTEL BRIEF" icon={Globe} iconColor="#3B82F6">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        {metrics.map(m => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ background: "var(--bg-secondary)", borderRadius: 10, padding: "10px 12px" }}
          >
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "var(--text-secondary)", marginBottom: 4, letterSpacing: "0.07em" }}>
              {m.label.toUpperCase()}
            </p>
            <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, color: m.color }}>
              {m.value}{m.suffix}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Ads + reviews row */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: intel.pain_points?.length ? 14 : 0 }}>
        <span style={{
          fontFamily: "'DM Mono', monospace", fontSize: 10, padding: "3px 10px", borderRadius: 20,
          background: intel.is_running_ads ? "rgba(16,185,129,0.1)" : "rgba(107,123,141,0.1)",
          color: intel.is_running_ads ? "#10B981" : "#6B7B8D",
          border: `1px solid ${intel.is_running_ads ? "rgba(16,185,129,0.25)" : "rgba(107,123,141,0.25)"}`,
        }}>
          {intel.is_running_ads ? "● Ads Running" : "No Ads"}
        </span>
        {intel.google_reviews_count != null && (
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, padding: "3px 10px", borderRadius: 20, background: "rgba(245,158,11,0.1)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.25)" }}>
            {intel.google_reviews_count} Google Reviews
          </span>
        )}
        {intel.has_website != null && (
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, padding: "3px 10px", borderRadius: 20, background: intel.has_website ? "rgba(59,130,246,0.1)" : "rgba(107,123,141,0.1)", color: intel.has_website ? "#3B82F6" : "#6B7B8D", border: `1px solid ${intel.has_website ? "rgba(59,130,246,0.25)" : "rgba(107,123,141,0.25)"}` }}>
            {intel.has_website ? "Has Website" : "No Website"}
          </span>
        )}
      </div>

      {/* Pain points */}
      {intel.pain_points?.length > 0 && (
        <div>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "var(--text-secondary)", marginBottom: 8, letterSpacing: "0.08em" }}>PAIN POINTS</p>
          {intel.pain_points.map((p, i) => (
            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "flex-start" }}>
              <ChevronRight size={11} color="var(--gold)" style={{ marginTop: 2, flexShrink: 0 }} />
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{p}</p>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function TasksSection({ taskList, setTaskList, loading, onAdd }) {
  const handleComplete = async (id) => {
    try {
      await tasksApi.update(id, { completed: true });
      setTaskList(prev => prev.filter(t => t.id !== id));
      toast.success("Task completed");
    } catch {
      toast.error("Failed to complete task");
    }
  };

  if (loading) return (
    <SectionCard title="OPEN TASKS" icon={CheckCircle2} iconColor="#10B981"
      action={<Skel w={70} h={26} r={8} />}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[0,1].map(i => (
          <div key={i} style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Skel w={16} h={16} r={50} delay={i * 0.07} />
            <div style={{ flex: 1 }}>
              <Skel w="65%" h={12} delay={i * 0.07} style={{ marginBottom: 5 }} />
              <Skel w="40%" h={10} delay={i * 0.07 + 0.03} />
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );

  return (
    <SectionCard
      title="OPEN TASKS"
      icon={CheckCircle2}
      iconColor="#10B981"
      action={
        <motion.button
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={onAdd}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            padding: "5px 10px", borderRadius: 7,
            border: "1px solid var(--gold)", background: "var(--gold-dim)",
            color: "var(--gold)", fontFamily: "'DM Sans', sans-serif",
            fontSize: 11, fontWeight: 600, cursor: "pointer",
          }}
        >
          <Plus size={11} strokeWidth={2} /> Add Task
        </motion.button>
      }
    >
      {taskList.length === 0 ? (
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "var(--text-secondary)" }}>No open tasks</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <AnimatePresence>
            {taskList.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: i * 0.04 }}
                style={{
                  display: "flex", alignItems: "flex-start", gap: 10,
                  padding: "9px 0",
                  borderBottom: i < taskList.length - 1 ? "1px solid var(--border)" : "none",
                }}
              >
                <motion.button
                  whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                  onClick={() => handleComplete(t.id)}
                  style={{ background: "transparent", border: "none", padding: 0, color: "var(--text-secondary)", flexShrink: 0, marginTop: 1, display: "flex" }}
                  title="Mark complete"
                >
                  <Circle size={15} strokeWidth={1.5} />
                </motion.button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginBottom: 2 }}>{t.title}</p>
                  {t.due_date && (
                    <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
                      <Clock size={9} /> {fmtDateTime(t.due_date)}
                    </p>
                  )}
                  {t.notes && (
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "var(--text-secondary)", marginTop: 2, lineHeight: 1.4 }}>{t.notes}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </SectionCard>
  );
}

function TimelineSection({ history, loading }) {
  if (loading) return (
    <SectionCard title="STATUS TIMELINE" icon={Clock} iconColor="#F59E0B">
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {[0,1,2].map(i => (
          <div key={i} style={{ display: "flex", gap: 12 }}>
            <Skel w={10} h={10} r={50} delay={i * 0.07} style={{ marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <Skel w="60%" h={11} delay={i * 0.07} style={{ marginBottom: 5 }} />
              <Skel w="40%" h={10} delay={i * 0.07 + 0.03} />
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );

  return (
    <SectionCard title="STATUS TIMELINE" icon={Clock} iconColor="#F59E0B">
      {history.length === 0 ? (
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "var(--text-secondary)" }}>No status changes logged</p>
      ) : (
        <div style={{ position: "relative", paddingLeft: 20 }}>
          {/* Vertical line */}
          <div style={{ position: "absolute", left: 4, top: 6, bottom: 6, width: 1, background: "var(--border)" }} />
          {history.map((h, i) => {
            const toMeta = STATUS_META[h.to_status] || STATUS_META.new;
            return (
              <motion.div
                key={h.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                style={{ position: "relative", marginBottom: i < history.length - 1 ? 18 : 0 }}
              >
                {/* Dot */}
                <div style={{
                  position: "absolute", left: -16, top: 3,
                  width: 9, height: 9, borderRadius: "50%",
                  background: toMeta.color, border: "2px solid var(--bg-card)",
                  boxShadow: `0 0 0 1px ${toMeta.color}`,
                }} />
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "var(--text-primary)", marginBottom: 2 }}>
                  Moved to{" "}
                  <span style={{ fontWeight: 600, color: toMeta.color }}>{toMeta.label}</span>
                  {h.from_status && <span style={{ color: "var(--text-secondary)", fontWeight: 400 }}> from {STATUS_META[h.from_status]?.label || h.from_status}</span>}
                </p>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--text-secondary)", marginBottom: h.notes ? 4 : 0 }}>
                  {fmtDateTime(h.changed_at)} · {timeAgo(h.changed_at)}
                </p>
                {h.notes && (
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.4, fontStyle: "italic" }}>
                    "{h.notes}"
                  </p>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function LeadDetailPage() {
  const { id }   = useParams();
  const router   = useRouter();

  const [lead, setLead]           = useState(null);
  const [contacts, setContacts]   = useState([]);
  const [calls, setCalls]         = useState([]);
  const [history, setHistory]     = useState([]);
  const [intel, setIntel]         = useState(null);
  const [taskList, setTaskList]   = useState([]);
  const [notes, setNotes]         = useState("");

  const [loading, setLoading]         = useState(true);
  const [loadingExtra, setLoadingExtra] = useState(true);
  const [error, setError]             = useState("");

  const [showEdit, setShowEdit]       = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);

  // Load lead
  useEffect(() => {
    if (!id) return;
    leadsApi.get(id)
      .then(data => { setLead(data); setNotes(data.notes || ""); })
      .catch(e => setError(e.message || "Lead not found"))
      .finally(() => setLoading(false));
  }, [id]);

  // Load all related data in parallel
  useEffect(() => {
    if (!id) return;
    setLoadingExtra(true);
    Promise.all([
      contactsApi.forLead(id),
      callsApi.forLead(id),
      leadsApi.history(id),
      tasksApi.forLead(id),
    ])
      .then(([c, cl, h, t]) => {
        setContacts(c || []);
        setCalls(cl || []);
        setHistory(h || []);
        setTaskList((t || []).filter(task => !task.completed));
      })
      .catch(() => {})
      .finally(() => setLoadingExtra(false));

    intelApi.brief(id)
      .then(d => setIntel(d))
      .catch(() => setIntel(null));
  }, [id]);

  const handleSaveNotes = async (text) => {
    if (!lead || text === (lead.notes || "")) return;
    try {
      await leadsApi.update(id, { notes: text });
    } catch {
      toast.error("Failed to save notes");
    }
  };

  if (loading) return (
    <Shell topbarText="Lead Detail">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 8 }}>
          <Skel w={120} h={14} r={5} />
          <Skel w={180} h={32} r={8} style={{ marginLeft: "auto" }} />
        </div>
        <Skel w="50%" h={32} r={8} />
        <div style={{ display: "flex", gap: 8 }}>
          <Skel w={80} h={22} r={20} />
          <Skel w={70} h={22} r={20} />
          <Skel w={90} h={22} r={20} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 12 }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 18px", height: 160 }}>
              <Skel w="40%" h={10} delay={i * 0.07} style={{ marginBottom: 14 }} />
              <Skel w="100%" h={13} delay={i * 0.07 + 0.05} style={{ marginBottom: 8 }} />
              <Skel w="80%" h={13} delay={i * 0.07 + 0.08} />
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );

  if (error) return (
    <Shell topbarText="Lead Detail">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 24px", gap: 14 }}>
        <AlertCircle size={32} color="#EF4444" strokeWidth={1.4} style={{ opacity: 0.6 }} />
        <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>Lead not found</p>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "var(--text-secondary)" }}>{error}</p>
        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => router.push("/pipeline")}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 18px", borderRadius: 9, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontFamily: "'DM Sans', sans-serif", fontSize: 13, cursor: "pointer" }}>
          <ArrowLeft size={14} /> Back to Pipeline
        </motion.button>
      </motion.div>
    </Shell>
  );

  const primaryContact = contacts.find(c => c.is_primary) || contacts[0];

  return (
    <Shell topbarText={lead?.business_name || "Lead Detail"}>
      <div className="fade-up">

        {/* ── Back + actions ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <motion.button
            whileHover={{ x: -3 }} whileTap={{ scale: 0.97 }}
            onClick={() => router.back()}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", color: "var(--text-secondary)", fontFamily: "'DM Sans', sans-serif", fontSize: 12, cursor: "pointer", padding: 0 }}
          >
            <ArrowLeft size={14} strokeWidth={1.8} /> Back
          </motion.button>

          <div style={{ display: "flex", gap: 8 }}>
            {[
              { icon: PhoneCall,    label: "Call Now",  color: "#10B981", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.3)", onClick: () => router.push("/call-mode") },
              { icon: MessageSquare,label: "Send SMS",  color: "#3B82F6", bg: "rgba(59,130,246,0.08)", border: "rgba(59,130,246,0.3)", onClick: () => toast.info("Go to Call Mode to send SMS") },
              { icon: Pencil,       label: "Edit Lead", color: "var(--gold)", bg: "var(--gold-dim)", border: "var(--gold)", onClick: () => setShowEdit(true) },
              { icon: Plus,         label: "Add Task",  color: "var(--text-secondary)", bg: "transparent", border: "var(--border)", onClick: () => setShowAddTask(true) },
            ].map(({ icon: Icon, label, color, bg, border, onClick }) => (
              <motion.button key={label}
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={onClick}
                style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 14px", borderRadius: 9, border: `1px solid ${border}`, background: bg, color, fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap" }}>
                <Icon size={13} strokeWidth={1.8} />
                {label}
              </motion.button>
            ))}
          </div>
        </div>

        {/* ── Lead header ── */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 16, padding: "22px 24px", marginBottom: 20 }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
            <div>
              <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 800, color: "var(--text-primary)", marginBottom: 10, letterSpacing: "-0.02em" }}>
                {lead.business_name}
              </h1>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                {lead.industry && (
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, padding: "3px 10px", borderRadius: 5, background: "var(--gold-dim)", color: "var(--gold)", border: "1px solid var(--gold)30" }}>
                    {lead.industry}
                  </span>
                )}
                {lead.city && (
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, padding: "3px 10px", borderRadius: 5, background: "var(--bg-secondary)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                    {lead.city}{lead.country ? `, ${lead.country}` : ""}
                  </span>
                )}
                <StatusBadge status={lead.status} />
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
              {lead.website_url && (
                <a href={lead.website_url} target="_blank" rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 5, fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--gold)", textDecoration: "none" }}>
                  <ExternalLink size={11} />
                  {lead.website_url.replace(/^https?:\/\//, "").slice(0, 40)}
                </a>
              )}
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--text-secondary)" }}>
                Added {fmtDate(lead.created_at)}
              </p>
            </div>
          </div>
        </motion.div>

        {/* ── Two-column layout ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
          {/* Left */}
          <div>
            <ContactsSection contacts={contacts} loading={loadingExtra} />
            <CallHistorySection calls={calls} loading={loadingExtra} />
            <NotesSection notes={notes} setNotes={setNotes} onSave={handleSaveNotes} />
          </div>

          {/* Right */}
          <div>
            <IntelSection intel={intel} loading={!intel && loadingExtra} />
            <TasksSection taskList={taskList} setTaskList={setTaskList} loading={loadingExtra} onAdd={() => setShowAddTask(true)} />
            <TimelineSection history={history} loading={loadingExtra} />
          </div>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showEdit && (
          <EditLeadModal
            key="edit"
            lead={lead}
            onClose={() => setShowEdit(false)}
            onSaved={(updated) => setLead(updated)}
          />
        )}
        {showAddTask && (
          <AddTaskModal
            key="add-task"
            leadId={id}
            onClose={() => setShowAddTask(false)}
            onAdded={(task) => setTaskList(prev => [task, ...prev])}
          />
        )}
      </AnimatePresence>
    </Shell>
  );
}
