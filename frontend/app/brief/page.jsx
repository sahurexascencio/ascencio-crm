"use client";
import { useState, useRef } from "react";
import Shell from "@/components/Shell";
import { C, T } from "@/lib/tokens";

function Section({ title, accent, children }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ ...T.mono, fontSize: 10, color: accent || C.accent, letterSpacing: "0.1em", marginBottom: 8, fontWeight: 500 }}>{title}</div>
      {children}
    </div>
  );
}

function Row({ label, value, highlight }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${C.border}` }}>
      <span style={{ ...T.mono, fontSize: 11, color: C.muted }}>{label}</span>
      <span style={{ ...T.body, fontSize: 12, color: highlight || C.text }}>{value ?? "—"}</span>
    </div>
  );
}

function Bullet({ text, color }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 6 }}>
      <div style={{ width: 6, height: 6, borderRadius: "50%", background: color || C.muted, marginTop: 5, flexShrink: 0 }} />
      <span style={{ ...T.body, fontSize: 13, color: C.text, lineHeight: 1.5 }}>{text}</span>
    </div>
  );
}

function OppCard({ label, text, icon }) {
  if (!text) return null;
  return (
    <div style={{ padding: "10px 14px", background: C.subtle, borderRadius: 8, border: `1px solid ${C.border}`, marginBottom: 6 }}>
      <div style={{ ...T.mono, fontSize: 10, color: C.accent, marginBottom: 4 }}>{icon} {label}</div>
      <div style={{ ...T.body, fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{text}</div>
    </div>
  );
}

function ScoreRing({ score }) {
  const color = score >= 75 ? C.dead : score >= 50 ? C.callback : C.confirmed;
  const label = score >= 75 ? "Strong presence" : score >= 50 ? "Average presence" : "Weak — high opportunity";
  return (
    <div style={{ textAlign: "center", padding: "24px 0 16px" }}>
      <div style={{ fontSize: 56, fontWeight: 800, color, ...T.heading, lineHeight: 1 }}>{score}</div>
      <div style={{ ...T.mono, fontSize: 10, color: C.muted, marginTop: 4, letterSpacing: "0.08em" }}>DIGITAL SCORE / 100</div>
      <div style={{ ...T.body, fontSize: 12, color, marginTop: 6 }}>{label}</div>
    </div>
  );
}

export default function BriefPage() {
  const [leads, setLeads] = useState(() => {
    if (typeof window === "undefined") return [];
    try { const s = localStorage.getItem("ascencio_brief"); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [selected, setSelected] = useState(() => {
    if (typeof window === "undefined") return null;
    try { const s = localStorage.getItem("ascencio_brief"); const d = s ? JSON.parse(s) : []; return d[0] || null; } catch { return null; }
  });
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef();

  // Restore from localStorage on mount


  const handleFile = async (file) => {
    setError("");
    try {
      let c = await file.text();
      c = c.replace(/\u201c|\u201d/g, '"').replace(/\u2018|\u2019/g, "'").replace(/\u2014|\u2013/g, "-");
      c = c.replace(/“|”/g, '"').replace(/‘|’/g, "'").replace(/—|–/g, "-");
      // Remove markdown links, bare URLs, footnotes
      c = c.replace(/\[\^\d+\]/g, "");
      c = c.replace(/\\&/g, "&");
      // Extract JSON array
      const s = c.indexOf("["), e = c.lastIndexOf("]");
      if (s === -1 || e === -1) throw new Error("No JSON array found");
      let text = c.substring(s, e + 2);
      // Fix newlines inside strings
      const out = []; let inStr = false, esc = false;
      for (const ch of text) {
        if (esc) { out.push(ch); esc = false; }
        else if (ch === "\\") { out.push(ch); esc = true; }
        else if (ch === '"') { inStr = !inStr; out.push(ch); }
        else if ((ch === "\n" || ch === "\r") && inStr) { out.push(" "); }
        else { out.push(ch); }
      }
      const data = JSON.parse(out.join(""));
      if (!Array.isArray(data) || !data.length) throw new Error("Empty result");
      localStorage.setItem("ascencio_brief", JSON.stringify(data));
      setLeads(data);
      setSelected(data[0]);
      localStorage.setItem("ascencio_brief", JSON.stringify(data));
    } catch (err) {
      setError("Parse error: " + err.message + " — send the file to Claude in chat to fix it");
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const filtered = leads.filter(l =>
    (l.business_name || "").toLowerCase().includes(search.toLowerCase())
  );

  const intel = selected;

  return (
    <Shell topbarText={selected ? `Pre-Call Brief · ${selected.business_name}` : "Pre-Call Brief"}>
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16, height: "calc(100vh - 120px)" }}>

        {/* Left panel */}
        <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <div style={{ ...T.heading, fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 10 }}>
              {leads.length > 0 ? `${leads.length} leads` : "Upload Perplexity JSON"}
            </div>
            {leads.length > 0 && (
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
                style={{ width: "100%", padding: "6px 10px", background: C.subtle, border: `1px solid ${C.border}`, borderRadius: 7, ...T.body, fontSize: 13, color: C.text, outline: "none" }} />
            )}
          </div>

          {leads.length === 0 ? (
            <div
              onDrop={onDrop} onDragOver={e => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, cursor: "pointer", padding: 20 }}>
              <div style={{ fontSize: 32 }}>📂</div>
              <div style={{ ...T.body, fontSize: 13, color: C.muted, textAlign: "center", lineHeight: 1.6 }}>
                Drop Perplexity JSON here<br/>or click to upload
              </div>
              <input ref={fileRef} type="file" accept=".json,.txt" style={{ display: "none" }}
                onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />
              {error && <div style={{ ...T.body, fontSize: 11, color: C.dead, textAlign: "center" }}>{error}</div>}
            </div>
          ) : (
            <div style={{ flex: 1, overflowY: "auto" }}>
              {filtered.map((lead, i) => {
                const active = selected?.row === lead.row || selected?.business_name === lead.business_name;
                const score = lead.overall_digital_score || 0;
                const color = score >= 75 ? C.dead : score >= 50 ? C.callback : C.confirmed;
                return (
                  <button key={i} onClick={() => setSelected(lead)}
                    style={{ width: "100%", padding: "10px 14px", border: "none", borderBottom: `1px solid ${C.border}`, background: active ? C.accentDim : "transparent", cursor: "pointer", textAlign: "left" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ ...T.body, fontSize: 13, fontWeight: 500, color: active ? C.accent : C.text }}>{lead.business_name}</span>
                      <span style={{ ...T.mono, fontSize: 11, color, fontWeight: 600 }}>{score}</span>
                    </div>
                    <div style={{ ...T.mono, fontSize: 10, color: C.muted, marginTop: 2 }}>{lead.call_difficulty || ""}</div>
                  </button>
                );
              })}
              <button onClick={() => { setLeads([]); setSelected(null); setSearch(""); localStorage.removeItem("ascencio_brief"); }}
                style={{ width: "100%", padding: "8px", border: "none", borderTop: `1px solid ${C.border}`, background: "transparent", ...T.mono, fontSize: 11, color: C.muted, cursor: "pointer" }}>
                ↺ Load new file
              </button>
            </div>
          )}
        </div>

        {/* Right panel */}
        {!intel ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, background: C.surface, borderRadius: 12, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 40 }}>📋</div>
            <div style={{ ...T.body, fontSize: 14, color: C.muted }}>Upload a Perplexity JSON file to get started</div>
          </div>
        ) : (
          <div style={{ overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Header */}
            <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ ...T.heading, fontSize: 18, fontWeight: 700, color: C.text }}>{intel.business_name}</div>
                {intel.email && <div style={{ ...T.mono, fontSize: 11, color: C.muted, marginTop: 2 }}>✉ {intel.email}</div>}
                {intel.owner_name && <div style={{ ...T.mono, fontSize: 11, color: C.muted }}>👤 {intel.owner_name}</div>}
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ ...T.mono, fontSize: 11, padding: "4px 12px", borderRadius: 20, background: C.subtle, border: `1px solid ${C.border}`, color: C.muted }}>
                  {intel.call_difficulty === "easy" ? "🟢 Easy" : intel.call_difficulty === "medium" ? "🟡 Medium" : "🔴 Hard"}
                </span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 14 }}>
              {/* Score */}
              <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: 16 }}>
                <ScoreRing score={intel.overall_digital_score || 0} />
                {intel.price_range && <div style={{ ...T.mono, fontSize: 10, color: C.muted, textAlign: "center", marginTop: 4 }}>{intel.price_range}</div>}
              </div>

              {/* Summary */}
              <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: "16px 20px" }}>
                <Section title="SUMMARY">
                  <p style={{ ...T.body, fontSize: 13, color: C.muted, lineHeight: 1.6, margin: 0 }}>{intel.summary || "—"}</p>
                </Section>
                {intel.recommended_services?.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 10 }}>
                    {intel.recommended_services.map((s, i) => (
                      <span key={i} style={{ ...T.mono, fontSize: 10, padding: "3px 8px", borderRadius: 5, background: C.accentDim, color: C.accent, border: `1px solid ${C.accent}` }}>{s}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {/* Digital Presence */}
              <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: "16px 20px" }}>
                <Section title="DIGITAL PRESENCE" accent={C.accent}>
                  <Row label="Website" value={intel.website?.url || "—"} />
                  <Row label="Quality" value={intel.website?.quality_score ? `${intel.website.quality_score}/100` : "—"} />
                  <Row label="Online booking" value={intel.website?.has_online_booking ? `✓ ${intel.website.booking_platform || "Yes"}` : "✗ No"} highlight={intel.website?.has_online_booking ? C.confirmed : C.callback} />
                  <Row label="Price list" value={intel.website?.has_price_list ? "✓ Yes" : "✗ No"} highlight={intel.website?.has_price_list ? C.confirmed : C.callback} />
                  <Row label="Google rating" value={intel.google?.rating ? `⭐ ${intel.google.rating} (${intel.google.review_count} reviews)` : "—"} />
                  <Row label="Sentiment" value={intel.google?.recent_reviews_sentiment || "—"} />
                </Section>
              </div>

              {/* Social & Ads */}
              <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: "16px 20px" }}>
                <Section title="SOCIAL & ADS" accent={C.accent}>
                  <Row label="Instagram" value={intel.social_media?.instagram_handle ? `@${intel.social_media.instagram_handle}` : "—"} />
                  <Row label="IG followers" value={intel.social_media?.instagram_followers || "—"} />
                  <Row label="Last post" value={intel.social_media?.instagram_last_post || "—"} />
                  <Row label="FB followers" value={intel.social_media?.facebook_followers || "—"} />
                  <Row label="Google Ads" value={intel.ads?.running_google_ads ? "✓ Running" : "✗ None"} highlight={intel.ads?.running_google_ads ? C.confirmed : C.callback} />
                  <Row label="Meta Ads" value={intel.ads?.running_facebook_ads ? "✓ Running" : "✗ None"} highlight={intel.ads?.running_facebook_ads ? C.confirmed : C.callback} />
                </Section>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              {/* Pain Points */}
              <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: "16px 20px" }}>
                <Section title="PAIN POINTS" accent={C.dead}>
                  {(intel.pain_points || []).filter(Boolean).map((p, i) => <Bullet key={i} text={p} color={C.dead} />)}
                </Section>
              </div>

              {/* Talking Points */}
              <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: "16px 20px" }}>
                <Section title="TALKING POINTS" accent={C.confirmed}>
                  {(intel.talking_points || []).filter(Boolean).map((p, i) => <Bullet key={i} text={p} color={C.confirmed} />)}
                </Section>
              </div>
            </div>

            {/* Opportunities */}
            {intel.opportunities && Object.values(intel.opportunities).some(Boolean) && (
              <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: "16px 20px" }}>
                <Section title="OPPORTUNITIES">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                    <OppCard label="SEO" text={intel.opportunities?.seo} icon="🔍" />
                    <OppCard label="GOOGLE ADS" text={intel.opportunities?.google_ads} icon="📢" />
                    <OppCard label="SOCIAL MEDIA" text={intel.opportunities?.social_media} icon="📱" />
                    <OppCard label="BOOKING SYSTEM" text={intel.opportunities?.booking_system} icon="📅" />
                    <OppCard label="CRM" text={intel.opportunities?.crm} icon="🗂" />
                    <OppCard label="WHATSAPP" text={intel.opportunities?.whatsapp} icon="💬" />
                  </div>
                </Section>
              </div>
            )}

          </div>
        )}
      </div>
    </Shell>
  );
}