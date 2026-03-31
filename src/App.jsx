import { useState, useRef, useEffect } from "react";

(() => {
  const s = document.createElement("style");
  s.textContent = `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@500;600;700;800&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400;500&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #EDF0F5; }
  ::-webkit-scrollbar-thumb { background: #C8D0DC; border-radius: 2px; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
  @keyframes barFill { from { width: 0%; } to { width: var(--w); } }
  @keyframes noteSlide { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }
  .fade-up { animation: fadeUp 0.3s ease forwards; }
  .note-slide { animation: noteSlide 0.2s ease forwards; }
  .score-bar span { animation: barFill 0.8s cubic-bezier(.4,0,.2,1) forwards; }
  textarea { resize: none; outline: none; }
  `;
  document.head.appendChild(s);
})();

const C = {
  bg: "#EDF0F5", surface: "#FFFFFF", card: "#FFFFFF", border: "#D8DEE9",
  accent: "#9A7A30", accentDim: "rgba(154,122,48,0.10)", accentGlow: "rgba(154,122,48,0.05)",
  text: "#141E2C", muted: "#7888A0", subtle: "#F0F3F8",
  new: "#2E7BC4", callback: "#C4760A", confirmed: "#2A9455", dead: "#6B7B8D", in_progress: "#6650B8",
  newBg: "rgba(46,123,196,0.10)", callbackBg: "rgba(196,118,10,0.10)", confirmedBg: "rgba(42,148,85,0.10)",
  deadBg: "rgba(107,123,141,0.12)", inProgressBg: "rgba(102,80,184,0.10)",
};

const T = {
  heading: { fontFamily: "'Syne', sans-serif" },
  body: { fontFamily: "'DM Sans', sans-serif" },
  mono: { fontFamily: "'DM Mono', monospace" },
};

const STATUS_META = {
  new:         { label: "New",         color: C.new,         bg: C.newBg },
  in_progress: { label: "In Progress", color: C.in_progress, bg: C.inProgressBg },
  callback:    { label: "Callback",    color: C.callback,    bg: C.callbackBg },
  confirmed:   { label: "Confirmed",   color: C.confirmed,   bg: C.confirmedBg },
  dead:        { label: "Dead",        color: C.dead,        bg: C.deadBg },
};

const ALL_STATUSES = ["new", "in_progress", "callback", "confirmed", "dead"];

const LEADS_INIT = [
  {
    id: "L-001", business: "Harley Street Aesthetics", industry: "Aesthetics", city: "London",
    status: "new", assigned: "Mahmoud G.", lastActivity: "Added 2h ago",
    contact: { name: "Dr. Emma Walsh", role: "Clinic Director", phone: "+44 20 7946 0001", email: "e.walsh@harleyaesthetics.co.uk" },
    intel: {
      websiteScore: 42, googleRating: 3.8, googleReviews: 14, isRunningAds: false, seoScore: 28, socialScore: 18,
      painPoints: ["Website scores 42/100 — slow, no booking widget", "Google rating 3.8 below 4.2 area average", "Only 14 reviews — weak social proof for new patients", "No paid ads — competitors capturing missed demand", "Social media dormant for 3 months"],
      talkingPoints: ["Open with: we charge only per confirmed booking — zero upfront risk", "Their 3.8 rating is visibly costing them walk-ins — lead with it", "Two competitors within 0.5 miles are running active Meta campaigns", "Ask: what does a new aesthetic client spend on first visit?", "Close on the performance model — they pay only when you deliver"],
    },
  },
  {
    id: "L-002", business: "Smile Studio Manchester", industry: "Dental", city: "Manchester",
    status: "callback", assigned: "Sarah K.", lastActivity: "Called yesterday",
    contact: { name: "Mark Patel", role: "Practice Manager", phone: "+44 161 946 0042", email: "mark@smilestudio.co.uk" },
    intel: {
      websiteScore: 67, googleRating: 4.1, googleReviews: 38, isRunningAds: true, seoScore: 51, socialScore: 44,
      painPoints: ["Running ads but no call tracking — burning budget blind", "3 negative reviews unanswered for 2 weeks", "Landing page has no testimonials above the fold", "No follow-up system — losing warm leads after inquiry"],
      talkingPoints: ["They're spending on ads but not measuring — this is your hook", "Offer to audit their current ad spend as a free opener", "Ask: how many inquiries convert to booked appointments?"],
    },
  },
  {
    id: "L-003", business: "Revive Skin Clinic", industry: "Aesthetics", city: "Birmingham",
    status: "confirmed", assigned: "Mahmoud G.", lastActivity: "Confirmed 3 days ago",
    contact: { name: "Lisa Chen", role: "Owner", phone: "+44 121 946 0077", email: "lisa@reviveskin.co.uk" },
    intel: {
      websiteScore: 55, googleRating: 4.4, googleReviews: 62, isRunningAds: false, seoScore: 38, socialScore: 60,
      painPoints: ["Good social presence but no paid amplification", "No website booking widget — all bookings by phone only", "SEO below local competitors for 'skin clinic Birmingham'"],
      talkingPoints: ["Strong foundation — pitch this as scaling what's working", "Booking widget + Meta ads is the natural next step", "Their Instagram following is an asset — paid social will convert it"],
    },
  },
  {
    id: "L-004", business: "ClearView Dental Spa", industry: "Dental", city: "Leeds",
    status: "in_progress", assigned: "Sarah K.", lastActivity: "In call",
    contact: { name: "Dr. Raj Sharma", role: "Principal Dentist", phone: "+44 113 946 0019", email: "raj@clearviewdental.co.uk" },
    intel: {
      websiteScore: 31, googleRating: 3.5, googleReviews: 9, isRunningAds: false, seoScore: 15, socialScore: 8,
      painPoints: ["Website almost invisible online — scores 31/100", "Only 9 Google reviews and a 3.5 rating", "Zero social presence — no Facebook or Instagram found", "No ads, no SEO, no reviews — starting from scratch"],
      talkingPoints: ["Full rebuild opportunity — highest value engagement", "Frame it as: competitors are eating your lunch daily", "Offer a review generation campaign as the urgent first move"],
    },
  },
  {
    id: "L-005", business: "NovaDerm London", industry: "Aesthetics", city: "London",
    status: "new", assigned: "Mahmoud G.", lastActivity: "Added today",
    contact: { name: "Sophie Adler", role: "Marketing Manager", phone: "+44 20 7946 0088", email: "s.adler@novaderm.co.uk" },
    intel: {
      websiteScore: 78, googleRating: 4.6, googleReviews: 124, isRunningAds: true, seoScore: 72, socialScore: 68,
      painPoints: ["Cost-per-booking is £180 — industry avg is £90", "Good ratings but slow review response time", "Instagram engaged but no link-in-bio booking flow"],
      talkingPoints: ["Pitch on efficiency, not activation — they're already running ads", "Cut their cost-per-booking in half — open with that number", "A/B test their landing page as quick proof of value"],
    },
  },
  {
    id: "L-006", business: "Prestige Dental Care", industry: "Dental", city: "Bristol",
    status: "dead", assigned: "Sarah K.", lastActivity: "Closed 1 week ago",
    contact: { name: "Helen Booth", role: "Receptionist", phone: "+44 117 946 0031", email: "info@prestigedental.co.uk" },
    intel: {
      websiteScore: 60, googleRating: 4.3, googleReviews: 47, isRunningAds: true, seoScore: 55, socialScore: 35,
      painPoints: ["Already under contract with another agency"],
      talkingPoints: ["Re-approach in 6 months when contract may be up"],
    },
  },
  {
    id: "L-007", business: "Aurora Aesthetics", industry: "Aesthetics", city: "Edinburgh",
    status: "confirmed", assigned: "Mahmoud G.", lastActivity: "Confirmed 1 week ago",
    contact: { name: "Dr. Fiona MacLeod", role: "Clinic Owner", phone: "+44 131 946 0054", email: "fiona@auroraesthetics.co.uk" },
    intel: {
      websiteScore: 49, googleRating: 4.0, googleReviews: 29, isRunningAds: false, seoScore: 33, socialScore: 41,
      painPoints: ["Good local reputation not reflected online", "Website lacks before/after gallery — key conversion element", "No paid presence in the Edinburgh market"],
      talkingPoints: ["Strong word of mouth — amplify it digitally", "Before/after gallery + paid social is the proven formula for aesthetics"],
    },
  },
  {
    id: "L-008", business: "BrightSmile Dental", industry: "Dental", city: "Liverpool",
    status: "callback", assigned: "Sarah K.", lastActivity: "Callback Fri 10am",
    contact: { name: "Tom Griffiths", role: "Practice Owner", phone: "+44 151 946 0063", email: "tom@brightsmile.co.uk" },
    intel: {
      websiteScore: 53, googleRating: 4.2, googleReviews: 33, isRunningAds: false, seoScore: 42, socialScore: 29,
      painPoints: ["No patient acquisition system in place", "Website has no lead capture — visitors bounce with no follow-up", "Invisalign not prominently featured — missing high-value treatment"],
      talkingPoints: ["Invisalign landing page + Meta retargeting is a proven combo", "Ask if they track where new patients hear about them", "Offer: first 5 confirmed bookings, then decide — no risk"],
    },
  },
];

const BOOKINGS = [
  { id: "B-001", business: "Revive Skin Clinic",  service: "Facial Aesthetics Package",  value: 2800, commission: 560, adSpend: 380, date: "28 Mar 2026" },
  { id: "B-002", business: "Aurora Aesthetics",   service: "Botox + Filler Combo",        value: 1950, commission: 390, adSpend: 240, date: "25 Mar 2026" },
  { id: "B-003", business: "Revive Skin Clinic",  service: "Skin Rejuvenation Course",    value: 3400, commission: 680, adSpend: 420, date: "20 Mar 2026" },
  { id: "B-004", business: "Aurora Aesthetics",   service: "Anti-Wrinkle Treatment",      value: 1200, commission: 240, adSpend: 160, date: "15 Mar 2026" },
];

// ── Status Dropdown ────────────────────────────────────────────────────────────
function StatusSelect({ status, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const m = STATUS_META[status];

  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block" }}>
      <button onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
        style={{ ...T.mono, fontSize: 11, fontWeight: 500, letterSpacing: "0.04em", padding: "4px 9px", borderRadius: 5, color: m.color, background: m.bg, border: `1px solid ${m.color}35`, cursor: "pointer", display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
        {m.label.toUpperCase()} <span style={{ fontSize: 8, opacity: 0.7 }}>▾</span>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 5px)", right: 0, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 9, overflow: "hidden", zIndex: 100, minWidth: 138, boxShadow: "0 12px 32px rgba(0,0,0,0.45)" }}>
          {ALL_STATUSES.map(s => {
            const sm = STATUS_META[s];
            const active = s === status;
            return (
              <button key={s} onClick={(e) => { e.stopPropagation(); onChange(s); setOpen(false); }}
                style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "9px 14px", border: "none", background: active ? C.accentDim : "transparent", cursor: "pointer", ...T.body, fontSize: 12, color: active ? C.accent : C.text, textAlign: "left", transition: "background 0.1s" }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = C.subtle; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: sm.color, flexShrink: 0 }} />
                {sm.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Score Bar ─────────────────────────────────────────────────────────────────
function ScoreBar({ label, value, max = 100, color }) {
  const pct = Math.min((value / max) * 100, 100);
  const col = color || (pct >= 70 ? C.confirmed : pct >= 40 ? C.callback : "#E05555");
  return (
    <div style={{ marginBottom: 13 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ ...T.body, fontSize: 12, color: C.muted }}>{label}</span>
        <span style={{ ...T.mono, fontSize: 12, color: col }}>{value}{max === 5 ? "/5.0" : "/100"}</span>
      </div>
      <div className="score-bar" style={{ height: 4, background: C.border, borderRadius: 2, overflow: "hidden" }}>
        <span style={{ "--w": `${pct}%`, display: "block", height: "100%", width: `${pct}%`, background: col, borderRadius: 2 }} />
      </div>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 16px", borderRadius: 8, border: "none", cursor: "pointer", background: active ? C.accentDim : "transparent", color: active ? C.accent : C.muted, ...T.body, fontSize: 13, fontWeight: active ? 500 : 400, transition: "all 0.15s", textAlign: "left" }}>
      <span style={{ fontSize: 14 }}>{icon}</span>{label}
      {active && <span style={{ marginLeft: "auto", width: 4, height: 4, borderRadius: "50%", background: C.accent }} />}
    </button>
  );
}

// ── Pipeline View ─────────────────────────────────────────────────────────────
function PipelineView({ leads, onLeadUpdate, onSelectLead }) {
  const [filter, setFilter] = useState("all");
  const [openNote, setOpenNote] = useState(null);
  const [notes, setNotes] = useState({});
  const [drafts, setDrafts] = useState({});

  const filtered = filter === "all" ? leads : leads.filter(l => l.status === filter);
  const counts = Object.fromEntries(
    ["all", ...ALL_STATUSES].map(s => [s, s === "all" ? leads.length : leads.filter(l => l.status === s).length])
  );

  const toggleNote = (id) => {
    if (openNote === id) { setOpenNote(null); return; }
    setDrafts(d => ({ ...d, [id]: notes[id] || "" }));
    setOpenNote(id);
  };

  const saveNote = (id) => {
    setNotes(n => ({ ...n, [id]: drafts[id] }));
    setOpenNote(null);
  };

  // Grid columns: avatar | business | assigned | last activity | status | notes btn
  const COLS = "40px 1fr 96px 150px 130px 36px";

  return (
    <div className="fade-up">
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ ...T.heading, fontSize: 22, color: C.text, fontWeight: 700, marginBottom: 4 }}>Pipeline</h2>
        <p style={{ ...T.body, fontSize: 13, color: C.muted }}>{leads.length} leads tracked · {counts.callback} callbacks pending</p>
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

      {/* Table header */}
      <div style={{ display: "grid", gridTemplateColumns: COLS, gap: 12, padding: "7px 16px 10px", borderBottom: `1px solid ${C.border}` }}>
        {["","Business","Assigned","Last activity","Status",""].map((h,i) => (
          <span key={i} style={{ ...T.mono, fontSize: 10, color: C.muted, letterSpacing: "0.07em" }}>{h.toUpperCase()}</span>
        ))}
      </div>

      {/* Rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 2 }}>
        {filtered.map((lead) => (
          <div key={lead.id}>
            {/* Row */}
            <div
              style={{ display: "grid", gridTemplateColumns: COLS, gap: 12, alignItems: "center", padding: "11px 16px", borderRadius: openNote === lead.id ? "9px 9px 0 0" : 9, border: `1px solid ${openNote === lead.id ? C.accent+"45" : "transparent"}`, borderBottom: openNote === lead.id ? `1px solid ${C.border}` : `1px solid transparent`, cursor: "default", transition: "all 0.12s", background: openNote === lead.id ? C.accentGlow : "transparent" }}
              onMouseEnter={e => { if (openNote !== lead.id) e.currentTarget.style.background = C.card; }}
              onMouseLeave={e => { if (openNote !== lead.id) e.currentTarget.style.background = "transparent"; }}>

              {/* Avatar */}
              <div onClick={() => onSelectLead(lead)} style={{ width: 34, height: 34, borderRadius: 8, background: C.accentDim, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>
                <span style={{ ...T.heading, fontSize: 13, color: C.accent, fontWeight: 700 }}>{lead.business[0]}</span>
              </div>

              {/* Business */}
              <div onClick={() => onSelectLead(lead)} style={{ minWidth: 0, cursor: "pointer" }}>
                <div style={{ ...T.body, fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lead.business}</div>
                <div style={{ ...T.mono, fontSize: 11, color: C.muted }}>{lead.city} · {lead.industry}</div>
              </div>

              {/* Assigned */}
              <div style={{ ...T.body, fontSize: 12, color: C.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {lead.assigned}
              </div>

              {/* Last activity */}
              <div style={{ ...T.mono, fontSize: 11, color: C.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "flex", alignItems: "center", gap: 5 }}>
                {notes[lead.id] && <span style={{ color: C.accent, fontSize: 12 }}>✎</span>}
                {lead.lastActivity}
              </div>

              {/* Status */}
              <div onClick={e => e.stopPropagation()}>
                <StatusSelect status={lead.status} onChange={(s) => onLeadUpdate(lead.id, { status: s })} />
              </div>

              {/* Notes button */}
              <button onClick={(e) => { e.stopPropagation(); toggleNote(lead.id); }} title="Notes"
                style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${openNote===lead.id ? C.accent+"60" : C.border}`, background: openNote===lead.id ? C.accentDim : "transparent", color: openNote===lead.id ? C.accent : C.muted, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.13s", flexShrink: 0 }}>
                ✎
              </button>
            </div>

            {/* Notes panel */}
            {openNote === lead.id && (
              <div className="note-slide" style={{ background: C.card, border: `1px solid ${C.accent}40`, borderTop: "none", borderRadius: "0 0 9px 9px", padding: "14px 16px" }}>
                <div style={{ ...T.mono, fontSize: 10, color: C.accent, letterSpacing: "0.08em", marginBottom: 8 }}>NOTES — {lead.business}</div>
                <textarea
                  value={drafts[lead.id] || ""}
                  onChange={e => setDrafts(d => ({ ...d, [lead.id]: e.target.value }))}
                  placeholder="Add your notes — what was said, follow-up details, anything useful..."
                  rows={3}
                  style={{ width: "100%", background: C.subtle, border: `1px solid ${C.border}`, borderRadius: 7, padding: "10px 12px", ...T.body, fontSize: 13, color: C.text, lineHeight: 1.6 }}
                />
                <div style={{ display: "flex", gap: 8, marginTop: 10, justifyContent: "flex-end" }}>
                  <button onClick={() => setOpenNote(null)}
                    style={{ ...T.body, fontSize: 12, padding: "6px 14px", borderRadius: 7, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, cursor: "pointer" }}>
                    Cancel
                  </button>
                  <button onClick={() => saveNote(lead.id)}
                    style={{ ...T.body, fontSize: 12, fontWeight: 500, padding: "6px 16px", borderRadius: 7, border: "none", background: C.accent, color: "#141E2C", cursor: "pointer" }}>
                    Save note
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Pre-Call Brief ────────────────────────────────────────────────────────────
function BriefView({ leads }) {
  const [selected, setSelected] = useState(leads[0]);
  const i = selected.intel;

  return (
    <div className="fade-up" style={{ display: "grid", gridTemplateColumns: "210px 1fr", gap: 16, height: "100%" }}>
      {/* Lead list */}
      <div style={{ display: "flex", flexDirection: "column", gap: 3, overflowY: "auto" }}>
        <p style={{ ...T.mono, fontSize: 10, color: C.muted, letterSpacing: "0.08em", padding: "0 8px", marginBottom: 6 }}>SELECT LEAD</p>
        {leads.filter(l => l.status !== "dead").map(lead => (
          <button key={lead.id} onClick={() => setSelected(lead)}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, border: `1px solid ${selected.id===lead.id ? C.accent+"55" : "transparent"}`, background: selected.id===lead.id ? C.accentDim : "transparent", cursor: "pointer", textAlign: "left", transition: "all 0.13s" }}
            onMouseEnter={e => { if (selected.id!==lead.id) e.currentTarget.style.background = C.subtle; }}
            onMouseLeave={e => { if (selected.id!==lead.id) e.currentTarget.style.background = "transparent"; }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...T.body, fontSize: 12, fontWeight: 500, color: selected.id===lead.id ? C.accent : C.text, marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lead.business}</div>
              <div style={{ ...T.mono, fontSize: 10, color: C.muted }}>{lead.city}</div>
            </div>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: STATUS_META[lead.status].color, flexShrink: 0 }} />
          </button>
        ))}
      </div>

      {/* Detail */}
      <div key={selected.id} className="fade-up" style={{ display: "flex", flexDirection: "column", gap: 14, overflowY: "auto" }}>
        <div style={{ padding: "20px 22px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, display: "flex", alignItems: "flex-start", gap: 18 }}>
          <div style={{ width: 50, height: 50, borderRadius: 12, background: C.accentDim, border: `1px solid ${C.accent}40`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ ...T.heading, fontSize: 20, color: C.accent, fontWeight: 700 }}>{selected.business[0]}</span>
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ ...T.heading, fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 3 }}>{selected.business}</h3>
            <div style={{ ...T.mono, fontSize: 11, color: C.muted, marginBottom: 10 }}>{selected.city} · {selected.industry}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[`📞 ${selected.contact.phone}`,`👤 ${selected.contact.name} — ${selected.contact.role}`,`✉ ${selected.contact.email}`].map((item,idx) => (
                <div key={idx} style={{ ...T.mono, fontSize: 11, color: C.text, background: C.subtle, padding: "4px 10px", borderRadius: 5 }}>{item}</div>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            <button style={{ ...T.body, fontSize: 12, padding: "8px 14px", borderRadius: 8, border: `1px solid ${C.border}`, background: C.subtle, color: C.muted, cursor: "pointer" }}>Callback</button>
            <button style={{ ...T.body, fontSize: 12, fontWeight: 600, padding: "8px 18px", borderRadius: 8, border: "none", background: C.accent, color: "#FFFFFF", cursor: "pointer" }}>📞 Call Now</button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ padding: "18px 20px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 12 }}>
            <p style={{ ...T.mono, fontSize: 10, color: C.muted, letterSpacing: "0.08em", marginBottom: 16 }}>INTELLIGENCE SCORES</p>
            <ScoreBar label="Website quality" value={i.websiteScore} />
            <ScoreBar label="SEO visibility" value={i.seoScore} />
            <ScoreBar label="Social presence" value={i.socialScore} />
            <ScoreBar label="Google rating" value={i.googleRating} max={5} color={i.googleRating>=4.2?C.confirmed:i.googleRating>=3.8?C.callback:"#E05555"} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
              <span style={{ ...T.body, fontSize: 12, color: C.muted }}>{i.googleReviews} Google reviews</span>
              <span style={{ ...T.mono, fontSize: 11, padding: "2px 8px", borderRadius: 4, background: i.isRunningAds ? C.confirmedBg : C.callbackBg, color: i.isRunningAds ? C.confirmed : C.callback }}>{i.isRunningAds ? "Ads active" : "No ads running"}</span>
            </div>
          </div>

          <div style={{ padding: "18px 20px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 12 }}>
            <p style={{ ...T.mono, fontSize: 10, color: C.muted, letterSpacing: "0.08em", marginBottom: 14 }}>PAIN POINTS</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {i.painPoints.map((pt,idx) => (
                <div key={idx} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ color: "#E05555", fontSize: 11, flexShrink: 0, marginTop: 2 }}>✕</span>
                  <span style={{ ...T.body, fontSize: 12, color: C.text, lineHeight: 1.5 }}>{pt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ padding: "18px 20px", background: C.card, border: `1px solid ${C.accent}35`, borderRadius: 12 }}>
          <p style={{ ...T.mono, fontSize: 10, color: C.accent, letterSpacing: "0.08em", marginBottom: 14 }}>TALKING POINTS</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {i.talkingPoints.map((pt,idx) => (
              <div key={idx} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span style={{ ...T.mono, fontSize: 11, color: C.accent, flexShrink: 0, marginTop: 2 }}>{String(idx+1).padStart(2,"0")}</span>
                <span style={{ ...T.body, fontSize: 13, color: C.text, lineHeight: 1.55 }}>{pt}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Revenue View ──────────────────────────────────────────────────────────────
function RevenueView({ bookings }) {
  const totalValue = bookings.reduce((s,b) => s+b.value, 0);
  const totalComm  = bookings.reduce((s,b) => s+b.commission, 0);
  const totalSpend = bookings.reduce((s,b) => s+b.adSpend, 0);
  const roi = ((totalValue - totalSpend) / totalSpend * 100).toFixed(0);

  const StatCard = ({ label, value, sub, accent }) => (
    <div style={{ padding: "20px 22px", background: C.card, border: `1px solid ${accent ? C.accent+"45" : C.border}`, borderRadius: 12 }}>
      <p style={{ ...T.mono, fontSize: 10, color: C.muted, letterSpacing: "0.08em", marginBottom: 12 }}>{label}</p>
      <p style={{ ...T.heading, fontSize: 26, fontWeight: 700, color: accent ? C.accent : C.text, marginBottom: 4 }}>{value}</p>
      {sub && <p style={{ ...T.body, fontSize: 12, color: C.muted }}>{sub}</p>}
    </div>
  );

  return (
    <div className="fade-up">
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ ...T.heading, fontSize: 22, color: C.text, fontWeight: 700, marginBottom: 4 }}>Revenue</h2>
        <p style={{ ...T.body, fontSize: 13, color: C.muted }}>Commission tracking and ROI across all confirmed bookings</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        <StatCard label="CONFIRMED BOOKINGS" value={bookings.length} sub="This month" />
        <StatCard label="TOTAL BOOKING VALUE" value={`£${totalValue.toLocaleString()}`} sub="Client revenue generated" />
        <StatCard label="COMMISSION EARNED" value={`£${totalComm.toLocaleString()}`} sub="At 20% rate" accent />
        <StatCard label="AD SPEND ROI" value={`${roi}%`} sub={`£${totalSpend.toLocaleString()} invested`} />
      </div>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}` }}>
          <p style={{ ...T.mono, fontSize: 10, color: C.muted, letterSpacing: "0.08em" }}>RECENT BOOKINGS</p>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${C.border}` }}>
              {["ID","Business","Service","Value","Commission","Ad Spend","Date"].map(h => (
                <th key={h} style={{ ...T.mono, fontSize: 10, color: C.muted, padding: "10px 16px", textAlign: "left", fontWeight: 500, letterSpacing: "0.06em" }}>{h.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bookings.map((b,i) => (
              <tr key={b.id} style={{ borderBottom: i<bookings.length-1 ? `1px solid ${C.border}` : "none", transition: "background 0.1s" }}
                onMouseEnter={e => e.currentTarget.style.background = C.accentGlow}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <td style={{ ...T.mono, fontSize: 11, color: C.muted, padding: "13px 16px" }}>{b.id}</td>
                <td style={{ ...T.body, fontSize: 13, color: C.text, padding: "13px 16px", fontWeight: 500 }}>{b.business}</td>
                <td style={{ ...T.body, fontSize: 12, color: C.muted, padding: "13px 16px" }}>{b.service}</td>
                <td style={{ ...T.mono, fontSize: 13, color: C.text, padding: "13px 16px" }}>£{b.value.toLocaleString()}</td>
                <td style={{ ...T.mono, fontSize: 13, color: C.accent, padding: "13px 16px", fontWeight: 500 }}>£{b.commission.toLocaleString()}</td>
                <td style={{ ...T.mono, fontSize: 12, color: C.muted, padding: "13px 16px" }}>£{b.adSpend.toLocaleString()}</td>
                <td style={{ ...T.mono, fontSize: 11, color: C.muted, padding: "13px 16px" }}>{b.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("pipeline");
  const [leads, setLeads] = useState(LEADS_INIT);

  const updateLead = (id, changes) =>
    setLeads(ls => ls.map(l => l.id === id ? { ...l, ...changes } : l));

  return (
    <div style={{ display: "flex", height: "100vh", background: C.bg, color: C.text, fontFamily: "'DM Sans', sans-serif", overflow: "hidden" }}>
      {/* Sidebar */}
      <div style={{ width: 220, flexShrink: 0, background: C.surface, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", padding: "0 12px 20px" }}>
        <div style={{ padding: "22px 8px 28px" }}>
          <div style={{ ...T.heading, fontSize: 18, fontWeight: 800, color: C.text, letterSpacing: "-0.02em" }}>
            <span style={{ color: C.accent }}>A</span>SCENCIO
          </div>
          <div style={{ ...T.mono, fontSize: 10, color: C.muted, letterSpacing: "0.06em", marginTop: 2 }}>PERFORMANCE AGENCY</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
          <p style={{ ...T.mono, fontSize: 9, color: C.muted, letterSpacing: "0.1em", padding: "0 8px", marginBottom: 6 }}>WORKSPACE</p>
          <NavItem icon="◈" label="Pipeline"      active={tab==="pipeline"} onClick={() => setTab("pipeline")} />
          <NavItem icon="◎" label="Pre-Call Brief" active={tab==="brief"}    onClick={() => setTab("brief")} />
          <NavItem icon="◇" label="Revenue"        active={tab==="revenue"}  onClick={() => setTab("revenue")} />
        </div>
        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 10px", borderRadius: 8, background: C.subtle }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.accentDim, border: `1px solid ${C.accent}35`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ ...T.heading, fontSize: 12, color: C.accent, fontWeight: 700 }}>M</span>
            </div>
            <div>
              <div style={{ ...T.body, fontSize: 12, color: C.text, fontWeight: 500 }}>Mahmoud G.</div>
              <div style={{ ...T.mono, fontSize: 10, color: C.muted }}>Caller</div>
            </div>
          </div>
          <div style={{ ...T.mono, fontSize: 10, color: C.muted, padding: "0 8px", display: "flex", justifyContent: "space-between" }}>
            <span>v1.0 · Demo</span>
            <span style={{ color: C.confirmed }}>● Live</span>
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 28px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ ...T.mono, fontSize: 11, color: C.muted }}>
            {tab==="pipeline" && `${leads.length} leads · ${leads.filter(l=>l.status==="callback").length} callbacks pending`}
            {tab==="brief"    && "Pre-call intelligence brief"}
            {tab==="revenue"  && "March 2026 · 4 confirmed bookings"}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ ...T.body, fontSize: 12, padding: "6px 14px", borderRadius: 7, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, cursor: "pointer" }}>⬆ Import</button>
            <button style={{ ...T.body, fontSize: 12, padding: "6px 14px", borderRadius: 7, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, cursor: "pointer" }}>+ Add Lead</button>
            <button style={{ ...T.body, fontSize: 12, fontWeight: 500, padding: "6px 14px", borderRadius: 7, border: "none", background: C.accent, color: "#FFFFFF", cursor: "pointer" }}>Export</button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
          {tab==="pipeline" && <PipelineView leads={leads} onLeadUpdate={updateLead} onSelectLead={() => setTab("brief")} />}
          {tab==="brief"    && <BriefView leads={leads} />}
          {tab==="revenue"  && <RevenueView bookings={BOOKINGS} />}
        </div>
      </div>
    </div>
  );
}