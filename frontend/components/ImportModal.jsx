"use client";
import { useState, useRef } from "react";
import { C, T } from "@/lib/tokens";
import { imports as importsApi } from "@/lib/api";

const UK_CITIES = [
  "London","Manchester","Birmingham","Leeds","Glasgow","Sheffield","Bradford",
  "Liverpool","Edinburgh","Bristol","Cardiff","Leicester","Coventry","Nottingham",
  "Newcastle","Southampton","Brighton","Plymouth","Derby","Stoke-on-Trent",
  "Wolverhampton","Norwich","Swindon","Swansea","Milton Keynes","Bournemouth",
  "Middlesbrough","Peterborough","Reading","Luton","Bolton","Stockport",
  "Oxford","Cambridge","Aberdeen","Dundee","Portsmouth","Blackpool","Ipswich","York"
];

const INDUSTRIES = ["clinic","dental","aesthetics","ecommerce","other"];

export default function ImportModal({ onClose, onImported }) {
  const [file, setFile] = useState(null);
  const [city, setCity] = useState("");
  const [industry, setIndustry] = useState("clinic");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);

  const handleFile = (e) => { const f = e.target.files[0]; if (f) setFile(f); };
  const handleDrop = (e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setFile(f); };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const res = await importsApi.leads(file, city || null, industry);
      setResult(res);
      if (res.imported > 0) onImported();
    } catch (e) {
      setResult({ error: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.25)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: "28px 32px", width: 480, boxShadow: "0 16px 48px rgba(0,0,0,0.12)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>Import leads</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Upload .xlsx, .xls, or .csv</div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: C.muted, cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>

        {!result ? (
          <>
            <div onDrop={handleDrop} onDragOver={e => e.preventDefault()} onClick={() => fileRef.current?.click()}
              style={{ border: `2px dashed ${file ? C.accent : C.border}`, borderRadius: 10, padding: "28px 16px", textAlign: "center", cursor: "pointer", background: file ? "rgba(180,140,60,0.05)" : C.subtle, marginBottom: 16, transition: "all 0.15s" }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📂</div>
              {file
                ? <div style={{ fontSize: 13, fontWeight: 500, color: C.accent }}>{file.name}</div>
                : <div style={{ fontSize: 13, color: C.muted }}>Drop file here or click to browse</div>
              }
              <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Expected columns: Title, City, Address, Phone, Rating, URL</div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} style={{ display: "none" }} />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 10, color: C.muted, letterSpacing: "0.07em", display: "block", marginBottom: 6 }}>CITY (optional — overrides the City column)</label>
              <select value={city} onChange={e => setCity(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", background: C.subtle, border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 13, color: C.text, outline: "none" }}>
                <option value="">Use city from file</option>
                {UK_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 10, color: C.muted, letterSpacing: "0.07em", display: "block", marginBottom: 6 }}>INDUSTRY</label>
              <select value={industry} onChange={e => setIndustry(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", background: C.subtle, border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 13, color: C.text, outline: "none" }}>
                {INDUSTRIES.map(i => <option key={i} value={i}>{i.charAt(0).toUpperCase() + i.slice(1)}</option>)}
              </select>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={onClose} style={{ flex: 1, padding: "10px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, fontSize: 13, cursor: "pointer" }}>Cancel</button>
              <button onClick={handleImport} disabled={!file || loading}
                style={{ flex: 2, padding: "10px", borderRadius: 8, border: "none", background: file ? C.accent : C.border, color: "#FFFFFF", fontSize: 13, fontWeight: 500, cursor: file ? "pointer" : "not-allowed", opacity: loading ? 0.7 : 1 }}>
                {loading ? "Importing..." : "Import leads"}
              </button>
            </div>
          </>
        ) : result.error ? (
          <div>
            <div style={{ fontSize: 13, color: "var(--color-text-danger)", marginBottom: 16 }}>Import failed: {result.error}</div>
            <button onClick={() => setResult(null)} style={{ fontSize: 13, padding: "8px 16px", borderRadius: 7, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, cursor: "pointer" }}>Try again</button>
          </div>
        ) : (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              {[
                { label: "Imported", value: result.imported, color: "#2A9455", bg: "rgba(42,148,85,0.1)" },
                { label: "Skipped", value: result.skipped, color: C.callback, bg: "rgba(196,118,10,0.1)" },
                { label: "Missing phone", value: result.missing_phone, color: C.muted, bg: C.subtle },
                { label: "Missing rating", value: result.missing_rating, color: C.muted, bg: C.subtle },
              ].map(stat => (
                <div key={stat.label} style={{ padding: "12px 14px", background: stat.bg, borderRadius: 8 }}>
                  <div style={{ fontSize: 10, color: C.muted, marginBottom: 4 }}>{stat.label.toUpperCase()}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: stat.color }}>{stat.value}</div>
                </div>
              ))}
            </div>
            {result.errors?.length > 0 && (
              <div style={{ background: C.subtle, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 12px", marginBottom: 16, maxHeight: 120, overflowY: "auto" }}>
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 6 }}>SKIPPED ROWS</div>
                {result.errors.slice(0, 20).map((e, i) => (
                  <div key={i} style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>{e}</div>
                ))}
                {result.errors.length > 20 && <div style={{ fontSize: 11, color: C.muted }}>...and {result.errors.length - 20} more</div>}
              </div>
            )}
            <button onClick={onClose} style={{ width: "100%", padding: "10px", borderRadius: 8, border: "none", background: C.accent, color: "#FFFFFF", fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
              Done — view pipeline
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
