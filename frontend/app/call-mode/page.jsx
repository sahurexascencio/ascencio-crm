"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  PhoneCall, PhoneOff, PhoneIncoming, PhoneMissed,
  ChevronDown, ExternalLink,
  CheckCircle2, Calendar, Mail, XCircle,
  ArrowRight, Minimize2, Maximize2, X, Plus,
  Zap, Search, Loader2,
} from "lucide-react";
import Shell from "@/components/Shell";
import {
  leads as leadsApi,
  contacts as contactsApi,
  calls as callsApi,
  intelligence as intelApi,
  templates as templatesApi,
  tasks as tasksApi,
  messages as messagesApi,
} from "@/lib/api";

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUS_META = {
  new:         { label: "New",         color: "#3B82F6", bg: "rgba(59,130,246,0.10)"  },
  callback:    { label: "Callback",    color: "#F59E0B", bg: "rgba(245,158,11,0.10)"  },
  confirmed:   { label: "Confirmed",   color: "#10B981", bg: "rgba(16,185,129,0.10)"  },
  dead:        { label: "Dead",        color: "#6B7B8D", bg: "rgba(107,123,141,0.10)" },
  in_progress: { label: "In Progress", color: "#8B5CF6", bg: "rgba(139,92,246,0.10)"  },
};

const OUTCOMES = [
  { key: "confirmed",   label: "Interested",   icon: CheckCircle2,  color: "#10B981", bg: "rgba(16,185,129,0.10)",  border: "rgba(16,185,129,0.3)"  },
  { key: "callback",    label: "Callback",     icon: Calendar,      color: "#3B82F6", bg: "rgba(59,130,246,0.10)",  border: "rgba(59,130,246,0.3)"  },
  { key: "in_progress", label: "In Progress",  icon: Mail,          color: "#F59E0B", bg: "rgba(245,158,11,0.10)",  border: "rgba(245,158,11,0.3)"  },
  { key: "dead",        label: "Dead",         icon: XCircle,       color: "#EF4444", bg: "rgba(239,68,68,0.10)",   border: "rgba(239,68,68,0.3)"   },
  { key: "no_answer",   label: "No Answer",    icon: PhoneMissed,   color: "#6B7B8D", bg: "rgba(107,123,141,0.10)", border: "rgba(107,123,141,0.3)" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (s) =>
  `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";

const scoreColor = (n) => n == null ? "var(--text-secondary)" : n >= 70 ? "#10B981" : n >= 40 ? "#F59E0B" : "#EF4444";

// ── Tiny shared components ────────────────────────────────────────────────────
function Skel({ w = "100%", h = 13, r = 5, delay = 0 }) {
  return (
    <div className="skeleton-pulse" style={{
      width: w, height: h, borderRadius: r, background: "var(--border)",
      animationDelay: `${delay}s`, flexShrink: 0,
    }} />
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

function PanelCard({ children, style = {} }) {
  return (
    <div style={{
      background: "var(--bg-card)", border: "1px solid var(--border)",
      borderRadius: 12, ...style,
    }}>
      {children}
    </div>
  );
}

function PanelLabel({ children }) {
  return (
    <p style={{
      fontFamily: "'DM Mono', monospace", fontSize: 9,
      color: "var(--text-secondary)", letterSpacing: "0.1em", marginBottom: 10,
    }}>{children}</p>
  );
}

// ── Lead Selector ─────────────────────────────────────────────────────────────
function LeadSelector({ leads, selectedIdx, onChange }) {
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState("");
  const ref                   = useRef(null);
  const selected              = leads[selectedIdx];

  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const filtered = leads.filter(l =>
    l.business_name?.toLowerCase().includes(query.toLowerCase()) ||
    l.city?.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <motion.button
        whileHover={{ borderColor: "var(--gold)" }}
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10,
          padding: "10px 14px", borderRadius: 10,
          background: "var(--bg-secondary)", border: "1px solid var(--border)",
          cursor: "pointer", transition: "border-color 0.15s",
        }}
      >
        <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
          {selected ? (
            <>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {selected.business_name}
              </p>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--text-secondary)" }}>
                {selected.city || "No city"} · {STATUS_META[selected.status]?.label}
              </p>
            </>
          ) : (
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "var(--text-secondary)" }}>Select a lead…</p>
          )}
        </div>
        <ChevronDown size={14} color="var(--text-secondary)" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s", flexShrink: 0 }} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scaleY: 0.95 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -4, scaleY: 0.97 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 30,
              background: "var(--bg-card)", border: "1px solid var(--border)",
              borderRadius: 10, boxShadow: "0 12px 40px rgba(0,0,0,0.35)",
              maxHeight: 280, overflow: "hidden", display: "flex", flexDirection: "column",
            }}
          >
            <div style={{ padding: "8px 10px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 7 }}>
              <Search size={12} color="var(--text-secondary)" />
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search leads…"
                style={{
                  flex: 1, background: "transparent", border: "none", outline: "none",
                  fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "var(--text-primary)",
                }}
              />
            </div>
            <div style={{ overflowY: "auto", padding: "6px" }}>
              {filtered.length === 0 ? (
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "var(--text-secondary)", padding: "12px 10px", textAlign: "center" }}>
                  No leads found
                </p>
              ) : filtered.map((l) => {
                const realIdx = leads.indexOf(l);
                const active = realIdx === selectedIdx;
                const m = STATUS_META[l.status] || STATUS_META.new;
                return (
                  <motion.button
                    key={l.id}
                    whileHover={{ background: "var(--bg-secondary)" }}
                    onClick={() => { onChange(realIdx); setOpen(false); setQuery(""); }}
                    style={{
                      width: "100%", display: "flex", alignItems: "center", gap: 10,
                      padding: "8px 10px", borderRadius: 7,
                      background: active ? "var(--gold-dim)" : "transparent",
                      border: `1px solid ${active ? "var(--gold)" : "transparent"}`,
                      cursor: "pointer", textAlign: "left",
                    }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: m.color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 500, color: active ? "var(--gold)" : "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {l.business_name}
                      </p>
                      <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--text-secondary)" }}>
                        {l.city || "—"}
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── SMS Modal ─────────────────────────────────────────────────────────────────
function SmsModal({ template, lead, contact, onClose }) {
  const [body, setBody]       = useState(template?.body || "");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!contact?.phone) { toast.error("No phone number on file"); return; }
    if (!body.trim()) { toast.error("Message cannot be empty"); return; }
    setSending(true);
    try {
      await messagesApi.sendSMS({ lead_id: lead.id, contact_id: contact.id, body: body.trim() });
      toast.success("SMS sent!");
      onClose();
    } catch (e) {
      toast.error(e.message || "Failed to send SMS");
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        style={{
          width: "100%", maxWidth: 480,
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: 16, overflow: "hidden", boxShadow: "var(--shadow)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <div>
            <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Send SMS</p>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--text-secondary)", marginTop: 2 }}>
              To: {contact?.name || "Contact"} · {contact?.phone || "No phone"}
            </p>
          </div>
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={onClose}
            style={{ background: "none", border: "none", color: "var(--text-secondary)", display: "flex" }}>
            <X size={16} />
          </motion.button>
        </div>
        <div style={{ padding: "16px 20px" }}>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            rows={5}
            style={{
              width: "100%", padding: "10px 12px", borderRadius: 8,
              border: "1px solid var(--border)", background: "var(--bg-secondary)",
              color: "var(--text-primary)", fontFamily: "'DM Sans', sans-serif",
              fontSize: 13, resize: "vertical", outline: "none", lineHeight: 1.6,
              boxSizing: "border-box",
            }}
            onFocus={e => (e.target.style.borderColor = "var(--gold)")}
            onBlur={e => (e.target.style.borderColor = "var(--border)")}
          />
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--text-secondary)", marginTop: 5, textAlign: "right" }}>
            {body.length} chars
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, padding: "12px 20px", borderTop: "1px solid var(--border)" }}>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={onClose}
            style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", fontFamily: "'DM Sans', sans-serif", fontSize: 13, cursor: "pointer" }}>
            Cancel
          </motion.button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={handleSend} disabled={sending}
            style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "1px solid var(--gold)", background: "var(--gold-dim)", color: "var(--gold)", fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, cursor: sending ? "not-allowed" : "pointer", opacity: sending ? 0.7 : 1 }}>
            {sending ? "Sending…" : "Send SMS"}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Minimized Bar ─────────────────────────────────────────────────────────────
function MinimizedBar({ lead, contact, callState, callSeconds, onExpand, onStartCall, onEndCall }) {
  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 35 }}
      style={{
        position: "fixed", bottom: 0, left: "236px", right: 0, zIndex: 100,
        background: "var(--bg-secondary)", borderTop: "1px solid var(--border)",
        padding: "10px 24px", display: "flex", alignItems: "center", gap: 16,
        boxShadow: "0 -8px 32px rgba(0,0,0,0.25)",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {lead?.business_name || "No lead selected"}
        </p>
        <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--text-secondary)" }}>
          {contact?.phone || "No contact"}
          {callState === "calling" && <span style={{ color: "var(--gold)", marginLeft: 10 }}>● {fmt(callSeconds)}</span>}
        </p>
      </div>

      {callState === "idle" && (
        <motion.button
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
          onClick={onStartCall}
          disabled={!contact?.phone}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 18px", borderRadius: 9,
            border: "1px solid var(--gold)", background: "var(--gold-dim)",
            color: "var(--gold)", fontFamily: "'DM Sans', sans-serif",
            fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}
        >
          <PhoneCall size={13} /> Start Call
        </motion.button>
      )}
      {callState === "calling" && (
        <motion.button
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
          onClick={onEndCall}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 18px", borderRadius: 9,
            border: "1px solid rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.08)",
            color: "#EF4444", fontFamily: "'DM Sans', sans-serif",
            fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}
        >
          <PhoneOff size={13} /> End Call
        </motion.button>
      )}

      <motion.button
        whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
        onClick={onExpand}
        style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 8, padding: "7px", display: "flex", color: "var(--text-secondary)" }}
        title="Expand"
      >
        <Maximize2 size={14} />
      </motion.button>
    </motion.div>
  );
}

// ── Left Panel ────────────────────────────────────────────────────────────────
function LeftPanel({ lead, contact, callHistory, notes, setNotes, loadingLead, onSaveNotes }) {
  const handleBlur = () => {
    if (notes !== (lead?.notes || "")) onSaveNotes(notes);
  };

  if (loadingLead) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {[80, 60, 100, 80, 60].map((w, i) => (
          <PanelCard key={i} style={{ padding: "14px 16px" }}>
            <Skel w={`${w}%`} h={14} delay={i * 0.07} />
          </PanelCard>
        ))}
      </div>
    );
  }

  if (!lead) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 10 }}>
        <PhoneIncoming size={28} color="var(--text-secondary)" strokeWidth={1.4} style={{ opacity: 0.3 }} />
        <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "var(--text-secondary)" }}>Select a lead to begin</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Business info */}
      <PanelCard style={{ padding: "14px 16px" }}>
        <PanelLabel>BUSINESS</PanelLabel>
        <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6, lineHeight: 1.3 }}>
          {lead.business_name}
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          {lead.industry && (
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, padding: "2px 8px", borderRadius: 5, background: "var(--gold-dim)", color: "var(--gold)", border: "1px solid var(--gold)30" }}>
              {lead.industry}
            </span>
          )}
          {lead.city && (
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, padding: "2px 8px", borderRadius: 5, background: "var(--bg-secondary)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
              {lead.city}{lead.country ? `, ${lead.country}` : ""}
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <StatusBadge status={lead.status} />
          {lead.last_contacted_at && (
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--text-secondary)" }}>
              Last call {fmtDate(lead.last_contacted_at)}
            </span>
          )}
        </div>
        {lead.website_url && (
          <a href={lead.website_url} target="_blank" rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 8, fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--gold)", textDecoration: "none" }}>
            <ExternalLink size={10} />
            {lead.website_url.replace(/^https?:\/\//, "").slice(0, 36)}
          </a>
        )}
      </PanelCard>

      {/* Contact */}
      <PanelCard style={{ padding: "14px 16px" }}>
        <PanelLabel>PRIMARY CONTACT</PanelLabel>
        {contact ? (
          <>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
              {contact.name}
            </p>
            <p style={{ fontFamily: "'Syne', monospace", fontSize: 20, fontWeight: 700, color: "var(--gold)", letterSpacing: "0.04em", marginBottom: 4 }}>
              {contact.phone || "No phone"}
            </p>
            {contact.email && (
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--text-secondary)" }}>
                {contact.email}
              </p>
            )}
          </>
        ) : (
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "var(--text-secondary)" }}>No contact on file</p>
        )}
      </PanelCard>

      {/* Call history */}
      <PanelCard style={{ padding: "14px 16px" }}>
        <PanelLabel>CALL HISTORY</PanelLabel>
        {callHistory.length === 0 ? (
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "var(--text-secondary)" }}>No previous calls</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {callHistory.slice(0, 3).map((call, i) => (
              <div key={call.id} style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: i < callHistory.length - 1 ? 8 : 0, borderBottom: i < Math.min(callHistory.length, 3) - 1 ? "1px solid var(--border)" : "none" }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: call.outcome === "completed" ? "rgba(16,185,129,0.1)" : "rgba(107,123,141,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <PhoneCall size={12} color={call.outcome === "completed" ? "#10B981" : "#6B7B8D"} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 500, color: "var(--text-primary)", textTransform: "capitalize" }}>
                    {call.outcome?.replace("_", " ") || "—"}
                  </p>
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--text-secondary)" }}>
                    {fmtDate(call.called_at)} {call.duration_seconds ? `· ${Math.round(call.duration_seconds / 60)}m` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </PanelCard>

      {/* Notes */}
      <PanelCard style={{ padding: "14px 16px" }}>
        <PanelLabel>NOTES</PanelLabel>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Add notes about this lead…"
          rows={4}
          style={{
            width: "100%", background: "var(--bg-secondary)", border: "1px solid var(--border)",
            borderRadius: 8, padding: "8px 10px", color: "var(--text-primary)",
            fontFamily: "'DM Sans', sans-serif", fontSize: 12, resize: "vertical",
            outline: "none", lineHeight: 1.6, boxSizing: "border-box",
          }}
          onFocus={e => (e.target.style.borderColor = "var(--gold)")}
          onBlur={e => { e.target.style.borderColor = "var(--border)"; handleBlur(); }}
        />
      </PanelCard>
    </div>
  );
}

// ── Center Panel ──────────────────────────────────────────────────────────────
function CenterPanel({ lead, contact, callState, callSeconds, onStartCall, onEndCall, onOutcome, onNextLead, isLastLead, starting }) {
  const [showCallbackInput, setShowCallbackInput] = useState(false);
  const [callbackDt, setCallbackDt]               = useState("");
  const [pendingOutcome, setPendingOutcome]        = useState(false);

  const handleOutcomeClick = async (outcome) => {
    if (outcome.key === "callback") {
      setShowCallbackInput(true);
      return;
    }
    setPendingOutcome(outcome.key);
    await onOutcome(outcome.key);
    setPendingOutcome(null);
  };

  const handleCallbackConfirm = async () => {
    setPendingOutcome("callback");
    await onOutcome("callback", callbackDt);
    setPendingOutcome(null);
    setShowCallbackInput(false);
    setCallbackDt("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 28, padding: "0 20px" }}>

      {/* Lead name echo */}
      {lead && (
        <div style={{ textAlign: "center" }}>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "var(--text-secondary)", letterSpacing: "0.12em", marginBottom: 6 }}>NOW CALLING</p>
          <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>{lead.business_name}</p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "var(--text-secondary)", marginTop: 3 }}>
            {contact?.name || "No contact"} · {contact?.phone || "—"}
          </p>
        </div>
      )}

      {/* ── IDLE: big start call button ── */}
      <AnimatePresence mode="wait">
        {callState === "idle" && (
          <motion.div key="idle" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onStartCall}
              disabled={!contact?.phone || starting}
              style={{
                width: 100, height: 100, borderRadius: "50%",
                background: !contact?.phone ? "var(--border)" : "var(--gold-dim)",
                border: `2px solid ${!contact?.phone ? "var(--border)" : "var(--gold)"}`,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                cursor: !contact?.phone ? "not-allowed" : "pointer",
                boxShadow: contact?.phone ? "0 0 0 8px var(--gold-glow), 0 0 0 16px var(--gold-glow)" : "none",
                transition: "box-shadow 0.3s",
              }}
            >
              {starting
                ? <Loader2 size={28} color="var(--gold)" style={{ animation: "spin 1s linear infinite" }} />
                : <PhoneCall size={28} color={contact?.phone ? "var(--gold)" : "var(--text-secondary)"} strokeWidth={1.8} />
              }
            </motion.button>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "var(--text-secondary)" }}>
              {!contact?.phone ? "No phone number on file" : "Start Call"}
            </p>
          </motion.div>
        )}

        {/* ── CALLING: timer + end call ── */}
        {callState === "calling" && (
          <motion.div key="calling" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
            {/* Pulsing ring */}
            <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <motion.div
                animate={{ scale: [1, 1.25, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                style={{ position: "absolute", width: 100, height: 100, borderRadius: "50%", border: "2px solid var(--gold)", pointerEvents: "none" }}
              />
              <div style={{ width: 76, height: 76, borderRadius: "50%", background: "rgba(16,185,129,0.1)", border: "2px solid #10B981", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <PhoneCall size={28} color="#10B981" strokeWidth={1.8} />
              </div>
            </div>

            <div style={{ textAlign: "center" }}>
              <p style={{ fontFamily: "'Syne', monospace", fontSize: 32, fontWeight: 700, color: "var(--gold)", letterSpacing: "0.06em" }}>
                {fmt(callSeconds)}
              </p>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#10B981", letterSpacing: "0.1em", marginTop: 4 }}>
                ● CONNECTED
              </p>
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={onEndCall}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "12px 28px", borderRadius: 50,
                border: "1px solid rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.08)",
                color: "#EF4444", fontFamily: "'DM Sans', sans-serif",
                fontSize: 14, fontWeight: 600, cursor: "pointer",
              }}
            >
              <PhoneOff size={16} strokeWidth={2} />
              End Call
            </motion.button>
          </motion.div>
        )}

        {/* ── POST-CALL: outcome buttons ── */}
        {callState === "post-call" && (
          <motion.div key="post-call" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "var(--text-secondary)", letterSpacing: "0.12em", textAlign: "center", marginBottom: 4 }}>CALL OUTCOME</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {OUTCOMES.map(o => {
                const Icon = o.icon;
                const isCallback = o.key === "callback";
                return (
                  <div key={o.key}>
                    <motion.button
                      whileHover={{ scale: 1.02, x: 3 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleOutcomeClick(o)}
                      disabled={pendingOutcome !== null}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 12,
                        padding: "11px 16px", borderRadius: 10,
                        border: `1px solid ${o.border}`, background: isCallback && showCallbackInput ? o.bg : "transparent",
                        color: o.color, cursor: pendingOutcome !== null ? "not-allowed" : "pointer",
                        fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500,
                        opacity: pendingOutcome && pendingOutcome !== o.key ? 0.4 : 1,
                        transition: "background 0.15s, opacity 0.15s",
                      }}
                    >
                      {pendingOutcome === o.key
                        ? <Loader2 size={15} style={{ animation: "spin 1s linear infinite" }} />
                        : <Icon size={15} strokeWidth={1.8} />
                      }
                      {o.label}
                    </motion.button>

                    {/* Inline callback date picker */}
                    <AnimatePresence>
                      {isCallback && showCallbackInput && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          style={{ overflow: "hidden" }}
                        >
                          <div style={{ padding: "10px 12px", background: "rgba(59,130,246,0.05)", borderRadius: "0 0 10px 10px", border: "1px solid rgba(59,130,246,0.2)", borderTop: "none", display: "flex", gap: 8 }}>
                            <input
                              type="datetime-local"
                              value={callbackDt}
                              onChange={e => setCallbackDt(e.target.value)}
                              style={{
                                flex: 1, padding: "7px 10px", borderRadius: 7,
                                border: "1px solid var(--border)", background: "var(--bg-secondary)",
                                color: "var(--text-primary)", fontFamily: "'DM Mono', monospace",
                                fontSize: 11, outline: "none",
                              }}
                            />
                            <motion.button
                              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                              onClick={handleCallbackConfirm}
                              disabled={!callbackDt || pendingOutcome !== null}
                              style={{
                                padding: "7px 14px", borderRadius: 7,
                                border: "1px solid rgba(59,130,246,0.4)", background: "rgba(59,130,246,0.1)",
                                color: "#3B82F6", fontFamily: "'DM Sans', sans-serif",
                                fontSize: 12, fontWeight: 600, cursor: !callbackDt ? "not-allowed" : "pointer",
                              }}
                            >
                              Set
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                              onClick={() => setShowCallbackInput(false)}
                              style={{ padding: "7px", borderRadius: 7, border: "1px solid var(--border)", background: "transparent", color: "var(--text-secondary)", display: "flex" }}
                            >
                              <X size={13} />
                            </motion.button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Next lead button */}
      {(callState === "idle" || callState === "post-call") && lead && (
        <motion.button
          whileHover={{ scale: 1.03, x: 2 }}
          whileTap={{ scale: 0.97 }}
          onClick={onNextLead}
          style={{
            display: "flex", alignItems: "center", gap: 8,
            padding: "8px 18px", borderRadius: 9,
            border: "1px solid var(--border)", background: "transparent",
            color: "var(--text-secondary)", fontFamily: "'DM Sans', sans-serif",
            fontSize: 12, cursor: "pointer",
          }}
        >
          {isLastLead ? "No more leads" : "Next Lead"}
          {!isLastLead && <ArrowRight size={13} strokeWidth={1.8} />}
        </motion.button>
      )}
    </div>
  );
}

// ── Right Panel ───────────────────────────────────────────────────────────────
function RightPanel({ lead, intel, templateList, loadingIntel, onSendSms }) {
  const [taskTitle, setTaskTitle]   = useState("");
  const [taskDue, setTaskDue]       = useState("");
  const [savingTask, setSavingTask] = useState(false);

  const handleSaveTask = async () => {
    if (!taskTitle.trim()) { toast.error("Task title required"); return; }
    if (!lead) { toast.error("No lead selected"); return; }
    setSavingTask(true);
    try {
      await tasksApi.create({ lead_id: lead.id, title: taskTitle.trim(), due_date: taskDue || null });
      toast.success("Task created");
      setTaskTitle(""); setTaskDue("");
    } catch (e) {
      toast.error(e.message || "Failed to create task");
    } finally {
      setSavingTask(false);
    }
  };

  const scores = intel ? [
    { label: "Website",  value: intel.website_score,           suffix: "",   isNum: true },
    { label: "SEO",      value: intel.seo_score,               suffix: "",   isNum: true },
    { label: "Social",   value: intel.social_engagement_score, suffix: "",   isNum: true },
    { label: "Rating",   value: intel.google_rating != null ? intel.google_rating.toFixed(1) : null, suffix: "★", isNum: false, color: "#F59E0B" },
  ] : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Intel brief */}
      <PanelCard style={{ padding: "14px 16px" }}>
        <PanelLabel>INTEL BRIEF</PanelLabel>
        {loadingIntel ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[70, 50, 60, 40].map((w, i) => <Skel key={i} w={`${w}%`} h={12} delay={i * 0.07} />)}
          </div>
        ) : !intel ? (
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "var(--text-secondary)" }}>No intel available</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {/* Score grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 6 }}>
              {scores.map(s => s.value != null && (
                <div key={s.label} style={{ background: "var(--bg-secondary)", borderRadius: 8, padding: "8px 10px" }}>
                  <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "var(--text-secondary)", marginBottom: 3 }}>{s.label.toUpperCase()}</p>
                  <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, color: s.color || scoreColor(s.isNum ? Number(s.value) : null) }}>
                    {s.value}{s.suffix}
                  </p>
                </div>
              ))}
            </div>
            {/* Ads + reviews */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, padding: "2px 8px", borderRadius: 20, background: intel.is_running_ads ? "rgba(16,185,129,0.1)" : "rgba(107,123,141,0.1)", color: intel.is_running_ads ? "#10B981" : "#6B7B8D", border: `1px solid ${intel.is_running_ads ? "rgba(16,185,129,0.2)" : "rgba(107,123,141,0.2)"}` }}>
                {intel.is_running_ads ? "Ads running" : "No ads"}
              </span>
              {intel.google_reviews_count != null && (
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, padding: "2px 8px", borderRadius: 20, background: "rgba(245,158,11,0.1)", color: "#F59E0B", border: "1px solid rgba(245,158,11,0.2)" }}>
                  {intel.google_reviews_count} reviews
                </span>
              )}
            </div>
            {/* Pain points */}
            {intel.pain_points?.length > 0 && (
              <div style={{ marginTop: 6 }}>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "var(--text-secondary)", marginBottom: 6 }}>PAIN POINTS</p>
                {intel.pain_points.slice(0, 3).map((p, i) => (
                  <div key={i} style={{ display: "flex", gap: 6, marginBottom: 4, alignItems: "flex-start" }}>
                    <Zap size={9} color="var(--gold)" style={{ marginTop: 2, flexShrink: 0 }} />
                    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.4 }}>{p}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </PanelCard>

      {/* SMS Templates */}
      <PanelCard style={{ padding: "14px 16px" }}>
        <PanelLabel>SMS TEMPLATES</PanelLabel>
        {templateList.length === 0 ? (
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "var(--text-secondary)" }}>No templates saved</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 180, overflowY: "auto" }}>
            {templateList.map(t => (
              <motion.button
                key={t.id}
                whileHover={{ borderColor: "var(--gold)", background: "var(--gold-dim)" }}
                onClick={() => onSendSms(t)}
                style={{
                  textAlign: "left", padding: "8px 10px", borderRadius: 8,
                  border: "1px solid var(--border)", background: "transparent",
                  cursor: "pointer", transition: "all 0.15s",
                }}
              >
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, color: "var(--text-primary)", marginBottom: 3 }}>
                  {t.name}
                </p>
                <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: "var(--text-secondary)", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" }}>
                  {t.body}
                </p>
              </motion.button>
            ))}
          </div>
        )}
      </PanelCard>

      {/* Quick task creator */}
      <PanelCard style={{ padding: "14px 16px" }}>
        <PanelLabel>QUICK TASK</PanelLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <input
            value={taskTitle}
            onChange={e => setTaskTitle(e.target.value)}
            placeholder="Task title…"
            style={{
              width: "100%", padding: "8px 10px", borderRadius: 8,
              border: "1px solid var(--border)", background: "var(--bg-secondary)",
              color: "var(--text-primary)", fontFamily: "'DM Sans', sans-serif",
              fontSize: 12, outline: "none", boxSizing: "border-box",
            }}
            onFocus={e => (e.target.style.borderColor = "var(--gold)")}
            onBlur={e => (e.target.style.borderColor = "var(--border)")}
          />
          <input
            type="datetime-local"
            value={taskDue}
            onChange={e => setTaskDue(e.target.value)}
            style={{
              width: "100%", padding: "8px 10px", borderRadius: 8,
              border: "1px solid var(--border)", background: "var(--bg-secondary)",
              color: "var(--text-primary)", fontFamily: "'DM Mono', monospace",
              fontSize: 11, outline: "none", boxSizing: "border-box",
            }}
          />
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={handleSaveTask} disabled={savingTask || !lead}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              padding: "8px 0", borderRadius: 8,
              border: "1px solid var(--border)", background: "transparent",
              color: "var(--text-secondary)", fontFamily: "'DM Sans', sans-serif",
              fontSize: 12, fontWeight: 500, cursor: "pointer",
              opacity: !lead ? 0.5 : 1,
            }}
          >
            <Plus size={13} strokeWidth={2} />
            {savingTask ? "Saving…" : "Add Task"}
          </motion.button>
        </div>
      </PanelCard>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function CallModePage() {
  const router = useRouter();

  // Data
  const [leads, setLeads]           = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [contact, setContact]       = useState(null);
  const [callHistory, setCallHistory] = useState([]);
  const [intel, setIntel]           = useState(null);
  const [templateList, setTemplates] = useState([]);
  const [notes, setNotes]           = useState("");

  // Loading states
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [loadingLead, setLoadingLead]   = useState(false);
  const [loadingIntel, setLoadingIntel] = useState(false);

  // Call state
  const [callState, setCallState]     = useState("idle");
  const [callSeconds, setCallSeconds] = useState(0);
  const [_activeCallId, setActiveCallId] = useState(null);
  const [starting, setStarting]       = useState(false);
  const timerRef = useRef(null);

  // UI state
  const [minimized, setMinimized]   = useState(false);
  const [smsTemplate, setSmsTemplate] = useState(null);

  const selectedLead = leads[selectedIdx] || null;

  // Load leads + templates on mount
  useEffect(() => {
    Promise.all([leadsApi.list(), templatesApi.list()])
      .then(([l, t]) => { setLeads(l || []); setTemplates(t || []); })
      .catch(e => toast.error("Failed to load: " + e.message))
      .finally(() => setLoadingLeads(false));
  }, []);

  // Load per-lead data when selection changes
  useEffect(() => {
    if (!selectedLead) return;
    setContact(null);
    setCallHistory([]);
    setIntel(null);
    setNotes(selectedLead.notes || "");
    setCallState("idle");
    stopTimer();

    setLoadingLead(true);
    setLoadingIntel(true);

    Promise.all([
      contactsApi.forLead(selectedLead.id),
      callsApi.forLead(selectedLead.id),
    ])
      .then(([contacts, calls]) => {
        const primary = contacts?.find(c => c.is_primary) || contacts?.[0] || null;
        setContact(primary);
        setCallHistory(calls || []);
      })
      .catch(() => {})
      .finally(() => setLoadingLead(false));

    intelApi.brief(selectedLead.id)
      .then(d => setIntel(d))
      .catch(() => setIntel(null))
      .finally(() => setLoadingIntel(false));
  }, [selectedLead?.id]);

  // Timer helpers
  const startTimer = () => {
    setCallSeconds(0);
    timerRef.current = setInterval(() => setCallSeconds(s => s + 1), 1000);
  };
  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };
  useEffect(() => () => stopTimer(), []);

  const handleStartCall = async () => {
    if (!selectedLead || !contact?.phone) {
      toast.error("No phone number on file");
      return;
    }
    setStarting(true);
    try {
      const call = await callsApi.initiate({ lead_id: selectedLead.id, contact_id: contact.id });
      setActiveCallId(call?.id || null);
      setCallState("calling");
      startTimer();
    } catch (e) {
      // Twilio may not be configured in dev — still enter calling state
      toast.error(e.message || "Could not initiate call");
      setCallState("calling");
      startTimer();
    } finally {
      setStarting(false);
    }
  };

  const handleEndCall = () => {
    stopTimer();
    setCallState("post-call");
  };

  const handleOutcome = async (status, callbackDt = null) => {
    if (!selectedLead) return;
    try {
      const notes = callbackDt ? `Callback scheduled for ${callbackDt}` : undefined;
      if (status !== "no_answer") {
        await leadsApi.updateStatus(selectedLead.id, status, notes);
        setLeads(prev => prev.map(l => l.id === selectedLead.id ? { ...l, status } : l));
      }
      // Create callback task if date provided
      if (status === "callback" && callbackDt) {
        await tasksApi.create({
          lead_id: selectedLead.id,
          title: `Callback: ${selectedLead.business_name}`,
          due_date: callbackDt,
        }).catch(() => {});
      }
      toast.success(status === "no_answer" ? "Logged as no answer" : `Lead marked as ${STATUS_META[status]?.label || status}`);
    } catch (e) {
      toast.error(e.message || "Failed to log outcome");
    }
    setCallState("idle");
    setActiveCallId(null);
  };

  const handleNextLead = () => {
    if (selectedIdx < leads.length - 1) {
      setSelectedIdx(i => i + 1);
      setCallState("idle");
      stopTimer();
    }
  };

  const handleSaveNotes = async (text) => {
    if (!selectedLead) return;
    try {
      await leadsApi.update(selectedLead.id, { notes: text });
    } catch {
      toast.error("Failed to save notes");
    }
  };

  const handleLeadChange = (idx) => {
    setSelectedIdx(idx);
    setCallState("idle");
    stopTimer();
  };

  if (loadingLeads) {
    return (
      <Shell topbarText="Call Mode" contentStyle={{ padding: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 14 }}>
          <Loader2 size={28} color="var(--gold)" style={{ animation: "spin 1s linear infinite" }} />
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "var(--text-secondary)" }}>Loading leads…</p>
        </div>
      </Shell>
    );
  }

  if (leads.length === 0) {
    return (
      <Shell topbarText="Call Mode" contentStyle={{ padding: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 14 }}>
          <PhoneIncoming size={36} color="var(--text-secondary)" strokeWidth={1.3} style={{ opacity: 0.3 }} />
          <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>No leads in pipeline</p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "var(--text-secondary)" }}>Add leads to the pipeline before starting call mode.</p>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => router.push("/pipeline")}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 18px", borderRadius: 9, border: "1px solid var(--gold)", background: "var(--gold-dim)", color: "var(--gold)", fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, cursor: "pointer", marginTop: 8 }}>
            <ArrowRight size={14} /> Go to Pipeline
          </motion.button>
        </div>
      </Shell>
    );
  }

  return (
    <>
      <Shell topbarText="Call Mode" contentStyle={{ padding: 0, overflow: "hidden" }}>
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

          {/* ── Page Header ── */}
          <div style={{
            display: "flex", alignItems: "center", gap: 14,
            padding: "10px 20px", borderBottom: "1px solid var(--border)",
            background: "var(--bg-secondary)", flexShrink: 0,
          }}>
            <div>
              <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Power Dialer</p>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--text-secondary)" }}>
                Lead {selectedIdx + 1} of {leads.length}
              </p>
            </div>

            {/* Lead selector in header */}
            <div style={{ flex: 1, maxWidth: 340 }}>
              <LeadSelector leads={leads} selectedIdx={selectedIdx} onChange={handleLeadChange} />
            </div>

            <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <motion.button
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => setMinimized(true)}
                style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 10px", display: "flex", alignItems: "center", gap: 6, color: "var(--text-secondary)", fontFamily: "'DM Sans', sans-serif", fontSize: 12, cursor: "pointer" }}
              >
                <Minimize2 size={13} /> Minimize
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={() => router.push("/pipeline")}
                style={{ background: "transparent", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 10px", display: "flex", alignItems: "center", gap: 6, color: "var(--text-secondary)", fontFamily: "'DM Sans', sans-serif", fontSize: 12, cursor: "pointer" }}
              >
                <X size={13} /> Exit
              </motion.button>
            </div>
          </div>

          {/* ── Split layout ── */}
          <AnimatePresence>
            {!minimized && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ display: "flex", flex: 1, overflow: "hidden" }}
              >
                {/* Left Panel — 40% */}
                <div style={{ width: "38%", borderRight: "1px solid var(--border)", overflowY: "auto", padding: "14px 14px 14px 14px" }}>
                  <LeftPanel
                    lead={selectedLead}
                    contact={contact}
                    callHistory={callHistory}
                    notes={notes}
                    setNotes={setNotes}
                    loadingLead={loadingLead}
                    onSaveNotes={handleSaveNotes}
                  />
                </div>

                {/* Center Panel — 35% */}
                <div style={{ width: "33%", borderRight: "1px solid var(--border)", overflowY: "auto", display: "flex", flexDirection: "column" }}>
                  <CenterPanel
                    lead={selectedLead}
                    contact={contact}
                    callState={callState}
                    callSeconds={callSeconds}
                    onStartCall={handleStartCall}
                    onEndCall={handleEndCall}
                    onOutcome={handleOutcome}
                    onNextLead={handleNextLead}
                    isLastLead={selectedIdx >= leads.length - 1}
                    starting={starting}
                  />
                </div>

                {/* Right Panel — 25% */}
                <div style={{ flex: 1, overflowY: "auto", padding: "14px" }}>
                  <RightPanel
                    lead={selectedLead}
                    intel={intel}
                    templateList={templateList}
                    loadingIntel={loadingIntel}
                    onSendSms={(t) => setSmsTemplate(t)}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </Shell>

      {/* ── Minimized bar ── */}
      <AnimatePresence>
        {minimized && (
          <MinimizedBar
            lead={selectedLead}
            contact={contact}
            callState={callState}
            callSeconds={callSeconds}
            onExpand={() => setMinimized(false)}
            onStartCall={handleStartCall}
            onEndCall={handleEndCall}
          />
        )}
      </AnimatePresence>

      {/* ── SMS Modal ── */}
      <AnimatePresence>
        {smsTemplate && (
          <SmsModal
            key="sms"
            template={smsTemplate}
            lead={selectedLead}
            contact={contact}
            onClose={() => setSmsTemplate(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
