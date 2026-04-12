"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Shell from "@/components/Shell";
import CityTabs from "@/components/CityTabs";
import FilterPanel from "@/components/FilterPanel";
import LeadDetailPanel from "@/components/LeadDetailPanel";
import TaskModal from "@/components/TaskModal";
import CallBar from "@/components/CallBar";
import CallStatsBar from "@/components/CallStatsBar";
import { StatusSelect, Spinner, ErrorMsg } from "@/components/ui";
import { C, T, ALL_STATUSES, STATUS_META } from "@/lib/tokens";
import { leads as leadsApi, contacts as contactsApi } from "@/lib/api";

const TAGS = ["New Lead", "Interested", "Quoted", "Follow Up", "Hot", "Cold", "VIP", "No Budget"];
const COLS = "1.8fr 1.1fr 130px 76px 110px 95px 110px 1fr";
const EMPTY_FILTERS = { sort_by: "created_at", sort_dir: "desc" };

function TagBadge({ tag, onRemove }) {
  const colors = {
    "New Lead":  { bg: "rgba(46,123,196,0.1)",  color: "#2E7BC4" },
    "Interested":{ bg: "rgba(59,168,106,0.1)",  color: "#2A9455" },
    "Quoted":    { bg: "rgba(102,80,184,0.1)",  color: "#6650B8" },
    "Follow Up": { bg: "rgba(196,118,10,0.1)",  color: "#C4760A" },
    "Hot":       { bg: "rgba(220,50,50,0.1)",   color: "#DC3232" },
    "Cold":      { bg: "rgba(107,123,141,0.1)", color: "#6B7B8D" },
    "VIP":       { bg: "rgba(154,122,48,0.12)", color: "#9A7A30" },
    "No Budget": { bg: "rgba(107,123,141,0.1)", color: "#6B7B8D" },
  };
  const style = colors[tag] || { bg: C.subtle, color: C.muted };
  return (
    <span style={{ ...T.mono, fontSize: 10, padding: "2px 7px", borderRadius: 4, background: style.bg, color: style.color, display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap" }}>
      {tag}
      {onRemove && <span onClick={e => { e.stopPropagation(); onRemove(); }} style={{ cursor: "pointer", opacity: 0.6, fontSize: 10 }}>×</span>}
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
  const toggle = (tag) => onChange(selectedTags.includes(tag) ? selectedTags.filter(t => t !== tag) : [...selectedTags, tag]);
  return (
    <div ref={ref} style={{ position: "relative" }} onClick={e => e.stopPropagation()}>
      <button onClick={() => setOpen(o => !o)} style={{ ...T.mono, fontSize: 10, padding: "3px 8px", borderRadius: 5, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, cursor: "pointer" }}>+ Tag</button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: 8, zIndex: 100, minWidth: 140, boxShadow: "0 8px 24px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column", gap: 4 }}>
          {TAGS.map(tag => (
            <button key={tag} onClick={() => toggle(tag)} style={{ ...T.body, fontSize: 12, padding: "5px 8px", borderRadius: 5, border: "none", background: selectedTags.includes(tag) ? C.accentDim : "transparent", color: selectedTags.includes(tag) ? C.accent : C.text, cursor: "pointer", textAlign: "left" }}>{tag}</button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PipelinePage() {
  const [leads, setLeads]           = useState([]);
  const [contacts, setContacts]     = useState({});
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [activeCity, setActiveCity] = useState("All");
  const [search, setSearch]         = useState("");
  const [filters, setFilters]       = useState(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  const [taskLead, setTaskLead]     = useState(null);
  const [callTarget, setCallTarget] = useState(null);
  const [localTags, setLocalTags]   = useState({});
  const [localFollowUp, setLocalFollowUp] = useState({});
  const searchTimer = useRef(null);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ...filters };
      if (activeCity !== "All") params.city = activeCity;
      if (search) params.search = search;
      const { no_website, never_contacted, source_operator, ...apiParams } = params;
      Object.keys(apiParams).forEach(k => {
        if (apiParams[k] === "" || apiParams[k] === null || apiParams[k] === undefined) delete apiParams[k];
      });
      let data = await leadsApi.list(apiParams);
      if (no_website) data = data.filter(l => !l.website_url);
      if (never_contacted) data = data.filter(l => !l.last_contacted_at);
      setLeads(data);
      data.forEach(async lead => {
        try {
          const c = await contactsApi.forLead(lead.id);
          if (c?.length) {
            const owner = c.find(x => x.role === "owner") || c.find(x => x.is_primary) || c[0];
            setContacts(prev => ({ ...prev, [lead.id]: owner }));
          }
        } catch {}
      });
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [filters, activeCity, search]);

  useEffect(() => { fetchLeads(); }, [filters, activeCity]);
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchLeads(), 400);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  const updateStatus = async (id, status) => {
    setLeads(ls => ls.map(l => l.id === id ? { ...l, status } : l));
    try { await leadsApi.updateStatus(id, status); } catch { fetchLeads(); }
  };

  const activeFilterCount = Object.entries(filters).filter(([k, v]) =>
    !["sort_by", "sort_dir"].includes(k) && v !== "" && v !== null && v !== undefined
  ).length;

  return (
    <Shell topbarText={`${leads.length} leads · ${leads.filter(l => l.status === "callback").length} callbacks pending`}>

      {showFilters && (
        <FilterPanel filters={filters} onChange={setFilters}
          onClose={() => setShowFilters(false)}
          onReset={() => { setFilters(EMPTY_FILTERS); setShowFilters(false); }} />
      )}

      {selectedLead && (
        <LeadDetailPanel lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdate={fetchLeads} />
      )}

      {taskLead && (
        <TaskModal lead={taskLead}
          onClose={() => setTaskLead(null)}
          onSaved={fetchLeads} />
      )}

      {callTarget && (
        <CallBar
          lead={callTarget.lead}
          contact={callTarget.contact}
          onClose={() => setCallTarget(null)}
          onCallLogged={fetchLeads}
        />
      )}

      <div className="fade-up">
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <h2 style={{ ...T.heading, fontSize: 22, color: C.text, fontWeight: 700, marginBottom: 4 }}>Pipeline</h2>
            <p style={{ ...T.body, fontSize: 13, color: C.muted }}>{leads.length} leads{activeCity !== "All" ? ` in ${activeCity}` : ""}</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search leads..."
              style={{ width: 210, padding: "7px 12px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, ...T.body, fontSize: 13, color: C.text, outline: "none" }} />
            <button onClick={() => setShowFilters(true)}
              style={{ padding: "7px 14px", borderRadius: 8, border: `1px solid ${activeFilterCount > 0 ? C.accent : C.border}`, background: activeFilterCount > 0 ? C.accentDim : "transparent", color: activeFilterCount > 0 ? C.accent : C.muted, ...T.body, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
              ⚙ Filters {activeFilterCount > 0 && <span style={{ background: C.accent, color: "#FFF", borderRadius: "50%", width: 17, height: 17, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>{activeFilterCount}</span>}
            </button>
          </div>
        </div>

        <CityTabs activeCity={activeCity} onChange={setActiveCity} />
        <CallStatsBar />

        {/* Table header */}
        <div style={{ display: "grid", gridTemplateColumns: COLS, gap: 12, padding: "7px 16px 10px", borderBottom: `1px solid ${C.border}` }}>
          {["Business / Address", "Owner", "Phone", "Actions", "Follow Up", "Stage", "Last Contact", "Tags"].map((h, i) => (
            <span key={i} style={{ ...T.mono, fontSize: 10, color: C.muted, letterSpacing: "0.07em" }}>{h.toUpperCase()}</span>
          ))}
        </div>

        {loading && <Spinner />}
        {error && <ErrorMsg message={error} />}

        <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 2 }}>
          {leads.map(lead => {
            const contact = contacts[lead.id];
            const followUp = localFollowUp[lead.id] ?? lead.follow_up_count ?? 0;
            const tags = localTags[lead.id] ?? lead.tags ?? [];
            const isSelected = selectedLead?.id === lead.id;

            return (
              <div key={lead.id}
                onClick={() => setSelectedLead(isSelected ? null : lead)}
                style={{ display: "grid", gridTemplateColumns: COLS, gap: 12, alignItems: "center", padding: "10px 16px", borderRadius: 9, border: `1px solid ${isSelected ? C.accent : "transparent"}`, background: isSelected ? C.accentDim : "transparent", transition: "all 0.12s", cursor: "pointer" }}
                onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.background = C.card; e.currentTarget.style.borderColor = C.border; } }}
                onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderColor = "transparent"; } }}>

                <div style={{ minWidth: 0 }}>
                  <div style={{ ...T.body, fontSize: 13, fontWeight: 500, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lead.business_name}</div>
                  <div style={{ ...T.mono, fontSize: 10, color: C.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{lead.address ? lead.address.slice(0, 30) : lead.city}</div>
                </div>

                <div style={{ minWidth: 0 }}>
                  <div style={{ ...T.body, fontSize: 12, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{contact?.name || "—"}</div>
                  <div style={{ ...T.mono, fontSize: 10, color: C.muted }}>{contact?.role || ""}</div>
                </div>

                <div style={{ ...T.mono, fontSize: 11, color: C.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{contact?.phone || "—"}</div>

                {/* Action buttons */}
                <div style={{ display: "flex", gap: 4 }} onClick={e => e.stopPropagation()}>
                  <button title="Call" onClick={() => setCallTarget({ lead, contact })}
                    style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${C.confirmedBg}`, background: C.confirmedBg, color: C.confirmed, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>📞</button>
                  <button title="SMS" onClick={() => window.location.href = `/inbox?lead=${lead.id}`}
                    style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${C.newBg}`, background: C.newBg, color: C.new, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>💬</button>
                  <button title="Task" onClick={() => setTaskLead(lead)}
                    style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${C.callbackBg}`, background: C.callbackBg, color: C.callback, cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>📅</button>
                </div>

                {/* Follow up dots */}
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <div style={{ display: "flex", gap: 2 }}>
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: i < followUp ? C.accent : C.border }} />
                    ))}
                  </div>
                  <button onClick={e => { e.stopPropagation(); setLocalFollowUp(p => ({ ...p, [lead.id]: Math.min((p[lead.id] ?? lead.follow_up_count ?? 0) + 1, 8) })); }}
                    style={{ ...T.mono, fontSize: 10, color: C.accent, background: "transparent", border: "none", cursor: "pointer", padding: 0 }}>+</button>
                </div>

                <div onClick={e => e.stopPropagation()}>
                  <StatusSelect status={lead.status} onChange={s => updateStatus(lead.id, s)} />
                </div>

                <div style={{ ...T.mono, fontSize: 10, color: lead.last_contacted_at ? C.text : C.muted }}>
                  {lead.last_contacted_at ? new Date(lead.last_contacted_at).toLocaleDateString("en-GB") : "Never"}
                </div>

                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }} onClick={e => e.stopPropagation()}>
                  {tags.map(tag => (
                    <TagBadge key={tag} tag={tag} onRemove={() => setLocalTags(p => ({ ...p, [lead.id]: tags.filter(t => t !== tag) }))} />
                  ))}
                  <TagSelector selectedTags={tags} onChange={next => setLocalTags(p => ({ ...p, [lead.id]: next }))} />
                </div>
              </div>
            );
          })}

          {!loading && leads.length === 0 && (
            <div style={{ textAlign: "center", padding: "48px 0", ...T.body, fontSize: 13, color: C.muted }}>
              No leads found{activeCity !== "All" ? ` in ${activeCity}` : ""}. Try adjusting your filters.
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}