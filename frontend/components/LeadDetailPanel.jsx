"use client";
import { useState, useEffect } from "react";
import { C, T } from "@/lib/tokens";
import { leads as leadsApi, contacts as contactsApi } from "@/lib/api";

const BASE = "http://localhost:8000";
const getToken = () => typeof window !== "undefined" ? localStorage.getItem("ascencio_token") : null;
const req = async (path, options = {}) => {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}`, ...(options.headers || {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail || JSON.stringify(err));
  }
  if (res.status === 204) return null;
  return res.json();
};

const PRESET_SERVICES = [
  "Booking Management", "SEO", "Google Ads", "CRM Setup",
  "Social Media", "WhatsApp Marketing", "Website Design",
  "Facebook Ads", "Instagram Ads", "Email Marketing",
];

function Field({ label, value, onChange, type = "text", placeholder = "" }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ ...T.mono, fontSize: 10, color: C.muted, letterSpacing: "0.07em", display: "block", marginBottom: 4 }}>{label}</label>
      <input type={type} value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width: "100%", padding: "7px 10px", background: C.subtle, border: `1px solid ${C.border}`, borderRadius: 7, ...T.body, fontSize: 13, color: C.text, outline: "none", boxSizing: "border-box" }} />
    </div>
  );
}

function ContactSection({ title, contact, leadId, onRefresh }) {
  const role = title.toLowerCase();
  const [name, setName]   = useState(contact?.name || "");
  const [phone, setPhone] = useState(contact?.phone || "");
  const [email, setEmail] = useState(contact?.email || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [error, setError]   = useState("");

  useEffect(() => {
    setName(contact?.name || "");
    // Pre-fill phone — covers imported contacts that have phone but no role
    setPhone(contact?.phone && contact.phone !== "N/A" ? contact.phone : "");
    setEmail(contact?.email || "");
    setError("");
  }, [contact?.id, contact?.phone]);

  const save = async () => {
    setError("");
    if (!name.trim() && !phone.trim()) { setError("Enter at least a name or phone number"); return; }
    setSaving(true);
    try {
      const payload = {
        name:     name.trim() || "Unknown",
        phone:    phone.trim() || "N/A",
        email:    email.trim() || null,
        role,
        is_primary: role === "owner",
      };
      if (contact?.id) {
        await contactsApi.update(contact.id, payload);
      } else {
        await contactsApi.create({ lead_id: leadId, ...payload });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onRefresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ ...T.mono, fontSize: 10, color: C.accent, letterSpacing: "0.1em", marginBottom: 10, fontWeight: 500 }}>{title.toUpperCase()}</div>
      <Field label="NAME" value={name} onChange={setName} placeholder={`${title} full name`} />
      <Field label="PHONE" value={phone} onChange={setPhone} placeholder="+44..." />
      <Field label="EMAIL" value={email} onChange={setEmail} type="email" placeholder="email@clinic.com" />
      {error && <div style={{ ...T.body, fontSize: 12, color: C.dead, marginBottom: 8 }}>{error}</div>}
      <button onClick={save} disabled={saving}
        style={{ ...T.body, fontSize: 12, padding: "6px 14px", borderRadius: 7, border: "none", background: saved ? "#2A9455" : C.accent, color: "#FFF", cursor: "pointer" }}>
        {saved ? "✓ Saved" : saving ? "Saving..." : `Save ${title}`}
      </button>
    </div>
  );
}

function ServicesSection({ leadId, services, onUpdate }) {
  const [selected, setSelected] = useState(services.map(s => s.name));
  const [custom, setCustom]     = useState("");
  const [saving, setSaving]     = useState(false);

  useEffect(() => { setSelected(services.map(s => s.name)); }, [services.length]);

  const toggle = async (name) => {
    try {
      if (selected.includes(name)) {
        const svc = services.find(s => s.name === name);
        if (svc) await req(`/services/${svc.id}`, { method: "DELETE" });
        setSelected(s => s.filter(x => x !== name));
      } else {
        await req("/services", { method: "POST", body: JSON.stringify({ lead_id: leadId, name }) });
        setSelected(s => [...s, name]);
      }
      onUpdate();
    } catch (e) { console.error(e); }
  };

  const addCustom = async () => {
    if (!custom.trim()) return;
    setSaving(true);
    try {
      await req("/services", { method: "POST", body: JSON.stringify({ lead_id: leadId, name: custom.trim() }) });
      setSelected(s => [...s, custom.trim()]);
      setCustom("");
      onUpdate();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ ...T.mono, fontSize: 10, color: C.accent, letterSpacing: "0.1em", marginBottom: 10, fontWeight: 500 }}>SERVICES INTERESTED IN</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        {PRESET_SERVICES.map(name => {
          const active = selected.includes(name);
          return (
            <button key={name} onClick={() => toggle(name)}
              style={{ ...T.mono, fontSize: 11, padding: "4px 10px", borderRadius: 5, border: `1px solid ${active ? C.accent : C.border}`, background: active ? C.accentDim : "transparent", color: active ? C.accent : C.muted, cursor: "pointer" }}>
              {name}
            </button>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <input value={custom} onChange={e => setCustom(e.target.value)} onKeyDown={e => e.key === "Enter" && addCustom()}
          placeholder="Add custom service..."
          style={{ flex: 1, padding: "6px 10px", background: C.subtle, border: `1px solid ${C.border}`, borderRadius: 7, ...T.body, fontSize: 12, color: C.text, outline: "none" }} />
        <button onClick={addCustom} disabled={saving}
          style={{ ...T.body, fontSize: 12, padding: "6px 12px", borderRadius: 7, border: "none", background: C.accent, color: "#FFF", cursor: "pointer" }}>+</button>
      </div>
    </div>
  );
}

export default function LeadDetailPanel({ lead, onClose, onUpdate }) {
  const [leadData, setLeadData] = useState(lead);
  const [contacts, setContacts] = useState([]);
  const [services, setServices] = useState([]);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState("");

  useEffect(() => {
    setLeadData(lead);
    fetchContacts();
    fetchServices();
    setError("");
  }, [lead?.id]);

  const fetchContacts = async () => {
    try { const d = await contactsApi.forLead(lead.id); setContacts(d || []); } catch {}
  };

  const fetchServices = async () => {
    try { const d = await req(`/services/lead/${lead.id}`); setServices(d || []); } catch {}
  };

  // Smart contact lookup — falls back to primary/first contact for owner
  const getContact = (role) => {
    const byRole = contacts.find(c => c.role === role);
    if (byRole) return byRole;
    if (role === "owner") {
      // Imported leads: contacts have phone but no role set
      return contacts.find(c => c.is_primary) || contacts[0] || null;
    }
    return null;
  };

  const saveLead = async () => {
    setError("");
    setSaving(true);
    try {
      await leadsApi.update(lead.id, {
        business_name:     leadData.business_name,
        address:           leadData.address,
        phone:             leadData.phone,
        website_url:       leadData.website_url,
        notes:             leadData.notes,
        opportunity_value: leadData.opportunity_value ? parseFloat(leadData.opportunity_value) : null,
        opportunity_source: leadData.opportunity_source,
        campaign_type:     leadData.campaign_type,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onUpdate();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const set = (k, v) => setLeadData(d => ({ ...d, [k]: v }));

  return (
    <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: 440, background: C.surface, borderLeft: `1px solid ${C.border}`, zIndex: 300, display: "flex", flexDirection: "column", boxShadow: "-12px 0 40px rgba(0,0,0,0.1)" }}>
      <div style={{ padding: "20px 24px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0 }}>
        <div>
          <div style={{ ...T.heading, fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 2 }}>{leadData.business_name}</div>
          <div style={{ ...T.mono, fontSize: 11, color: C.muted }}>{leadData.city} · {leadData.industry}</div>
        </div>
        <button onClick={onClose} style={{ background: "transparent", border: "none", color: C.muted, cursor: "pointer", fontSize: 18 }}>✕</button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>

        {/* Business Info */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ ...T.mono, fontSize: 10, color: C.accent, letterSpacing: "0.1em", marginBottom: 10, fontWeight: 500 }}>BUSINESS INFO</div>
          <Field label="BUSINESS NAME" value={leadData.business_name} onChange={v => set("business_name", v)} />
          <Field label="ADDRESS" value={leadData.address} onChange={v => set("address", v)} placeholder="Full address" />
          <Field label="BUSINESS PHONE" value={leadData.phone} onChange={v => set("phone", v)} placeholder="+44..." />
          <Field label="WEBSITE" value={leadData.website_url} onChange={v => set("website_url", v)} placeholder="https://..." />
          {leadData.maps_url && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ ...T.mono, fontSize: 10, color: C.muted, letterSpacing: "0.07em", display: "block", marginBottom: 4 }}>GOOGLE MAPS</label>
              <a href={leadData.maps_url} target="_blank" rel="noopener noreferrer" style={{ ...T.body, fontSize: 12, color: C.accent }}>View on Maps →</a>
            </div>
          )}
          <Field label="OPPORTUNITY VALUE (£)" value={leadData.opportunity_value} onChange={v => set("opportunity_value", v)} type="number" placeholder="0" />
          <div style={{ marginBottom: 12 }}>
            <label style={{ ...T.mono, fontSize: 10, color: C.muted, letterSpacing: "0.07em", display: "block", marginBottom: 4 }}>NOTES</label>
            <textarea value={leadData.notes || ""} onChange={e => set("notes", e.target.value)} rows={3}
              placeholder="Notes about this lead..."
              style={{ width: "100%", padding: "7px 10px", background: C.subtle, border: `1px solid ${C.border}`, borderRadius: 7, ...T.body, fontSize: 13, color: C.text, outline: "none", resize: "vertical", boxSizing: "border-box" }} />
          </div>
          {error && <div style={{ ...T.body, fontSize: 12, color: C.dead, marginBottom: 8 }}>{error}</div>}
          <button onClick={saveLead} disabled={saving}
            style={{ ...T.body, fontSize: 12, padding: "7px 16px", borderRadius: 7, border: "none", background: saved ? "#2A9455" : C.accent, color: "#FFF", cursor: "pointer" }}>
            {saved ? "✓ Saved" : saving ? "Saving..." : "Save business info"}
          </button>
        </div>

        <div style={{ height: 1, background: C.border, margin: "4px 0 20px" }} />

        {/* Owner — pre-fills from imported contact */}
        <ContactSection title="Owner" contact={getContact("owner")} leadId={lead.id} onRefresh={fetchContacts} />

        <div style={{ height: 1, background: C.border, margin: "4px 0 20px" }} />

        <ContactSection title="Receptionist" contact={getContact("receptionist")} leadId={lead.id} onRefresh={fetchContacts} />

        <div style={{ height: 1, background: C.border, margin: "4px 0 20px" }} />

        <ServicesSection leadId={lead.id} services={services} onUpdate={fetchServices} />

        <div style={{ height: 1, background: C.border, margin: "4px 0 20px" }} />

        <div style={{ marginBottom: 20 }}>
          <div style={{ ...T.mono, fontSize: 10, color: C.accent, letterSpacing: "0.1em", marginBottom: 10, fontWeight: 500 }}>METADATA</div>
          {[
            { label: "Created", value: lead.created_at ? new Date(lead.created_at).toLocaleDateString("en-GB") : "—" },
            { label: "Last updated", value: lead.updated_at ? new Date(lead.updated_at).toLocaleDateString("en-GB") : "—" },
            { label: "Last contacted", value: lead.last_contacted_at ? new Date(lead.last_contacted_at).toLocaleDateString("en-GB") : "Never" },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${C.border}` }}>
              <span style={{ ...T.mono, fontSize: 11, color: C.muted }}>{label}</span>
              <span style={{ ...T.body, fontSize: 12, color: C.text }}>{value}</span>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}