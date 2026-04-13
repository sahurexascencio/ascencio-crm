"use client";
import { useState, useEffect } from "react";
import { C, T } from "@/lib/tokens";

const BASE = "http://localhost:8000";
const getToken = () => typeof window !== "undefined" ? localStorage.getItem("ascencio_token") : null;

export default function CallStatsBar() {
  const [stats, setStats]     = useState(null);
  const [balance, setBalance] = useState(null);

  useEffect(() => {
    const headers = { Authorization: `Bearer ${getToken()}` };
    fetch(`${BASE}/calls/stats`, { headers }).then(r => r.json()).then(setStats).catch(() => {});
    fetch(`${BASE}/calls/balance`, { headers }).then(r => r.json()).then(d => { if (d.balance !== null) setBalance(d.balance); }).catch(() => {});
  }, []);

  if (!stats) return null;

  const credit = balance ?? stats.trial_credit_remaining_estimate;

  return (
    <div style={{ display: "flex", gap: 20, padding: "8px 16px", background: C.subtle, borderRadius: 8, border: `1px solid ${C.border}`, marginBottom: 16 }}>
      {[
        { label: "Total calls",   value: stats.total_calls },
        { label: "Minutes used",  value: `${stats.total_minutes} min` },
        { label: "Est. cost",     value: `$${stats.cost_estimate_usd}` },
        { label: balance !== null ? "Account balance" : "Est. credit left", value: `$${credit}`, color: credit < 5 ? C.dead : C.confirmed },
      ].map(({ label, value, color }) => (
        <div key={label} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ ...T.mono, fontSize: 9, color: C.muted, letterSpacing: "0.07em" }}>{label.toUpperCase()}</span>
          <span style={{ ...T.mono, fontSize: 13, color: color || C.text, fontWeight: 500 }}>{value}</span>
        </div>
      ))}
    </div>
  );
}