"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { gsap } from "gsap";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Users, PhoneCall, PhoneIncoming, CheckCircle2,
  TrendingUp, TrendingDown, Circle,
  ArrowRight, Plus, LayoutGrid, MessageSquare,
  Clock, Activity, CheckCircle, CalendarClock,
  Flame,
} from "lucide-react";
import Shell from "@/components/Shell";
import { dashboard as dashboardApi, tasks as tasksApi } from "@/lib/api";

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_META = {
  new:         { label: "New",         color: "#3B82F6", bg: "rgba(59,130,246,0.10)"  },
  callback:    { label: "Callback",    color: "#F59E0B", bg: "rgba(245,158,11,0.10)"  },
  confirmed:   { label: "Confirmed",   color: "#10B981", bg: "rgba(16,185,129,0.10)"  },
  dead:        { label: "Dead",        color: "#6B7B8D", bg: "rgba(107,123,141,0.10)" },
  in_progress: { label: "In Progress", color: "#8B5CF6", bg: "rgba(139,92,246,0.10)"  },
};

const PRIORITY_META = {
  high:   { label: "High",   color: "#EF4444", bg: "rgba(239,68,68,0.10)"   },
  medium: { label: "Medium", color: "#F59E0B", bg: "rgba(245,158,11,0.10)"  },
  low:    { label: "Low",    color: "#6B7B8D", bg: "rgba(107,123,141,0.10)" },
};

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function formatDue(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return `Today ${time}`;
}

// ── Skeleton block ────────────────────────────────────────────────────────────
function Skel({ w = "100%", h = 14, r = 5, delay = 0, style = {} }) {
  return (
    <div className="skeleton-pulse" style={{
      width: w, height: h, borderRadius: r,
      background: "var(--border)", flexShrink: 0,
      animationDelay: `${delay}s`, ...style,
    }} />
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, iconColor, accent, trend, sub, delay = 0, loading }) {
  const numRef = useRef(null);

  useEffect(() => {
    if (loading || value == null || !numRef.current) return;
    const obj = { val: 0 };
    const tween = gsap.to(obj, {
      val: Number(value),
      duration: 1.6,
      delay,
      ease: "power3.out",
      onUpdate: () => {
        if (numRef.current) numRef.current.textContent = Math.round(obj.val).toLocaleString();
      },
    });
    return () => tween.kill();
  }, [value, loading, delay]);

  if (loading) {
    return (
      <div style={{
        background: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: 14, padding: "20px 22px",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <Skel w={90} h={10} r={4} delay={delay} />
          <Skel w={34} h={34} r={10} delay={delay} />
        </div>
        <Skel w={70} h={28} r={6} delay={delay} style={{ marginBottom: 8 }} />
        <Skel w={100} h={10} r={4} delay={delay} />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      style={{
        background: "var(--bg-card)",
        border: `1px solid ${accent ? "var(--gold)" : "var(--border)"}`,
        borderRadius: 14, padding: "20px 22px",
        boxShadow: accent ? "0 0 0 1px var(--gold-dim)" : "none",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
        <p style={{
          fontFamily: "'DM Mono', monospace", fontSize: 10,
          color: "var(--text-secondary)", letterSpacing: "0.08em",
        }}>{label}</p>
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: `${iconColor}14`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <Icon size={16} color={iconColor} strokeWidth={1.8} />
        </div>
      </div>

      <p ref={numRef} style={{
        fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 700,
        color: accent ? "var(--gold)" : "var(--text-primary)",
        marginBottom: 6, letterSpacing: "-0.02em",
      }}>
        {value}
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
        {trend === "up"   && <TrendingUp   size={11} color="#10B981" />}
        {trend === "down" && <TrendingDown size={11} color="#EF4444" />}
        <p style={{
          fontFamily: "'DM Sans', sans-serif", fontSize: 11,
          color: "var(--text-secondary)",
        }}>{sub}</p>
      </div>
    </motion.div>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.new;
  return (
    <span style={{
      fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 500,
      padding: "2px 9px", borderRadius: 20,
      color: m.color, background: m.bg,
      border: `1px solid ${m.color}25`,
      display: "inline-flex", alignItems: "center", gap: 4,
      whiteSpace: "nowrap", flexShrink: 0,
    }}>
      <span style={{ width: 4, height: 4, borderRadius: "50%", background: m.color }} />
      {m.label}
    </span>
  );
}

// ── Priority Badge ────────────────────────────────────────────────────────────
function PriorityBadge({ priority }) {
  const p = priority?.toLowerCase();
  const m = PRIORITY_META[p] || PRIORITY_META.low;
  return (
    <span style={{
      fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 500,
      padding: "2px 7px", borderRadius: 20,
      color: m.color, background: m.bg,
      border: `1px solid ${m.color}22`,
      display: "inline-flex", alignItems: "center", gap: 3,
      whiteSpace: "nowrap", flexShrink: 0,
    }}>
      {p === "high" && <Flame size={8} />}
      {m.label}
    </span>
  );
}

// ── Section card wrapper ──────────────────────────────────────────────────────
function SectionCard({ title, icon: Icon, iconColor = "var(--gold)", action, children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay }}
      style={{
        background: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: 14, overflow: "hidden", flex: 1, minWidth: 0,
      }}
    >
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 18px", borderBottom: "1px solid var(--border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon size={14} color={iconColor} strokeWidth={1.8} />
          <span style={{
            fontFamily: "'DM Mono', monospace", fontSize: 10,
            color: "var(--text-secondary)", letterSpacing: "0.08em",
          }}>{title}</span>
        </div>
        {action}
      </div>
      {children}
    </motion.div>
  );
}

// ── Recent Leads ──────────────────────────────────────────────────────────────
function RecentLeads({ leads, loading }) {
  const router = useRouter();
  return (
    <SectionCard
      title="RECENT LEADS"
      icon={Users}
      iconColor="#3B82F6"
      delay={0.2}
      action={
        <motion.button
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => router.push("/pipeline")}
          style={{
            display: "flex", alignItems: "center", gap: 4,
            background: "transparent", border: "none",
            fontFamily: "'DM Sans', sans-serif", fontSize: 11,
            color: "var(--text-secondary)", cursor: "pointer",
          }}
        >
          View all <ArrowRight size={11} strokeWidth={1.8} />
        </motion.button>
      }
    >
      {loading ? (
        <div style={{ padding: "0 18px" }}>
          {[0,1,2,3,4].map(i => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "13px 0",
              borderBottom: i < 4 ? "1px solid var(--border)" : "none",
            }}>
              <div style={{ flex: 1 }}>
                <Skel w="60%" h={12} r={4} delay={i*0.05} style={{ marginBottom: 6 }} />
                <Skel w="40%" h={10} r={4} delay={i*0.05+0.03} />
              </div>
              <Skel w={68} h={22} r={20} delay={i*0.05} />
            </div>
          ))}
        </div>
      ) : leads.length === 0 ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          padding: "36px 16px", gap: 8,
        }}>
          <Users size={20} color="var(--text-secondary)" strokeWidth={1.4} style={{ opacity: 0.4 }} />
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "var(--text-secondary)" }}>
            No leads yet
          </p>
        </div>
      ) : (
        <div style={{ padding: "0 18px" }}>
          <AnimatePresence>
            {leads.map((lead, i) => (
              <motion.div
                key={lead.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: 0.25 + i * 0.05 }}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 0",
                  borderBottom: i < leads.length - 1 ? "1px solid var(--border)" : "none",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500,
                    color: "var(--text-primary)", marginBottom: 2,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{lead.business_name}</p>
                  <p style={{
                    fontFamily: "'DM Mono', monospace", fontSize: 10,
                    color: "var(--text-secondary)",
                  }}>
                    {lead.city || "—"} · {timeAgo(lead.created_at)}
                  </p>
                </div>
                <StatusBadge status={lead.status} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </SectionCard>
  );
}

// ── Tasks Today ───────────────────────────────────────────────────────────────
function TasksToday({ tasks, loading, onComplete }) {
  const router = useRouter();
  return (
    <SectionCard
      title="TASKS DUE TODAY"
      icon={CalendarClock}
      iconColor="#EF4444"
      delay={0.26}
      action={
        <motion.button
          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => router.push("/tasks")}
          style={{
            display: "flex", alignItems: "center", gap: 4,
            background: "transparent", border: "none",
            fontFamily: "'DM Sans', sans-serif", fontSize: 11,
            color: "var(--text-secondary)", cursor: "pointer",
          }}
        >
          View all <ArrowRight size={11} strokeWidth={1.8} />
        </motion.button>
      }
    >
      {loading ? (
        <div style={{ padding: "0 18px" }}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 10, padding: "13px 0",
              borderBottom: i < 2 ? "1px solid var(--border)" : "none",
            }}>
              <Skel w={17} h={17} r={50} delay={i*0.06} />
              <div style={{ flex: 1 }}>
                <Skel w="65%" h={12} r={4} delay={i*0.06} style={{ marginBottom: 5 }} />
                <Skel w="45%" h={10} r={4} delay={i*0.06+0.03} />
              </div>
              <Skel w={46} h={20} r={20} delay={i*0.06} />
            </div>
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          padding: "36px 16px", gap: 8,
        }}>
          <CheckCircle size={20} color="var(--text-secondary)" strokeWidth={1.4} style={{ opacity: 0.4 }} />
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "var(--text-secondary)" }}>
            No tasks due today
          </p>
        </div>
      ) : (
        <div style={{ padding: "0 18px" }}>
          <AnimatePresence>
            {tasks.slice(0, 3).map((task, i) => (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20, transition: { duration: 0.18 } }}
                transition={{ duration: 0.2, delay: 0.28 + i * 0.06 }}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "11px 0",
                  borderBottom: i < Math.min(tasks.length, 3) - 1 ? "1px solid var(--border)" : "none",
                }}
              >
                <motion.button
                  whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                  onClick={() => onComplete(task.id)}
                  style={{
                    background: "transparent", border: "none", padding: 0,
                    color: "var(--text-secondary)", flexShrink: 0, display: "flex",
                  }}
                  title="Mark complete"
                >
                  <Circle size={16} strokeWidth={1.5} />
                </motion.button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 500,
                    color: "var(--text-primary)", marginBottom: 2,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>{task.title}</p>
                  <p style={{
                    fontFamily: "'DM Mono', monospace", fontSize: 10,
                    color: "var(--text-secondary)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {task.business_name || "—"} · {formatDue(task.due_date)}
                  </p>
                </div>
                {task.priority && <PriorityBadge priority={task.priority} />}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </SectionCard>
  );
}

// ── Quick Actions ─────────────────────────────────────────────────────────────
function QuickActions({ onAddLead }) {
  const router = useRouter();
  const actions = [
    {
      icon: Plus,
      label: "Add Lead",
      sub: "Add to pipeline",
      color: "var(--gold)",
      bg: "var(--gold-dim)",
      border: "var(--gold)",
      onClick: onAddLead,
    },
    {
      icon: LayoutGrid,
      label: "Pipeline",
      sub: "View all leads",
      color: "#3B82F6",
      bg: "rgba(59,130,246,0.08)",
      border: "rgba(59,130,246,0.25)",
      onClick: () => router.push("/pipeline"),
    },
    {
      icon: MessageSquare,
      label: "Templates",
      sub: "SMS scripts",
      color: "#8B5CF6",
      bg: "rgba(139,92,246,0.08)",
      border: "rgba(139,92,246,0.25)",
      onClick: () => router.push("/templates"),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay: 0.34 }}
      style={{
        background: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: 14, overflow: "hidden", flex: 1,
      }}
    >
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
        <span style={{
          fontFamily: "'DM Mono', monospace", fontSize: 10,
          color: "var(--text-secondary)", letterSpacing: "0.08em",
        }}>QUICK ACTIONS</span>
      </div>
      <div style={{ padding: "14px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
        {actions.map((a, i) => (
          <motion.button
            key={a.label}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2, delay: 0.38 + i * 0.06 }}
            whileHover={{ scale: 1.01, x: 2 }}
            whileTap={{ scale: 0.98 }}
            onClick={a.onClick}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "11px 14px", borderRadius: 10,
              background: a.bg, border: `1px solid ${a.border}`,
              cursor: "pointer", textAlign: "left",
            }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: 9,
              background: `${a.color}18`,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <a.icon size={15} color={a.color} strokeWidth={1.8} />
            </div>
            <div>
              <p style={{
                fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600,
                color: a.color, marginBottom: 1,
              }}>{a.label}</p>
              <p style={{
                fontFamily: "'DM Sans', sans-serif", fontSize: 11,
                color: "var(--text-secondary)",
              }}>{a.sub}</p>
            </div>
            <ArrowRight size={13} color={a.color} style={{ marginLeft: "auto", opacity: 0.6 }} />
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

// ── Activity Feed ─────────────────────────────────────────────────────────────
const ACTIVITY_ICONS = {
  new:         { icon: Users,       color: "#3B82F6" },
  callback:    { icon: PhoneIncoming, color: "#F59E0B" },
  confirmed:   { icon: CheckCircle2,  color: "#10B981" },
  dead:        { icon: Circle,        color: "#6B7B8D" },
  in_progress: { icon: Activity,      color: "#8B5CF6" },
};

function ActivityFeed({ activity, loading }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay: 0.4 }}
      style={{
        background: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: 14, overflow: "hidden", flex: 2, minWidth: 0,
      }}
    >
      <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border)" }}>
        <span style={{
          fontFamily: "'DM Mono', monospace", fontSize: 10,
          color: "var(--text-secondary)", letterSpacing: "0.08em",
        }}>TEAM ACTIVITY</span>
      </div>

      {loading ? (
        <div style={{ padding: "0 18px" }}>
          {[0,1,2,3,4].map(i => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "13px 0",
              borderBottom: i < 4 ? "1px solid var(--border)" : "none",
            }}>
              <Skel w={28} h={28} r={50} delay={i * 0.05} />
              <div style={{ flex: 1 }}>
                <Skel w="70%" h={11} r={4} delay={i*0.05} style={{ marginBottom: 5 }} />
                <Skel w="35%" h={10} r={4} delay={i*0.05+0.03} />
              </div>
            </div>
          ))}
        </div>
      ) : activity.length === 0 ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          padding: "36px 16px", gap: 8,
        }}>
          <Activity size={20} color="var(--text-secondary)" strokeWidth={1.4} style={{ opacity: 0.4 }} />
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "var(--text-secondary)" }}>
            No activity yet
          </p>
        </div>
      ) : (
        <div style={{ padding: "0 18px" }}>
          {activity.map((event, i) => {
            const toMeta = ACTIVITY_ICONS[event.to_status] || ACTIVITY_ICONS.new;
            const ToIcon = toMeta.icon;
            return (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: 0.42 + i * 0.06 }}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "12px 0",
                  borderBottom: i < activity.length - 1 ? "1px solid var(--border)" : "none",
                }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: "50%",
                  background: `${toMeta.color}14`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <ToIcon size={13} color={toMeta.color} strokeWidth={1.8} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    fontFamily: "'DM Sans', sans-serif", fontSize: 12,
                    color: "var(--text-primary)", lineHeight: 1.4,
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    <strong style={{ fontWeight: 600 }}>{event.business_name}</strong>
                    {" "}moved to{" "}
                    <span style={{ color: toMeta.color, fontWeight: 500 }}>
                      {STATUS_META[event.to_status]?.label || event.to_status}
                    </span>
                  </p>
                  <p style={{
                    fontFamily: "'DM Mono', monospace", fontSize: 10,
                    color: "var(--text-secondary)", marginTop: 2,
                  }}>{timeAgo(event.changed_at)}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [tasksToday, setTasksToday] = useState([]);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    dashboardApi.summary()
      .then(d => {
        setData(d);
        setTasksToday(d.tasks_today || []);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCompleteTask = async (id) => {
    try {
      await tasksApi.update(id, { completed: true });
      setTasksToday(prev => prev.filter(t => t.id !== id));
      toast.success("Task completed");
    } catch {
      toast.error("Failed to complete task");
    }
  };

  const stats = data?.stats;
  const statsConfig = [
    {
      label: "TOTAL LEADS",
      value: stats?.total_leads ?? 0,
      icon: Users,
      iconColor: "#3B82F6",
      trend: "up",
      sub: "All time",
      delay: 0,
    },
    {
      label: "CALLS TODAY",
      value: stats?.calls_today ?? 0,
      icon: PhoneCall,
      iconColor: "#8B5CF6",
      sub: "Initiated today",
      delay: 0.07,
    },
    {
      label: "CALLBACKS PENDING",
      value: stats?.callbacks_pending ?? 0,
      icon: PhoneIncoming,
      iconColor: "#F59E0B",
      trend: stats?.callbacks_pending > 0 ? "up" : undefined,
      sub: "Need follow-up",
      delay: 0.14,
    },
    {
      label: "CONFIRMED BOOKINGS",
      value: stats?.confirmed_bookings ?? 0,
      icon: CheckCircle2,
      iconColor: "#10B981",
      accent: true,
      trend: stats?.confirmed_bookings > 0 ? "up" : undefined,
      sub: "All time",
      delay: 0.21,
    },
  ];

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <Shell topbarText="Dashboard">
      <div className="fade-up">

        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{ marginBottom: 26 }}
        >
          <h2 style={{
            fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700,
            color: "var(--text-primary)", marginBottom: 4,
          }}>
            {greeting} 👋
          </h2>
          <p style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 13,
            color: "var(--text-secondary)",
          }}>
            Here's what's happening across your pipeline today.
          </p>
        </motion.div>

        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)",
                borderRadius: 10, padding: "12px 16px", marginBottom: 24, gap: 12,
              }}
            >
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#EF4444" }}>
                {error}
              </span>
              <motion.button
                whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                onClick={load}
                style={{
                  background: "transparent", border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: 7, padding: "5px 12px",
                  fontFamily: "'DM Sans', sans-serif", fontSize: 12, color: "#EF4444",
                  cursor: "pointer", whiteSpace: "nowrap",
                }}
              >Retry</motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Row 1: Stats ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 20 }}>
          {statsConfig.map(s => (
            <StatCard key={s.label} {...s} loading={loading} />
          ))}
        </div>

        {/* ── Row 2: Recent Leads + Tasks Today ── */}
        <div style={{ display: "flex", gap: 16, marginBottom: 20, alignItems: "flex-start" }}>
          <div style={{ flex: 1.2, minWidth: 0 }}>
            <RecentLeads leads={data?.recent_leads || []} loading={loading} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <TasksToday
              tasks={tasksToday}
              loading={loading}
              onComplete={handleCompleteTask}
            />
          </div>
        </div>

        {/* ── Row 3: Quick Actions + Activity ── */}
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          <div style={{ width: 260, flexShrink: 0 }}>
            <QuickActions onAddLead={() => {}} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <ActivityFeed activity={data?.activity || []} loading={loading} />
          </div>
        </div>

      </div>
    </Shell>
  );
}
