"use client";
import { useState, useEffect } from "react";
import Shell from "@/components/Shell";
import { C, T } from "@/lib/tokens";
import { leads as leadsApi } from "@/lib/api";

const BASE = "http://localhost:8000";
const getToken = () => typeof window !== "undefined" ? localStorage.getItem("ascencio_token") : null;
const req = (path, opts = {}) => fetch(`${BASE}${path}`, { ...opts, headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}`, ...(opts.headers || {}) } }).then(r => r.json());

function buildPrompt(lead) {
  return [
    "You are a sales intelligence researcher for a UK digital marketing agency.",
    "Research this specific business. Visit real pages — do not guess.",
    "",
    "Business: " + lead.business_name,
    "Location: " + (lead.address || lead.city + ", UK"),
    "Website: " + (lead.website_url || "search for it"),
    "",
    "STEP 1 - Visit their website and check:",
    "  - Online booking? (Fresha, Calendly, Timely, Acuity, SimplyBook etc)",
    "  - Price list visible?",
    "  - Before/after gallery?",
    "  - Rate website quality 0-100",
    "  - Find email address in contact/footer/about page",
    "",
    "STEP 2 - Google the business name + city:",
    "  - Current Google rating and review count",
    "  - Recent review sentiment",
    "",
    "STEP 3 - Find email: website contact, Instagram bio, Facebook About",
    "",
    "STEP 4 - Find Instagram: followers, last post date, frequency, content type",
    "",
    "STEP 5 - Check Meta Ad Library for their name: active Facebook/Instagram ads?",
    "",
    "STEP 6 - Google 'aesthetics clinic " + lead.city + "': appear in paid results?",
    "",
    "Write a detailed research report with all your findings. Include all numbers, dates, specifics.",
    "Plain text — no JSON needed.",
  ].join("\n");
}

function ScoreMeter({ score }) {
  const color = score >= 75 ? C.confirmed : score >= 50 ? C.callback : C.new;
  const label = score >= 75 ? "Strong presence" : score >= 50 ? "Average presence" : "Weak — high opportunity";
  return (
    <div style={{ textAlign: "center", padding: "24px 0 16px" }}>
      <div style={{ fontSize: 56, fontWeight: 800, color, ...T.heading, lineHeight: 1 }}>{score}</div>
      <div style={{ ...T.mono, fontSize: 11, color: C.muted, marginTop: 6, letterSpacing: "0.08em" }}>DIGITAL SCORE / 100</div>
      <div style={{ ...T.body, fontSize: 13, color, marginTop: 8 }}>{label}</div>
      <div style={{ height: 6, background: C.border, borderRadius: 3, margin: "12px 0 0", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${score}%`, background: color, borderRadius: 3 }} />
      </div>
    </div>
  );
}

function DifficultyBadge({ difficulty }) {
  const map = {
    easy:   { label: "Easy call",  color: C.confirmed, bg: C.confirmedBg },
    medium: { label: "Medium",     color: C.callback,  bg: C.callbackBg },
    hard:   { label: "Hard call",  color: C.dead,      bg: C.deadBg },
  };
  const m = map[difficulty] || map.medium;
  return <span style={{ ...T.mono, fontSize: 11, padding: "4px 12px", borderRadius: 20, background: m.bg, color: m.color, fontWeight: 500 }}>{m.label}</span>;
}

function Section({ title, children, accent }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ ...T.mono, fontSize: 10, color: accent || C.accent, letterSpacing: "0.1em", fontWeight: 500, marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
        {title}<div style={{ flex: 1, height: 1, background: C.border }} />
      </div>
      {children}
    </div>
  );
}

function StatRow({ label, value, highlight }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "7px 0", borderBottom: `1px solid ${C.border}`, gap: 12 }}>
      <span style={{ ...T.body, fontSize: 13, color: C.muted, flexShrink: 0 }}>{label}</span>
      <span style={{ ...T.mono, fontSize: 12, color: highlight || C.text, fontWeight: highlight ? 500 : 400, textAlign: "right" }}>{value || "—"}</span>
    </div>
  );
}

function BulletList({ items, color }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {items?.filter(Boolean).map((item, i) => (
        <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: color || C.accent, marginTop: 5, flexShrink: 0 }} />
          <span style={{ ...T.body, fontSize: 13, color: C.text, lineHeight: 1.5 }}>{item}</span>
        </div>
      ))}
    </div>
  );
}

function OpportunityCard({ label, text, icon }) {
  if (!text) return null;
  return (
    <div style={{ padding: "12px 14px", background: C.subtle, borderRadius: 9, border: `1px solid ${C.border}`, marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span style={{ ...T.mono, fontSize: 10, color: C.accent, letterSpacing: "0.06em", fontWeight: 500 }}>{label}</span>
      </div>
      <p style={{ ...T.body, fontSize: 12, color: C.muted, lineHeight: 1.6, margin: 0 }}>{text}</p>
    </div>
  );
}

export default function BriefPage() {
  const [leads, setLeads]             = useState([]);
  const [selectedLead, setSelected]   = useState(null);
  const [intel, setIntel]             = useState(null);
  const [pasteMode, setPasteMode]     = useState(false);
  const [pasteText, setPasteText]     = useState("");
  const [parseError, setParseError]   = useState("");
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);
  const [copied, setCopied]           = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);
  const [search, setSearch]           = useState("");

  useEffect(() => { leadsApi.list().then(setLeads).catch(() => {}); }, []);

  useEffect(() => {
    if (!selectedLead) return;
    req(`/intelligence/${selectedLead.id}`)
      .then(d => { if (d?.raw_data) setIntel(d.raw_data); else setIntel(null); })
      .catch(() => setIntel(null));
  }, [selectedLead]);

  const filtered = leads.filter(l =>
    l.business_name.toLowerCase().includes(search.toLowerCase()) ||
    l.city.toLowerCase().includes(search.toLowerCase())
  );

  const copyPrompt = () => {
    if (!selectedLead) return;
    navigator.clipboard.writeText(buildPrompt(selectedLead));
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const copyEmail = (email) => {
    navigator.clipboard.writeText(email);
    setEmailCopied(true); setTimeout(() => setEmailCopied(false), 2000);
  };

  const parseAndDisplay = () => {
    setParseError("");
    try {
      const parsed = JSON.parse(pasteText.trim());
      setIntel(parsed);
      setPasteMode(false);
      setPasteText("");
    } catch (e) {
      setParseError("Invalid JSON — paste the clean JSON prepared by Claude in the chat, not raw Perplexity output.");
    }
  };

  const saveIntelligence = async () => {
    if (!intel || !selectedLead) return;
    setSaving(true);
    try {
      await req(`/intelligence/${selectedLead.id}/manual`, {
        method: "POST",
        body: JSON.stringify({ raw_data: intel }),
      });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
    } catch (e) { alert("Failed: " + e.message); }
    finally { setSaving(false); }
  };

  return (
    <Shell topbarText={selectedLead ? `Pre-Call Brief · ${selectedLead.business_name}` : "Pre-Call Brief"}>
      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 24, height: "calc(100vh - 120px)" }}>

        {/* Left — lead list */}
        <div style={{ display: "flex", flexDirection: "column", background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ ...T.mono, fontSize: 10, color: C.muted, letterSpacing: "0.08em", marginBottom: 8 }}>SELECT LEAD</div>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
              style={{ width: "100%", padding: "7px 10px", background: C.subtle, border: `1px solid ${C.border}`, borderRadius: 7, ...T.body, fontSize: 13, color: C.text, outline: "none" }} />
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {filtered.map(lead => {
              const active = selectedLead?.id === lead.id;
              return (
                <button key={lead.id} onClick={() => { setSelected(lead); setIntel(null); setPasteMode(false); setParseError(""); }}
                  style={{ width: "100%", padding: "10px 16px", border: "none", borderBottom: `1px solid ${C.border}`, background: active ? C.accentDim : "transparent", cursor: "pointer", textAlign: "left", display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ ...T.body, fontSize: 13, color: active ? C.accent : C.text, fontWeight: active ? 500 : 400 }}>{lead.business_name}</span>
                  <span style={{ ...T.mono, fontSize: 10, color: C.muted }}>{lead.city}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right */}
        <div style={{ overflowY: "auto" }}>
          {!selectedLead ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12 }}>
              <span style={{ fontSize: 40 }}>◎</span>
              <span style={{ ...T.body, fontSize: 14, color: C.muted }}>Select a lead to view or create a pre-call brief</span>
            </div>
          ) : (
            <div>
              {/* Header */}
              <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: "20px 24px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ ...T.heading, fontSize: 20, fontWeight: 700, color: C.text }}>{selectedLead.business_name}</div>
                  <div style={{ ...T.mono, fontSize: 12, color: C.muted, marginTop: 4 }}>{selectedLead.address || selectedLead.city} · {selectedLead.industry}</div>
                  {selectedLead.website_url && (
                    <a href={selectedLead.website_url} target="_blank" rel="noopener noreferrer"
                      style={{ ...T.mono, fontSize: 11, color: C.accent, marginTop: 4, display: "block" }}>{selectedLead.website_url} →</a>
                  )}
                  {intel?.email && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                      <span style={{ ...T.mono, fontSize: 11, color: C.confirmed }}>✉ {intel.email}</span>
                      <button onClick={() => copyEmail(intel.email)}
                        style={{ ...T.mono, fontSize: 10, padding: "2px 8px", borderRadius: 4, border: `1px solid ${C.confirmed}`, background: "transparent", color: C.confirmed, cursor: "pointer" }}>
                        {emailCopied ? "✓" : "Copy"}
                      </button>
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button onClick={copyPrompt}
                    style={{ ...T.body, fontSize: 12, padding: "7px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: copied ? C.confirmedBg : "transparent", color: copied ? C.confirmed : C.muted, cursor: "pointer" }}>
                    {copied ? "✓ Copied!" : "📋 Copy prompt"}
                  </button>
                  <button onClick={() => { setPasteMode(true); setParseError(""); }}
                    style={{ ...T.body, fontSize: 12, fontWeight: 500, padding: "7px 14px", borderRadius: 8, border: "none", background: C.accent, color: "#FFF", cursor: "pointer" }}>
                    + Paste JSON
                  </button>
                </div>
              </div>

              {/* Paste area */}
              {pasteMode && (
                <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.accent}`, padding: "20px 24px", marginBottom: 20 }}>
                  <div style={{ ...T.mono, fontSize: 11, color: C.accent, letterSpacing: "0.08em", marginBottom: 4 }}>PASTE CLEANED JSON</div>
                  <div style={{ ...T.body, fontSize: 12, color: C.muted, marginBottom: 12 }}>
                    Paste the clean JSON prepared by Claude in the chat — not raw Perplexity output.
                  </div>
                  <textarea value={pasteText} onChange={e => setPasteText(e.target.value)}
                    placeholder='{"business_name": "...", "email": "...", ...}'
                    rows={10}
                    style={{ width: "100%", padding: "12px", background: C.subtle, border: `1px solid ${C.border}`, borderRadius: 8, ...T.mono, fontSize: 12, color: C.text, outline: "none", resize: "vertical" }} />
                  {parseError && (
                    <div style={{ ...T.body, fontSize: 12, color: C.dead, marginTop: 8, padding: "10px 12px", background: C.deadBg, borderRadius: 7 }}>{parseError}</div>
                  )}
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button onClick={() => { setPasteMode(false); setPasteText(""); setParseError(""); }}
                      style={{ ...T.body, fontSize: 13, padding: "8px 16px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, cursor: "pointer" }}>
                      Cancel
                    </button>
                    <button onClick={parseAndDisplay} disabled={!pasteText.trim()}
                      style={{ ...T.body, fontSize: 13, fontWeight: 500, padding: "8px 24px", borderRadius: 8, border: "none", background: pasteText.trim() ? C.accent : C.border, color: "#FFF", cursor: pasteText.trim() ? "pointer" : "not-allowed" }}>
                      Load Brief
                    </button>
                  </div>
                </div>
              )}

              {/* Brief display */}
              {intel ? (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 16, marginBottom: 20 }}>
                    <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: "20px" }}>
                      <ScoreMeter score={intel.overall_digital_score || 0} />
                      <div style={{ textAlign: "center", marginTop: 12 }}><DifficultyBadge difficulty={intel.call_difficulty} /></div>
                    </div>
                    <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: "20px 24px" }}>
                      <Section title="SUMMARY">
                        {intel.email && (
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, padding: "8px 12px", background: C.confirmedBg, borderRadius: 7 }}>
                            <span>✉</span>
                            <span style={{ ...T.mono, fontSize: 13, color: C.confirmed, fontWeight: 500 }}>{intel.email}</span>
                            <button onClick={() => copyEmail(intel.email)}
                              style={{ ...T.mono, fontSize: 10, padding: "2px 8px", borderRadius: 4, border: `1px solid ${C.confirmed}`, background: "transparent", color: C.confirmed, cursor: "pointer", marginLeft: "auto" }}>
                              {emailCopied ? "✓" : "Copy"}
                            </button>
                          </div>
                        )}
                        <p style={{ ...T.body, fontSize: 14, color: C.text, lineHeight: 1.7 }}>{intel.summary}</p>
                      </Section>
                      {intel.recommended_services?.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
                          {intel.recommended_services.map(s => (
                            <span key={s} style={{ ...T.mono, fontSize: 10, padding: "3px 10px", borderRadius: 5, background: C.accentDim, color: C.accent }}>{s}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: "20px 24px" }}>
                      <Section title="DIGITAL PRESENCE">
                        <StatRow label="Website" value={intel.website?.url} />
                        <StatRow label="Quality" value={intel.website?.quality_score != null ? `${intel.website.quality_score}/100` : null} highlight={intel.website?.quality_score < 60 ? C.callback : C.confirmed} />
                        <StatRow label="Online booking" value={intel.website?.has_online_booking ? `✓ ${intel.website.booking_platform || "Yes"}` : "✗ No"} highlight={intel.website?.has_online_booking ? C.confirmed : C.callback} />
                        <StatRow label="Price list" value={intel.website?.has_price_list ? "✓ Yes" : "✗ No"} />
                        <StatRow label="Gallery" value={intel.website?.has_gallery ? "✓ Yes" : "✗ No"} />
                        <StatRow label="Google" value={intel.google?.rating ? `${intel.google.rating} ★  (${intel.google.review_count} reviews)` : null} />
                        <StatRow label="Sentiment" value={intel.google?.recent_reviews_sentiment} />
                        {intel.website?.notes && <div style={{ ...T.body, fontSize: 12, color: C.muted, marginTop: 10, lineHeight: 1.6, padding: "8px 10px", background: C.subtle, borderRadius: 7 }}>{intel.website.notes}</div>}
                      </Section>
                    </div>
                    <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: "20px 24px" }}>
                      <Section title="SOCIAL & ADS">
                        <StatRow label="Instagram" value={intel.social_media?.instagram_handle} />
                        <StatRow label="IG followers" value={intel.social_media?.instagram_followers} />
                        <StatRow label="Last post" value={intel.social_media?.instagram_last_post} />
                        <StatRow label="Frequency" value={intel.social_media?.instagram_post_frequency} />
                        <StatRow label="FB followers" value={intel.social_media?.facebook_followers} />
                        <StatRow label="Google Ads" value={intel.ads?.running_google_ads ? "✓ Running" : "✗ None"} highlight={intel.ads?.running_google_ads ? C.confirmed : C.callback} />
                        <StatRow label="Facebook Ads" value={intel.ads?.running_facebook_ads ? "✓ Running" : "✗ None"} highlight={intel.ads?.running_facebook_ads ? C.confirmed : C.callback} />
                        <StatRow label="Instagram Ads" value={intel.ads?.running_instagram_ads ? "✓ Running" : "✗ None"} highlight={intel.ads?.running_instagram_ads ? C.confirmed : C.callback} />
                        {intel.ads?.ad_quality_notes && <div style={{ ...T.body, fontSize: 12, color: C.muted, marginTop: 10, lineHeight: 1.6, padding: "8px 10px", background: C.subtle, borderRadius: 7 }}>{intel.ads.ad_quality_notes}</div>}
                      </Section>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: "20px 24px" }}>
                      <Section title="PAIN POINTS" accent={C.dead}>
                        <BulletList items={intel.pain_points} color={C.dead} />
                      </Section>
                    </div>
                    <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: "20px 24px" }}>
                      <Section title="TALKING POINTS" accent={C.confirmed}>
                        <BulletList items={intel.talking_points} color={C.confirmed} />
                      </Section>
                    </div>
                  </div>

                  <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: "20px 24px", marginBottom: 16 }}>
                    <Section title="OPPORTUNITIES">
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                        <OpportunityCard label="SEO"          text={intel.opportunities?.seo}            icon="🔍" />
                        <OpportunityCard label="GOOGLE ADS"   text={intel.opportunities?.google_ads}     icon="📢" />
                        <OpportunityCard label="SOCIAL MEDIA" text={intel.opportunities?.social_media}   icon="📱" />
                        <OpportunityCard label="BOOKING"      text={intel.opportunities?.booking_system} icon="📅" />
                        <OpportunityCard label="CRM"          text={intel.opportunities?.crm}            icon="🗂" />
                        <OpportunityCard label="WHATSAPP"     text={intel.opportunities?.whatsapp}       icon="💬" />
                      </div>
                    </Section>
                  </div>

                  {intel.services?.length > 0 && (
                    <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, padding: "20px 24px", marginBottom: 16 }}>
                      <Section title="THEIR SERVICES">
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {intel.services.map(s => (
                            <span key={s} style={{ ...T.body, fontSize: 12, padding: "4px 12px", borderRadius: 6, background: C.subtle, color: C.text, border: `1px solid ${C.border}` }}>{s}</span>
                          ))}
                        </div>
                        {intel.price_range && <div style={{ ...T.mono, fontSize: 12, color: C.muted, marginTop: 10 }}>Price range: {intel.price_range}</div>}
                      </Section>
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "flex-end", paddingBottom: 24 }}>
                    <button onClick={saveIntelligence} disabled={saving}
                      style={{ ...T.body, fontSize: 14, fontWeight: 500, padding: "10px 24px", borderRadius: 9, border: "none", background: saved ? "#2A9455" : C.accent, color: "#FFF", cursor: "pointer" }}>
                      {saved ? "✓ Saved to lead" : saving ? "Saving..." : "Save to lead"}
                    </button>
                  </div>
                </div>
              ) : (
                !pasteMode && (
                  <div style={{ background: C.surface, borderRadius: 12, border: `1px dashed ${C.border}`, padding: "48px 24px", textAlign: "center" }}>
                    <div style={{ fontSize: 36, marginBottom: 12 }}>🔍</div>
                    <div style={{ ...T.body, fontSize: 14, color: C.text, fontWeight: 500, marginBottom: 8 }}>No brief yet for this lead</div>
                    <div style={{ ...T.body, fontSize: 13, color: C.muted, maxWidth: 440, margin: "0 auto 8px", lineHeight: 1.6 }}>
                      1. Copy the research prompt below
                    </div>
                    <div style={{ ...T.body, fontSize: 13, color: C.muted, maxWidth: 440, margin: "0 auto 8px", lineHeight: 1.6 }}>
                      2. Run it in Perplexity Pro
                    </div>
                    <div style={{ ...T.body, fontSize: 13, color: C.muted, maxWidth: 440, margin: "0 auto 24px", lineHeight: 1.6 }}>
                      3. Paste the response in the Claude chat — Claude cleans it into JSON
                    </div>
                    <div style={{ ...T.body, fontSize: 13, color: C.muted, maxWidth: 440, margin: "0 auto 24px", lineHeight: 1.6 }}>
                      4. Paste that clean JSON here
                    </div>
                    <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                      <button onClick={copyPrompt}
                        style={{ ...T.body, fontSize: 13, padding: "9px 18px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, cursor: "pointer" }}>
                        {copied ? "✓ Copied" : "📋 Copy research prompt"}
                      </button>
                      <button onClick={() => setPasteMode(true)}
                        style={{ ...T.body, fontSize: 13, fontWeight: 500, padding: "9px 18px", borderRadius: 8, border: "none", background: C.accent, color: "#FFF", cursor: "pointer" }}>
                        Paste JSON
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}