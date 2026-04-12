"use client";
import { useEffect, useState } from "react";
import { C, T } from "@/lib/tokens";
import { leads as leadsApi } from "@/lib/api";

export default function CityTabs({ activeCity, onChange }) {
  const [counts, setCounts] = useState({});

  useEffect(() => {
    leadsApi.cityCounts().then(setCounts).catch(() => {});
  }, []);

  const cities = Object.keys(counts).sort();
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div style={{ display: "flex", gap: 4, overflowX: "auto", paddingBottom: 4, marginBottom: 16, borderBottom: `1px solid ${C.border}`, scrollbarWidth: "none" }}>
      {["All", ...cities].map(city => {
        const active = activeCity === city;
        const count = city === "All" ? total : counts[city] || 0;
        return (
          <button key={city} onClick={() => onChange(city)} style={{
            flexShrink: 0, padding: "7px 14px", borderRadius: 8,
            border: `1px solid ${active ? C.accent : C.border}`,
            background: active ? C.accentDim : "transparent",
            color: active ? C.accent : C.muted,
            cursor: "pointer", fontSize: 12,
            fontWeight: active ? 500 : 400, transition: "all 0.13s",
            display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
          }}>
            {city}
            <span style={{ fontSize: 10, opacity: 0.65, background: active ? C.accentDim : C.subtle, padding: "1px 6px", borderRadius: 10 }}>{count}</span>
          </button>
        );
      })}
    </div>
  );
}
