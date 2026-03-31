"use client";
import { useState, useEffect } from "react";
import Shell from "@/components/Shell";
import { Spinner, ErrorMsg } from "@/components/ui";
import { C, T } from "@/lib/tokens";
import { bookings as bookingsApi } from "@/lib/api";

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{ padding: "20px 22px", background: C.card, border: `1px solid ${accent ? C.accent+"45" : C.border}`, borderRadius: 12 }}>
      <p style={{ ...T.mono, fontSize: 10, color: C.muted, letterSpacing: "0.08em", marginBottom: 12 }}>{label}</p>
      <p style={{ ...T.heading, fontSize: 26, fontWeight: 700, color: accent ? C.accent : C.text, marginBottom: 4 }}>{value}</p>
      {sub && <p style={{ ...T.body, fontSize: 12, color: C.muted }}>{sub}</p>}
    </div>
  );
}

export default function RevenuePage() {
  const [bookings, setBookings] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([bookingsApi.list(), bookingsApi.summary()])
      .then(([b, s]) => { setBookings(b); setSummary(s); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n) => `£${Number(n||0).toLocaleString()}`;

  return (
    <Shell topbarText={loading ? "Revenue" : `${bookings.length} confirmed bookings`}>
      <div className="fade-up">
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ ...T.heading, fontSize: 22, color: C.text, fontWeight: 700, marginBottom: 4 }}>Revenue</h2>
          <p style={{ ...T.body, fontSize: 13, color: C.muted }}>Commission tracking and ROI across all confirmed bookings</p>
        </div>

        {loading && <Spinner />}
        {error && <ErrorMsg message={error} />}

        {summary && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
            <StatCard label="CONFIRMED BOOKINGS" value={summary.total_bookings} sub="All time" />
            <StatCard label="TOTAL BOOKING VALUE" value={fmt(summary.total_value)} sub="Client revenue generated" />
            <StatCard label="COMMISSION EARNED" value={fmt(summary.total_commission)} sub="At 20% rate" accent />
            <StatCard label="AD SPEND ROI" value={summary.roi ? `${Number(summary.roi).toFixed(0)}%` : "—"} sub={`${fmt(summary.total_ad_spend)} invested`} />
          </div>
        )}

        {bookings.length > 0 && (
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${C.border}` }}>
              <p style={{ ...T.mono, fontSize: 10, color: C.muted, letterSpacing: "0.08em" }}>RECENT BOOKINGS</p>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                  {["Service","Booking Value","Commission","Ad Spend","Date","Status"].map(h => (
                    <th key={h} style={{ ...T.mono, fontSize: 10, color: C.muted, padding: "10px 16px", textAlign: "left", fontWeight: 500, letterSpacing: "0.06em" }}>{h.toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bookings.map((b,i) => (
                  <tr key={b.id} style={{ borderBottom: i<bookings.length-1?`1px solid ${C.border}`:"none", transition: "background 0.1s" }}
                    onMouseEnter={e => e.currentTarget.style.background = C.accentGlow}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                    <td style={{ ...T.body, fontSize: 13, color: C.text, padding: "13px 16px", fontWeight: 500 }}>{b.service_type||"—"}</td>
                    <td style={{ ...T.mono, fontSize: 13, color: C.text, padding: "13px 16px" }}>{fmt(b.booking_value)}</td>
                    <td style={{ ...T.mono, fontSize: 13, color: C.accent, padding: "13px 16px", fontWeight: 500 }}>{fmt(b.commission_amount)}</td>
                    <td style={{ ...T.mono, fontSize: 12, color: C.muted, padding: "13px 16px" }}>{b.ad_spend ? fmt(b.ad_spend) : "—"}</td>
                    <td style={{ ...T.mono, fontSize: 11, color: C.muted, padding: "13px 16px" }}>{b.booking_date || new Date(b.created_at).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}</td>
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{ ...T.mono, fontSize: 11, padding: "3px 8px", borderRadius: 4, background: b.status==="completed"?C.confirmedBg:C.callbackBg, color: b.status==="completed"?C.confirmed:C.callback }}>
                        {b.status}
                      </span>
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
