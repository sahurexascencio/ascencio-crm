"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { RefreshCw, Phone, ChevronDown } from "lucide-react";
import Shell from "@/components/Shell";
import { C, STATUS_META } from "@/lib/tokens";
import { leads as leadsApi, intelligence as intelApi, calls as callsApi } from "@/lib/api";

// ── Skeleton block primitive ──────────────────────────────────────────────────
function Skel({ w = "100%", h = 12, r = 6, delay = 0, style }) {
  return (
    <div className="skeleton-pulse" style={{
      width: w, height: h, borderRadius: r,
      background: "var(--border)",
      flexShrink: 0,
      animationDelay: `${delay}s`,
      ...style,
    }} />
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "80px 20px", gap: 14, textAlign: "center",
      }}
    >
      <div style={{
        width: 58, height: 58, borderRadius: 16,
        background: "var(--gold-dim)", border: "1px solid var(--gold)",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 4,
      }}>
        <Phone size={22} strokeWidth={1.5} style={{ color: "var(--gold)" }} />
      </div>
      <h3 style={{
        fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700,
        color: "var(--text-primary)", margin: 0,
      }}>Select a lead to view their brief</h3>
      <p style={{
        fontFamily: "'DM Sans', sans-serif", fontSize: 13,
        color: "var(--text-secondary)", margin: 0,
        maxWidth: 380, lineHeight: 1.65,
      }}>
        Choose a lead from the pipeline to see intel, contacts, and call history
      </p>
    </motion.div>
  );
}

// ── Brief Loading Skeleton ────────────────────────────────────────────────────
function BriefSkeleton() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Header card */}
      <div style={{
        padding: "22px 24px", background: "var(--bg-card)",
        border: "1px solid var(--border)", borderRadius: 14,
        display: "flex", alignItems: "flex-start", gap: 18,
      }}>
        <Skel w={52} h={52} r={13} />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 9 }}>
          <Skel w="50%" h={18} delay={0.04} />
          <Skel w="30%" h={11} delay={0.07} />
          <div style={{ display: "flex", gap: 7, marginTop: 4 }}>
            <Skel w={100} h={26} r={6} delay={0.1} />
            <Skel w={120} h={26} r={6} delay={0.12} />
            <Skel w={110} h={26} r={6} delay={0.14} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 7 }}>
          <Skel w={76} h={34} r={8} delay={0.1} />
          <Skel w={88} h={34} r={8} delay={0.12} />
          <Skel w={98} h={34} r={8} delay={0.14} />
        </div>
      </div>

      {/* Intel grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {/* Scores */}
        <div style={{ padding: "20px 22px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14 }}>
          <Skel w="55%" h={10} delay={0.05} />
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 18 }}>
            {[0, 0.06, 0.12, 0.18].map((d, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <Skel w="40%" h={11} delay={d} />
                  <Skel w="14%" h={11} delay={d + 0.02} />
                </div>
                <Skel w="100%" h={3} r={2} delay={d + 0.04} />
              </div>
            ))}
          </div>
        </div>
        {/* Pain points */}
        <div style={{ padding: "20px 22px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14 }}>
          <Skel w="45%" h={10} delay={0.05} />
          <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 13 }}>
            {[85, 68, 92, 62, 75].map((w, i) => (
              <Skel key={i} w={`${w}%`} h={12} delay={0.04 * i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Lead Selector Dropdown ────────────────────────────────────────────────────
function LeadSelector({ leads, selected, onSelect }) {
  const [open,   setOpen]   = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const close = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const filtered = leads.filter(l =>
    l.business_name.toLowerCase().includes(search.toLowerCase()) ||
    (l.city || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={ref} style={{ position: "relative", maxWidth: 500 }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          width: "100%", padding: "11px 16px",
          background: "var(--bg-card)", border: `1px solid ${open ? "var(--gold)" : "var(--border)"}`,
          borderRadius: 11, cursor: "pointer",
          transition: "border-color 0.15s",
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.borderColor = "var(--gold)"; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.borderColor = "var(--border)"; }}
      >
        {selected ? (
          <>
            <span style={{
              width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
              background: STATUS_META[selected.status]?.color || "#6B7B8D",
            }} />
            <span style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500,
              color: "var(--text-primary)", flex: 1, textAlign: "left",
            }}>{selected.business_name}</span>
            {selected.city && (
              <span style={{
                fontFamily: "'DM Mono', monospace", fontSize: 11,
                color: "var(--text-secondary)",
              }}>{selected.city}</span>
            )}
          </>
        ) : (
          <span style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 13,
            color: "var(--text-secondary)", flex: 1, textAlign: "left",
          }}>Select a lead…</span>
        )}
        <ChevronDown size={14} strokeWidth={1.8} style={{
          color: "var(--text-secondary)", flexShrink: 0,
          transform: open ? "rotate(180deg)" : "none",
          transition: "transform 0.2s",
        }} />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{   opacity: 0, y: -6, scale: 0.98  }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            style={{
              position: "absolute", top: "calc(100% + 7px)", left: 0, right: 0,
              background: "var(--bg-card)", border: "1px solid var(--border)",
              borderRadius: 12, zIndex: 50, boxShadow: "var(--shadow)",
              overflow: "hidden",
            }}
          >
            {/* Search input */}
            <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search leads…"
                style={{
                  width: "100%", padding: "7px 10px",
                  background: "var(--bg-primary)", border: "1px solid var(--border)",
                  borderRadius: 7,
                  fontFamily: "'DM Sans', sans-serif", fontSize: 13,
                  color: "var(--text-primary)", outline: "none",
                  transition: "border-color 0.15s",
                }}
                onFocus={e => (e.target.style.borderColor = "var(--gold)")}
                onBlur={e  => (e.target.style.borderColor = "var(--border)")}
              />
            </div>

            {/* Lead list */}
            <div style={{ maxHeight: 300, overflowY: "auto" }}>
              {filtered.length === 0 ? (
                <div style={{
                  padding: "24px 16px", textAlign: "center",
                  fontFamily: "'DM Sans', sans-serif", fontSize: 13,
                  color: "var(--text-secondary)",
                }}>No leads match</div>
              ) : filtered.map(lead => {
                const active       = selected?.id === lead.id;
                const statusColor  = STATUS_META[lead.status]?.color || "#6B7B8D";
                return (
                  <button key={lead.id}
                    onClick={() => { onSelect(lead); setOpen(false); setSearch(""); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      width: "100%", padding: "10px 14px", border: "none",
                      background: active ? "var(--gold-dim)" : "transparent",
                      cursor: "pointer", textAlign: "left",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = "var(--bg-secondary)"; }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
                  >
                    <span style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: statusColor, flexShrink: 0,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500,
                        color: active ? "var(--gold)" : "var(--text-primary)",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                      }}>{lead.business_name}</div>
                      {(lead.city || lead.industry) && (
                        <div style={{
                          fontFamily: "'DM Mono', monospace", fontSize: 10,
                          color: "var(--text-secondary)",
                        }}>{[lead.city, lead.industry].filter(Boolean).join(" · ")}</div>
                      )}
                    </div>
                    {active && (
                      <span style={{
                        fontFamily: "'DM Mono', monospace", fontSize: 9,
                        color: "var(--gold)", letterSpacing: "0.06em",
                      }}>VIEWING</span>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Metric Row ────────────────────────────────────────────────────────────────
function MetricRow({ icon, label, value, max = 100, color }) {
  const pct = Math.min((value / max) * 100, 100);
  const col = color || (pct >= 70 ? "#10B981" : pct >= 40 ? "#F59E0B" : "#EF4444");
  const display = max === 5 ? `${Number(value).toFixed(1)} / 5.0` : `${value} / 100`;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between", marginBottom: 7,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontSize: 13, lineHeight: 1 }}>{icon}</span>
          <span style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 12,
            color: "var(--text-secondary)",
          }}>{label}</span>
        </div>
        <span style={{
          fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 600,
          color: col,
        }}>{display}</span>
      </div>
      <div style={{ height: 3, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: [0.4, 0, 0.2, 1] }}
          style={{ height: "100%", background: col, borderRadius: 2 }}
        />
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function BriefPage() {
  const [leads,        setLeads]        = useState([]);
  const [selected,     setSelected]     = useState(null);
  const [brief,        setBrief]        = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [briefLoading, setBriefLoading] = useState(false);
  const [error,        setError]        = useState("");
  const [calling,      setCalling]      = useState(false);
  const [refreshing,   setRefreshing]   = useState(false);

  useEffect(() => {
    leadsApi.list()
      .then(data => {
        const active = data.filter(l => l.status !== "dead");
        setLeads(active);
        if (active.length > 0) loadBrief(active[0]);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const loadBrief = async (lead) => {
    setSelected(lead);
    setBriefLoading(true);
    try {
      const data = await intelApi.brief(lead.id);
      setBrief(data);
    } catch {
      setBrief(null);
    } finally {
      setBriefLoading(false);
    }
  };

  const handleCall = async () => {
    if (!selected || !brief?.primary_contact) return;
    setCalling(true);
    try {
      await callsApi.initiate({ lead_id: selected.id, contact_id: brief.primary_contact.id });
      toast.success("Call initiated — your phone will ring now");
    } catch (e) {
      toast.error(`Call failed: ${e.message}`);
    } finally {
      setCalling(false);
    }
  };

  const handleCallback = async () => {
    if (!selected) return;
    try {
      await leadsApi.updateStatus(selected.id, "callback");
      setLeads(ls => ls.map(l => l.id === selected.id ? { ...l, status: "callback" } : l));
      setSelected(s => ({ ...s, status: "callback" }));
      toast.success(`${selected.business_name} marked for callback`);
    } catch (e) {
      toast.error(`Failed: ${e.message}`);
    }
  };

  const handleRefresh = async () => {
    if (!selected || refreshing) return;
    setRefreshing(true);
    try {
      await intelApi.refresh(selected.id);
      const data = await intelApi.brief(selected.id);
      setBrief(data);
      toast.success("Intelligence data refreshed");
    } catch (e) {
      toast.error(`Refresh failed: ${e.message}`);
    } finally {
      setRefreshing(false);
    }
  };

  const intel   = brief?.intelligence;
  const contact = brief?.primary_contact;

  const sans = { fontFamily: "'DM Sans', sans-serif" };
  const mono = { fontFamily: "'DM Mono', monospace" };
  const syne = { fontFamily: "'Syne', sans-serif" };

  return (
    <Shell topbarText="Pre-call intelligence brief">
      <div className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* ── Lead selector ─────────────────────────────────────────────────── */}
        {loading ? (
          <Skel w={500} h={44} r={11} />
        ) : leads.length > 0 ? (
          <LeadSelector leads={leads} selected={selected} onSelect={loadBrief} />
        ) : null}

        {/* ── Error loading leads ────────────────────────────────────────────── */}
        {!loading && error && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              padding: "60px 20px", gap: 12, textAlign: "center",
            }}
          >
            <div style={{
              width: 48, height: 48, borderRadius: 12, fontSize: 20,
              background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>⚠</div>
            <p style={{ ...syne, fontSize: 16, fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>
              Couldn't load leads
            </p>
            <p style={{ ...sans, fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>{error}</p>
          </motion.div>
        )}

        {/* ── Empty state ────────────────────────────────────────────────────── */}
        {!loading && !error && !selected && <EmptyState />}

        {/* ── Brief skeleton ─────────────────────────────────────────────────── */}
        {selected && briefLoading && <BriefSkeleton />}

        {/* ── Detail panel ───────────────────────────────────────────────────── */}
        {selected && !briefLoading && (
          <AnimatePresence mode="wait">
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              style={{ display: "flex", flexDirection: "column", gap: 14 }}
            >

              {/* Header card */}
              <div style={{
                padding: "22px 24px",
                background: "var(--bg-card)", border: "1px solid var(--border)",
                borderRadius: 14, display: "flex", alignItems: "flex-start", gap: 18,
              }}>
                {/* Avatar */}
                <div style={{
                  width: 52, height: 52, borderRadius: 13, flexShrink: 0,
                  background: "var(--gold-dim)", border: "1px solid var(--gold)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <span style={{ ...syne, fontSize: 20, fontWeight: 700, color: "var(--gold)" }}>
                    {selected.business_name?.[0]}
                  </span>
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 3 }}>
                    <h3 style={{ ...syne, fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                      {selected.business_name}
                    </h3>
                    {/* Status dot badge */}
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      ...sans, fontSize: 11, fontWeight: 500,
                      padding: "3px 9px", borderRadius: 20,
                      color: STATUS_META[selected.status]?.color,
                      background: STATUS_META[selected.status]?.bg,
                    }}>
                      <span style={{
                        width: 5, height: 5, borderRadius: "50%",
                        background: STATUS_META[selected.status]?.color,
                      }} />
                      {STATUS_META[selected.status]?.label}
                    </span>
                  </div>
                  <div style={{ ...mono, fontSize: 11, color: "var(--text-secondary)", marginBottom: 12 }}>
                    {[selected.city, selected.industry].filter(Boolean).join(" · ")}
                  </div>
                  {contact && (
                    <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                      {[
                        `📞 ${contact.phone}`,
                        `👤 ${contact.name}${contact.role ? ` — ${contact.role}` : ""}`,
                        contact.email && `✉ ${contact.email}`,
                      ].filter(Boolean).map((item, idx) => (
                        <div key={idx} style={{
                          ...mono, fontSize: 11, color: "var(--text-primary)",
                          background: "var(--bg-primary)", padding: "4px 10px",
                          borderRadius: 6, border: "1px solid var(--border)",
                        }}>{item}</div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div style={{ display: "flex", gap: 8, flexShrink: 0, alignItems: "flex-start" }}>
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    title="Refresh intelligence"
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      ...sans, fontSize: 12, padding: "8px 13px", borderRadius: 8,
                      border: "1px solid var(--border)", background: "transparent",
                      color: "var(--text-secondary)", cursor: "pointer",
                      opacity: refreshing ? 0.6 : 1, transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--gold)"; e.currentTarget.style.color = "var(--gold)"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                  >
                    <RefreshCw size={13} strokeWidth={1.8}
                      style={{ animation: refreshing ? "spin 0.8s linear infinite" : "none" }} />
                    {refreshing ? "Refreshing…" : "Refresh"}
                  </button>
                  <button
                    onClick={handleCallback}
                    style={{
                      ...sans, fontSize: 12, padding: "8px 14px", borderRadius: 8,
                      border: "1px solid var(--border)", background: "transparent",
                      color: "var(--text-secondary)", cursor: "pointer", transition: "all 0.15s",
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "#F59E0B"; e.currentTarget.style.color = "#F59E0B"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
                  >Callback</button>
                  <button
                    onClick={handleCall}
                    disabled={calling || !contact}
                    style={{
                      ...sans, fontSize: 12, fontWeight: 600,
                      padding: "8px 20px", borderRadius: 8, border: "none",
                      background: calling ? "var(--text-secondary)" : "var(--gold)",
                      color: "#0A0B0F", cursor: "pointer",
                      opacity: (!contact || calling) ? 0.7 : 1,
                      transition: "all 0.15s",
                    }}
                  >{calling ? "Calling…" : "📞 Call Now"}</button>
                </div>
              </div>

              {/* No intel yet */}
              {!intel && (
                <div style={{
                  padding: "32px 24px", textAlign: "center",
                  background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14,
                }}>
                  <p style={{ ...sans, fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
                    No intelligence data scraped for this lead yet.
                  </p>
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 7,
                      ...sans, fontSize: 13, fontWeight: 600,
                      padding: "9px 22px", borderRadius: 9, border: "none",
                      background: "var(--gold)", color: "#0A0B0F", cursor: "pointer",
                      opacity: refreshing ? 0.7 : 1,
                    }}
                  >
                    <RefreshCw size={14} strokeWidth={2}
                      style={{ animation: refreshing ? "spin 0.8s linear infinite" : "none" }} />
                    {refreshing ? "Fetching data…" : "Scrape intelligence"}
                  </button>
                </div>
              )}

              {/* Intel grid — scores + pain points */}
              {intel && (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

                  {/* Scores card */}
                  <div style={{
                    padding: "20px 22px",
                    background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14,
                  }}>
                    <p style={{ ...mono, fontSize: 10, color: "var(--text-secondary)", letterSpacing: "0.08em", marginBottom: 18 }}>
                      INTELLIGENCE SCORES
                    </p>
                    <MetricRow icon="🌐" label="Website quality"  value={intel.website_score || 0} />
                    <MetricRow icon="🔍" label="SEO visibility"   value={intel.seo_score || 0} />
                    <MetricRow icon="📱" label="Social presence"  value={intel.social_engagement_score || 0} />
                    {intel.google_rating != null && (
                      <MetricRow
                        icon="⭐" label="Google rating"
                        value={intel.google_rating} max={5}
                        color={
                          intel.google_rating >= 4.2 ? "#10B981" :
                          intel.google_rating >= 3.8 ? "#F59E0B" : "#EF4444"
                        }
                      />
                    )}

                    {/* Footer row */}
                    <div style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)",
                    }}>
                      <span style={{ ...sans, fontSize: 12, color: "var(--text-secondary)" }}>
                        {intel.google_reviews_count || 0} Google reviews
                      </span>
                      <span style={{
                        ...mono, fontSize: 11, padding: "3px 9px", borderRadius: 20,
                        background: intel.is_running_ads ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)",
                        color:      intel.is_running_ads ? "#10B981"               : "#F59E0B",
                        display: "inline-flex", alignItems: "center", gap: 5,
                      }}>
                        <span style={{
                          width: 5, height: 5, borderRadius: "50%",
                          background: intel.is_running_ads ? "#10B981" : "#F59E0B",
                        }} />
                        {intel.is_running_ads ? "Ads active" : "No ads"}
                      </span>
                    </div>
                  </div>

                  {/* Pain points card */}
                  <div style={{
                    padding: "20px 22px",
                    background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14,
                  }}>
                    <p style={{ ...mono, fontSize: 10, color: "var(--text-secondary)", letterSpacing: "0.08em", marginBottom: 16 }}>
                      PAIN POINTS
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {(brief.pain_points || []).map((pt, idx) => (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          style={{ display: "flex", gap: 10, alignItems: "flex-start" }}
                        >
                          <span style={{
                            width: 16, height: 16, borderRadius: 4, flexShrink: 0, marginTop: 1,
                            background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.2)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 9, color: "#EF4444",
                          }}>✕</span>
                          <span style={{ ...sans, fontSize: 12, color: "var(--text-primary)", lineHeight: 1.55 }}>{pt}</span>
                        </motion.div>
                      ))}
                      {!brief.pain_points?.length && (
                        <span style={{ ...sans, fontSize: 12, color: "var(--text-secondary)" }}>
                          No pain points found — click Refresh to scrape
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Talking points */}
              {brief?.talking_points?.length > 0 && (
                <div style={{
                  padding: "20px 22px",
                  background: "var(--bg-card)",
                  border: "1px solid var(--gold)",
                  borderRadius: 14,
                  boxShadow: "0 0 0 1px var(--gold-dim)",
                }}>
                  <p style={{ ...mono, fontSize: 10, color: "var(--gold)", letterSpacing: "0.08em", marginBottom: 16 }}>
                    TALKING POINTS
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {brief.talking_points.map((pt, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.06 }}
                        style={{ display: "flex", gap: 14, alignItems: "flex-start" }}
                      >
                        <span style={{
                          ...mono, fontSize: 11, color: "var(--gold)",
                          flexShrink: 0, marginTop: 2, fontWeight: 600,
                        }}>{String(idx + 1).padStart(2, "0")}</span>
                        <span style={{ ...sans, fontSize: 13, color: "var(--text-primary)", lineHeight: 1.6 }}>{pt}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </Shell>
  );
}
