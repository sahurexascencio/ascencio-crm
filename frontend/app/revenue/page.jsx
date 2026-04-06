"use client";
import { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";
import Shell from "@/components/Shell";
import { Spinner, ErrorMsg } from "@/components/ui";
import { bookings as bookingsApi } from "@/lib/api";

// ── Stat Card with GSAP count-up ──────────────────────────────────────────────
function StatCard({ label, displayValue, numericValue, prefix = "", suffix = "", sub, accent }) {
  const numRef = useRef(null);

  useEffect(() => {
    if (numericValue == null || isNaN(numericValue) || !numRef.current) return;
    const obj = { val: 0 };
    gsap.to(obj, {
      val: numericValue,
      duration: 1.8,
      ease: "power3.out",
      onUpdate: () => {
        if (!numRef.current) return;
        numRef.current.textContent =
          prefix + Number(Math.round(obj.val)).toLocaleString() + suffix;
      },
    });
    return () => gsap.killTweensOf(obj);
  }, [numericValue, prefix, suffix]);

  return (
    <div style={{
      padding: "22px 24px",
      background: "var(--bg-card)",
      border: `1px solid ${accent ? "var(--gold)" : "var(--border)"}`,
      borderRadius: 14,
      boxShadow: accent ? "0 0 0 1px var(--gold-dim), var(--shadow-sm)" : "none",
      transition: "background 0.3s, border-color 0.3s",
    }}>
      <p style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: 10, color: "var(--text-secondary)",
        letterSpacing: "0.08em", marginBottom: 14,
      }}>{label}</p>
      <p
        ref={numRef}
        style={{
          fontFamily: "'Syne', sans-serif",
          fontSize: 28, fontWeight: 700,
          color: accent ? "var(--gold)" : "var(--text-primary)",
          marginBottom: 6, letterSpacing: "-0.02em",
        }}
      >
        {displayValue}
      </p>
      {sub && (
        <p style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: 12, color: "var(--text-secondary)",
        }}>{sub}</p>
      )}
    </div>
  );
}

// ── Booking status badge ──────────────────────────────────────────────────────
function StatusPill({ status }) {
  const ok = status === "completed";
  return (
    <span style={{
      fontFamily: "'DM Mono', monospace", fontSize: 11,
      padding: "3px 9px", borderRadius: 5,
      background: ok ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)",
      color:      ok ? "#10B981"               : "#F59E0B",
    }}>{status}</span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function RevenuePage() {
  const [bookings, setBookings] = useState([]);
  const [summary,  setSummary]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");

  useEffect(() => {
    Promise.all([bookingsApi.list(), bookingsApi.summary()])
      .then(([b, s]) => { setBookings(b); setSummary(s); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const fmt     = (n) => `£${Number(n || 0).toLocaleString()}`;
  const fmtDate = (b) =>
    b.booking_date ||
    new Date(b.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  return (
    <Shell topbarText={loading ? "Revenue" : `${bookings.length} confirmed bookings`}>
      <div className="fade-up">
        <div style={{ marginBottom: 26 }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>Revenue</h2>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "var(--text-secondary)" }}>
            Commission tracking and ROI across all confirmed bookings
          </p>
        </div>

        {loading && <Spinner />}
        {error   && <ErrorMsg message={error} />}

        {/* Stat cards */}
        {summary && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 28 }}>
            <StatCard
              label="CONFIRMED BOOKINGS"
              displayValue={summary.total_bookings}
              numericValue={Number(summary.total_bookings || 0)}
              sub="All time"
            />
            <StatCard
              label="TOTAL BOOKING VALUE"
              displayValue={fmt(summary.total_value)}
              numericValue={Number(summary.total_value || 0)}
              prefix="£"
              sub="Client revenue generated"
            />
            <StatCard
              label="COMMISSION EARNED"
              displayValue={fmt(summary.total_commission)}
              numericValue={Number(summary.total_commission || 0)}
              prefix="£"
              sub="At 20% rate"
              accent
            />
            <StatCard
              label="AD SPEND ROI"
              displayValue={summary.roi ? `${Number(summary.roi).toFixed(0)}%` : "—"}
              numericValue={summary.roi ? Number(summary.roi) : null}
              suffix="%"
              sub={`${fmt(summary.total_ad_spend)} invested`}
            />
          </div>
        )}

        {/* Bookings table */}
        {bookings.length > 0 && (
          <div style={{
            background: "var(--bg-card)", border: "1px solid var(--border)",
            borderRadius: 14, overflow: "hidden",
          }}>
            <div style={{ padding: "16px 22px", borderBottom: "1px solid var(--border)" }}>
              <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--text-secondary)", letterSpacing: "0.08em" }}>
                RECENT BOOKINGS
              </p>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
                  {["Service", "Booking Value", "Commission", "Ad Spend", "Date", "Status"].map(h => (
                    <th key={h} style={{
                      fontFamily: "'DM Mono', monospace", fontSize: 10,
                      color: "var(--text-secondary)", padding: "11px 18px",
                      textAlign: "left", fontWeight: 500, letterSpacing: "0.06em",
                    }}>{h.toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bookings.map((b, i) => (
                  <tr
                    key={b.id}
                    style={{
                      borderBottom: i < bookings.length - 1 ? "1px solid var(--border)" : "none",
                      transition: "background 0.12s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-secondary)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500, color: "var(--text-primary)", padding: "14px 18px" }}>
                      {b.service_type || "—"}
                    </td>
                    <td style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: "var(--text-primary)", padding: "14px 18px" }}>
                      {fmt(b.booking_value)}
                    </td>
                    <td style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, fontWeight: 600, color: "var(--gold)", padding: "14px 18px" }}>
                      {fmt(b.commission_amount)}
                    </td>
                    <td style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "var(--text-secondary)", padding: "14px 18px" }}>
                      {b.ad_spend ? fmt(b.ad_spend) : "—"}
                    </td>
                    <td style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "var(--text-secondary)", padding: "14px 18px" }}>
                      {fmtDate(b)}
                    </td>
                    <td style={{ padding: "14px 18px" }}>
                      <StatusPill status={b.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Shell>
  );
}
