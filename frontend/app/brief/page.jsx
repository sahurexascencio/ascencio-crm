"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import Shell from "@/components/Shell";
import { ScoreBar, Spinner, ErrorMsg } from "@/components/ui";
import { C, T, STATUS_META } from "@/lib/tokens";
import { leads as leadsApi, intelligence as intelApi, calls as callsApi } from "@/lib/api";

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

  const mono = { fontFamily: "'DM Mono', monospace" };
  const sans = { fontFamily: "'DM Sans', sans-serif" };
  const syne = { fontFamily: "'Syne', sans-serif" };

  if (loading) return <Shell topbarText="Pre-call intelligence brief"><Spinner /></Shell>;
  if (error)   return <Shell topbarText="Pre-call intelligence brief"><ErrorMsg message={error} /></Shell>;

  return (
    <Shell topbarText="Pre-call intelligence brief">
      <div className="fade-up" style={{ display: "grid", gridTemplateColumns: "210px 1fr", gap: 16, height: "100%" }}>

        {/* ── Lead list ──────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 3, overflowY: "auto" }}>
          <p style={{ ...mono, fontSize: 9, color: "var(--text-secondary)", letterSpacing: "0.1em", padding: "0 8px", marginBottom: 8 }}>
            SELECT LEAD
          </p>
          {leads.map(lead => {
            const active = selected?.id === lead.id;
            return (
              <button key={lead.id} onClick={() => loadBrief(lead)} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px", borderRadius: 9, width: "100%",
                border: `1px solid ${active ? "var(--gold)" : "transparent"}`,
                background: active ? "var(--gold-dim)" : "transparent",
                cursor: "pointer", textAlign: "left",
                transition: "all 0.13s",
              }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = "var(--bg-card)"; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ ...sans, fontSize: 12, fontWeight: 500, color: active ? "var(--gold)" : "var(--text-primary)", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {lead.business_name}
                  </div>
                  <div style={{ ...mono, fontSize: 10, color: "var(--text-secondary)" }}>{lead.city}</div>
                </div>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: STATUS_META[lead.status]?.color, flexShrink: 0 }} />
              </button>
            );
          })}
        </div>

        {/* ── Detail panel ───────────────────────────────────────────────────── */}
        {briefLoading
          ? <Spinner />
          : selected && (
            <AnimatePresence mode="wait">
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                style={{ display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}
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
                    <h3 style={{ ...syne, fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 3 }}>
                      {selected.business_name}
                    </h3>
                    <div style={{ ...mono, fontSize: 11, color: "var(--text-secondary)", marginBottom: 12 }}>
                      {selected.city} · {selected.industry}
                    </div>
                    {contact && (
                      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                        {[
                          `📞 ${contact.phone}`,
                          `👤 ${contact.name} — ${contact.role || "Contact"}`,
                          contact.email && `✉ ${contact.email}`,
                        ].filter(Boolean).map((item, idx) => (
                          <div key={idx} style={{
                            ...mono, fontSize: 11, color: "var(--text-primary)",
                            background: "var(--bg-primary)", padding: "4px 10px", borderRadius: 6,
                            border: "1px solid var(--border)",
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
                      title="Refresh intelligence data"
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        ...sans, fontSize: 12, padding: "8px 12px", borderRadius: 8,
                        border: "1px solid var(--border)", background: "transparent",
                        color: "var(--text-secondary)", opacity: refreshing ? 0.6 : 1,
                        transition: "all 0.15s",
                      }}
                    >
                      <RefreshCw
                        size={13}
                        strokeWidth={1.8}
                        style={{ animation: refreshing ? "spin 0.8s linear infinite" : "none" }}
                      />
                      {refreshing ? "Refreshing…" : "Refresh"}
                    </button>
                    <button
                      onClick={handleCallback}
                      style={{
                        ...sans, fontSize: 12, padding: "8px 14px", borderRadius: 8,
                        border: "1px solid var(--border)", background: "transparent",
                        color: "var(--text-secondary)", transition: "all 0.15s",
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
                        color: "#0A0B0F",
                        opacity: (!contact || calling) ? 0.7 : 1,
                        transition: "all 0.15s",
                      }}
                    >
                      {calling ? "Calling…" : "📞 Call Now"}
                    </button>
                  </div>
                </div>

                {/* Intel + pain points */}
                {intel && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    {/* Scores */}
                    <div style={{ padding: "20px 22px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14 }}>
                      <p style={{ ...mono, fontSize: 10, color: "var(--text-secondary)", letterSpacing: "0.08em", marginBottom: 18 }}>
                        INTELLIGENCE SCORES
                      </p>
                      <ScoreBar label="Website quality"  value={intel.website_score || 0} />
                      <ScoreBar label="SEO visibility"   value={intel.seo_score || 0} />
                      <ScoreBar label="Social presence"  value={intel.social_engagement_score || 0} />
                      {intel.google_rating && (
                        <ScoreBar
                          label="Google rating" value={intel.google_rating} max={5}
                          color={intel.google_rating >= 4.2 ? C.confirmed : intel.google_rating >= 3.8 ? C.callback : "#EF4444"}
                        />
                      )}
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
                        <span style={{ ...sans, fontSize: 12, color: "var(--text-secondary)" }}>
                          {intel.google_reviews_count || 0} Google reviews
                        </span>
                        <span style={{
                          ...mono, fontSize: 11, padding: "2px 9px", borderRadius: 5,
                          background: intel.is_running_ads ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)",
                          color:      intel.is_running_ads ? "#10B981"               : "#F59E0B",
                        }}>
                          {intel.is_running_ads ? "Ads active" : "No ads running"}
                        </span>
                      </div>
                    </div>

                    {/* Pain points */}
                    <div style={{ padding: "20px 22px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14 }}>
                      <p style={{ ...mono, fontSize: 10, color: "var(--text-secondary)", letterSpacing: "0.08em", marginBottom: 16 }}>
                        PAIN POINTS
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {(brief.pain_points || []).map((pt, idx) => (
                          <div key={idx} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                            <span style={{ color: "#EF4444", fontSize: 11, flexShrink: 0, marginTop: 2 }}>✕</span>
                            <span style={{ ...sans, fontSize: 12, color: "var(--text-primary)", lineHeight: 1.55 }}>{pt}</span>
                          </div>
                        ))}
                        {!brief.pain_points?.length && (
                          <span style={{ ...sans, fontSize: 12, color: "var(--text-secondary)" }}>
                            No data scraped yet — click Refresh
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* No intel yet */}
                {!intel && !briefLoading && (
                  <div style={{
                    padding: "28px 24px", textAlign: "center",
                    background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14,
                  }}>
                    <p style={{ ...sans, fontSize: 13, color: "var(--text-secondary)", marginBottom: 14 }}>
                      No intelligence data scraped for this lead yet.
                    </p>
                    <button
                      onClick={handleRefresh}
                      disabled={refreshing}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 7,
                        ...sans, fontSize: 13, fontWeight: 500,
                        padding: "9px 20px", borderRadius: 9, border: "none",
                        background: "var(--gold)", color: "#0A0B0F",
                        opacity: refreshing ? 0.7 : 1,
                      }}
                    >
                      <RefreshCw size={14} strokeWidth={2} style={{ animation: refreshing ? "spin 0.8s linear infinite" : "none" }} />
                      {refreshing ? "Fetching data…" : "Scrape intelligence"}
                    </button>
                  </div>
                )}

                {/* Talking points */}
                {brief?.talking_points?.length > 0 && (
                  <div style={{
                    padding: "20px 22px",
                    background: "var(--bg-card)", border: "1px solid var(--gold)",
                    borderRadius: 14, boxShadow: "0 0 0 1px var(--gold-dim)",
                  }}>
                    <p style={{ ...mono, fontSize: 10, color: "var(--gold)", letterSpacing: "0.08em", marginBottom: 16 }}>
                      TALKING POINTS
                    </p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {brief.talking_points.map((pt, idx) => (
                        <div key={idx} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                          <span style={{ ...mono, fontSize: 11, color: "var(--gold)", flexShrink: 0, marginTop: 2 }}>
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                          <span style={{ ...sans, fontSize: 13, color: "var(--text-primary)", lineHeight: 1.6 }}>{pt}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )
        }
      </div>
    </Shell>
  );
}
