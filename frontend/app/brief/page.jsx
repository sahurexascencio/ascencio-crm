"use client";
import { useState, useEffect } from "react";
import Shell from "@/components/Shell";
import { ScoreBar, Spinner, ErrorMsg } from "@/components/ui";
import { C, T, STATUS_META } from "@/lib/tokens";
import { leads as leadsApi, intelligence as intelApi, calls as callsApi } from "@/lib/api";

export default function BriefPage() {
  const [leads, setLeads] = useState([]);
  const [selected, setSelected] = useState(null);
  const [brief, setBrief] = useState(null);
  const [loading, setLoading] = useState(true);
  const [briefLoading, setBriefLoading] = useState(false);
  const [error, setError] = useState("");
  const [calling, setCalling] = useState(false);

  useEffect(() => {
    leadsApi.list().then(data => {
      const active = data.filter(l => l.status !== "dead");
      setLeads(active);
      if (active.length > 0) loadBrief(active[0]);
    }).catch(e => setError(e.message)).finally(() => setLoading(false));
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
      alert("Call initiated — your phone will ring now.");
    } catch (e) {
      alert(`Call failed: ${e.message}`);
    } finally {
      setCalling(false);
    }
  };

  const intel = brief?.intelligence;
  const contact = brief?.primary_contact;

  if (loading) return <Shell topbarText="Pre-call intelligence brief"><Spinner /></Shell>;
  if (error) return <Shell topbarText="Pre-call intelligence brief"><ErrorMsg message={error} /></Shell>;

  return (
    <Shell topbarText="Pre-call intelligence brief">
      <div className="fade-up" style={{ display: "grid", gridTemplateColumns: "210px 1fr", gap: 16, height: "100%" }}>

        {/* Lead list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 3, overflowY: "auto" }}>
          <p style={{ ...T.mono, fontSize: 10, color: C.muted, letterSpacing: "0.08em", padding: "0 8px", marginBottom: 6 }}>SELECT LEAD</p>
          {leads.map(lead => (
            <button key={lead.id} onClick={() => loadBrief(lead)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, border: `1px solid ${selected?.id===lead.id ? C.accent+"55" : "transparent"}`, background: selected?.id===lead.id ? C.accentDim : "transparent", cursor: "pointer", textAlign: "left", transition: "all 0.13s" }}
              onMouseEnter={e => { if (selected?.id!==lead.id) e.currentTarget.style.background = C.subtle; }}
              onMouseLeave={e => { if (selected?.id!==lead.id) e.currentTarget.style.background = "transparent"; }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ ...T.body, fontSize: 12, fontWeight: 500, color: selected?.id===lead.id ? C.accent : C.text, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lead.business_name}</div>
                <div style={{ ...T.mono, fontSize: 10, color: C.muted }}>{lead.city}</div>
              </div>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: STATUS_META[lead.status]?.color, flexShrink: 0 }} />
            </button>
          ))}
        </div>

        {/* Detail panel */}
        {briefLoading ? <Spinner /> : selected && (
          <div key={selected.id} className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>
            {/* Header */}
            <div style={{ padding: "20px 22px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, display: "flex", alignItems: "flex-start", gap: 18 }}>
              <div style={{ width: 50, height: 50, borderRadius: 12, background: C.accentDim, border: `1px solid ${C.accent}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ ...T.heading, fontSize: 20, color: C.accent, fontWeight: 700 }}>{selected.business_name?.[0]}</span>
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ ...T.heading, fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 3 }}>{selected.business_name}</h3>
                <div style={{ ...T.mono, fontSize: 11, color: C.muted, marginBottom: 10 }}>{selected.city} · {selected.industry}</div>
                {contact && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {[`📞 ${contact.phone}`, `👤 ${contact.name} — ${contact.role || "Contact"}`, contact.email && `✉ ${contact.email}`].filter(Boolean).map((item,idx) => (
                      <div key={idx} style={{ ...T.mono, fontSize: 11, color: C.text, background: C.subtle, padding: "4px 10px", borderRadius: 5 }}>{item}</div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button style={{ ...T.body, fontSize: 12, padding: "8px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.subtle, color: C.muted, cursor: "pointer" }}>Callback</button>
                <button onClick={handleCall} disabled={calling}
                  style={{ ...T.body, fontSize: 12, fontWeight: 600, padding: "8px 18px", borderRadius: 8, border: "none", background: calling ? C.muted : C.accent, color: "#FFFFFF", cursor: calling ? "not-allowed" : "pointer" }}>
                  {calling ? "Calling..." : "📞 Call Now"}
                </button>
              </div>
            </div>

            {/* Intel + pain points */}
            {intel && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div style={{ padding: "18px 20px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 12 }}>
                  <p style={{ ...T.mono, fontSize: 10, color: C.muted, letterSpacing: "0.08em", marginBottom: 16 }}>INTELLIGENCE SCORES</p>
                  <ScoreBar label="Website quality" value={intel.website_score||0} />
                  <ScoreBar label="SEO visibility" value={intel.seo_score||0} />
                  <ScoreBar label="Social presence" value={intel.social_engagement_score||0} />
                  {intel.google_rating && <ScoreBar label="Google rating" value={intel.google_rating} max={5} color={intel.google_rating>=4.2?C.confirmed:intel.google_rating>=3.8?C.callback:"#E05555"} />}
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
                    <span style={{ ...T.body, fontSize: 12, color: C.muted }}>{intel.google_reviews_count||0} Google reviews</span>
                    <span style={{ ...T.mono, fontSize: 11, padding: "2px 8px", borderRadius: 4, background: intel.is_running_ads?C.confirmedBg:C.callbackBg, color: intel.is_running_ads?C.confirmed:C.callback }}>{intel.is_running_ads?"Ads active":"No ads running"}</span>
                  </div>
                </div>

                <div style={{ padding: "18px 20px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 12 }}>
                  <p style={{ ...T.mono, fontSize: 10, color: C.muted, letterSpacing: "0.08em", marginBottom: 14 }}>PAIN POINTS</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                    {(brief.pain_points||[]).map((pt,idx) => (
                      <div key={idx} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                        <span style={{ color: "#E05555", fontSize: 11, flexShrink: 0, marginTop: 2 }}>✕</span>
                        <span style={{ ...T.body, fontSize: 12, color: C.text, lineHeight: 1.5 }}>{pt}</span>
                      </div>
                    ))}
                    {!brief.pain_points?.length && <span style={{ ...T.body, fontSize: 12, color: C.muted }}>No data scraped yet — click refresh</span>}
                  </div>
                </div>
              </div>
            )}

            {/* Talking points */}
            {brief.talking_points?.length > 0 && (
              <div style={{ padding: "18px 20px", background: C.card, border: `1px solid ${C.accent}35`, borderRadius: 12 }}>
                <p style={{ ...T.mono, fontSize: 10, color: C.accent, letterSpacing: "0.08em", marginBottom: 14 }}>TALKING POINTS</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                  {brief.talking_points.map((pt,idx) => (
                    <div key={idx} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <span style={{ ...T.mono, fontSize: 11, color: C.accent, flexShrink: 0, marginTop: 2 }}>{String(idx+1).padStart(2,"0")}</span>
                      <span style={{ ...T.body, fontSize: 13, color: C.text, lineHeight: 1.55 }}>{pt}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Shell>
  );
}
