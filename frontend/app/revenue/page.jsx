"use client";
import { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, AlertCircle, RefreshCw } from "lucide-react";
import Shell from "@/components/Shell";
import { bookings as bookingsApi } from "@/lib/api";

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonBlock({ w = "100%", h = 18, radius = 6, style = {} }) {
  return (
    <div className="skeleton-pulse" style={{
      width: w, height: h, borderRadius: radius,
      background: "var(--border)", flexShrink: 0, ...style,
    }} />
  );
}

function RevenueSkeleton() {
  return (
    <div>
      {/* Stat cards skeleton */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 28 }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="skeleton-pulse" style={{
            padding: "22px 24px", borderRadius: 14,
            background: "var(--bg-card)", border: "1px solid var(--border)",
            animationDelay: `${i * 0.1}s`,
          }}>
            <SkeletonBlock w={90} h={10} radius={4} style={{ marginBottom: 18 }} />
            <SkeletonBlock w={110} h={28} radius={6} style={{ marginBottom: 10 }} />
            <SkeletonBlock w={70} h={12} radius={4} />
          </div>
        ))}
      </div>
      {/* Table skeleton */}
      <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
        <div style={{ padding: "16px 22px", borderBottom: "1px solid var(--border)" }}>
          <SkeletonBlock w={130} h={10} radius={4} />
        </div>
        <div style={{ padding: "0 18px" }}>
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} style={{
              display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr",
              gap: 16, padding: "16px 0",
              borderBottom: i < 4 ? "1px solid var(--border)" : "none",
            }}>
              <SkeletonBlock w="80%" h={13} radius={4} style={{ animationDelay: `${i * 0.07}s` }} />
              <SkeletonBlock w="70%" h={13} radius={4} style={{ animationDelay: `${i * 0.07 + 0.03}s` }} />
              <SkeletonBlock w="60%" h={13} radius={4} style={{ animationDelay: `${i * 0.07 + 0.06}s` }} />
              <SkeletonBlock w="60%" h={13} radius={4} style={{ animationDelay: `${i * 0.07 + 0.09}s` }} />
              <SkeletonBlock w="70%" h={13} radius={4} style={{ animationDelay: `${i * 0.07 + 0.12}s` }} />
              <SkeletonBlock w={60} h={22} radius={5} style={{ animationDelay: `${i * 0.07 + 0.15}s` }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "72px 24px", textAlign: "center",
      }}
    >
      <div style={{
        width: 56, height: 56, borderRadius: 16,
        background: "var(--gold-dim)", border: "1px solid var(--gold)",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 20,
      }}>
        <TrendingUp size={22} color="var(--gold)" strokeWidth={1.8} />
      </div>
      <p style={{
        fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700,
        color: "var(--text-primary)", marginBottom: 8,
      }}>No bookings yet</p>
      <p style={{
        fontFamily: "'DM Sans', sans-serif", fontSize: 13,
        color: "var(--text-secondary)", maxWidth: 280, lineHeight: 1.6,
      }}>
        Confirmed bookings will appear here once your pipeline converts.
      </p>
    </motion.div>
  );
}

// ── Error State ───────────────────────────────────────────────────────────────
function ErrorState({ message, onRetry }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center",
        justifyContent: "center", padding: "64px 24px", textAlign: "center",
      }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 14,
        background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16,
      }}>
        <AlertCircle size={20} color="#EF4444" strokeWidth={1.8} />
      </div>
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#EF4444", marginBottom: 16 }}>
        {message || "Failed to load revenue data"}
      </p>
      <motion.button
        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
        onClick={onRetry}
        style={{
          display: "flex", alignItems: "center", gap: 7,
          fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 500,
          padding: "8px 16px", borderRadius: 8,
          border: "1px solid var(--border)", background: "transparent",
          color: "var(--text-secondary)",
        }}
      >
        <RefreshCw size={13} strokeWidth={1.8} />
        Try again
      </motion.button>
    </motion.div>
  );
}

// ── Stat Card with GSAP count-up ──────────────────────────────────────────────
function StatCard({ label, displayValue, numericValue, prefix = "", suffix = "", sub, accent, delay = 0 }) {
  const numRef = useRef(null);

  useEffect(() => {
    if (numericValue == null || isNaN(numericValue) || !numRef.current) return;
    const obj = { val: 0 };
    const tween = gsap.to(obj, {
      val: numericValue,
      duration: 1.8,
      delay,
      ease: "power3.out",
      onUpdate: () => {
        if (!numRef.current) return;
        numRef.current.textContent =
          prefix + Number(Math.round(obj.val)).toLocaleString() + suffix;
      },
    });
    return () => tween.kill();
  }, [numericValue, prefix, suffix, delay]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      style={{
        padding: "22px 24px",
        background: "var(--bg-card)",
        border: `1px solid ${accent ? "var(--gold)" : "var(--border)"}`,
        borderRadius: 14,
        boxShadow: accent ? "0 0 0 1px var(--gold-dim), var(--shadow-sm)" : "none",
        transition: "background 0.3s, border-color 0.3s",
      }}
    >
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
    </motion.div>
  );
}

// ── Booking status badge ──────────────────────────────────────────────────────
function StatusPill({ status }) {
  const ok = status === "completed";
  return (
    <span style={{
      fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 500,
      padding: "3px 10px", borderRadius: 20,
      background: ok ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.12)",
      color:      ok ? "#10B981"               : "#F59E0B",
      border:     `1px solid ${ok ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)"}`,
      display: "inline-flex", alignItems: "center", gap: 5,
      whiteSpace: "nowrap",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: ok ? "#10B981" : "#F59E0B", flexShrink: 0 }} />
      {status}
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function RevenuePage() {
  const [bookings, setBookings] = useState([]);
  const [summary,  setSummary]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    Promise.all([bookingsApi.list(), bookingsApi.summary()])
      .then(([b, s]) => { setBookings(b); setSummary(s); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const fmt     = (n) => `£${Number(n || 0).toLocaleString()}`;
  const fmtDate = (b) =>
    b.booking_date ||
    new Date(b.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

  return (
    <Shell topbarText={loading ? "Revenue" : error ? "Revenue" : `${bookings.length} confirmed booking${bookings.length !== 1 ? "s" : ""}`}>
      <div className="fade-up">
        <div style={{ marginBottom: 26 }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>Revenue</h2>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "var(--text-secondary)" }}>
            Commission tracking and ROI across all confirmed bookings
          </p>
        </div>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <RevenueSkeleton />
            </motion.div>
          ) : error ? (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ErrorState message={error} onRetry={load} />
            </motion.div>
          ) : (
            <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Stat cards */}
              {summary && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 28 }}>
                  <StatCard
                    label="CONFIRMED BOOKINGS"
                    displayValue={summary.total_bookings}
                    numericValue={Number(summary.total_bookings || 0)}
                    sub="All time"
                    delay={0}
                  />
                  <StatCard
                    label="TOTAL BOOKING VALUE"
                    displayValue={fmt(summary.total_value)}
                    numericValue={Number(summary.total_value || 0)}
                    prefix="£"
                    sub="Client revenue generated"
                    delay={0.07}
                  />
                  <StatCard
                    label="COMMISSION EARNED"
                    displayValue={fmt(summary.total_commission)}
                    numericValue={Number(summary.total_commission || 0)}
                    prefix="£"
                    sub="At 20% rate"
                    accent
                    delay={0.14}
                  />
                  <StatCard
                    label="AD SPEND ROI"
                    displayValue={summary.roi ? `${Number(summary.roi).toFixed(0)}%` : "—"}
                    numericValue={summary.roi ? Number(summary.roi) : null}
                    suffix="%"
                    sub={`${fmt(summary.total_ad_spend)} invested`}
                    delay={0.21}
                  />
                </div>
              )}

              {/* Bookings table or empty state */}
              {bookings.length === 0 ? (
                <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
                  <EmptyState />
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.28 }}
                  style={{
                    background: "var(--bg-card)", border: "1px solid var(--border)",
                    borderRadius: 14, overflow: "hidden",
                  }}
                >
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
                      <AnimatePresence>
                        {bookings.map((b, i) => (
                          <motion.tr
                            key={b.id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, delay: 0.3 + i * 0.04 }}
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
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Shell>
  );
}
