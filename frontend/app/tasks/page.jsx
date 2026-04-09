"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  CheckCircle2, Circle, Trash2, ChevronDown, ChevronUp,
  CalendarDays, AlertCircle, RefreshCw, Clock, Flame,
} from "lucide-react";
import Shell from "@/components/Shell";
import { tasks as tasksApi } from "@/lib/api";

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDue(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart.getTime() + 86400000);
  const dStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  if (dStart.getTime() === todayStart.getTime()) return `Today ${time}`;
  if (dStart.getTime() === tomorrowStart.getTime()) return `Tomorrow ${time}`;
  if (dStart < todayStart) {
    const daysAgo = Math.round((todayStart - dStart) / 86400000);
    return `${daysAgo}d overdue`;
  }
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + ` ${time}`;
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  return d < todayStart;
}

function isToday(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

const PRIORITY_META = {
  high:   { label: "High",   color: "#EF4444", bg: "rgba(239,68,68,0.10)"   },
  medium: { label: "Medium", color: "#F59E0B", bg: "rgba(245,158,11,0.10)"  },
  low:    { label: "Low",    color: "#6B7B8D", bg: "rgba(107,123,141,0.10)" },
};

// ── Priority Badge ────────────────────────────────────────────────────────────
function PriorityBadge({ priority }) {
  const p = priority?.toLowerCase();
  const m = PRIORITY_META[p] || PRIORITY_META.low;
  return (
    <span style={{
      fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 500,
      padding: "2px 8px", borderRadius: 20,
      color: m.color, background: m.bg,
      border: `1px solid ${m.color}22`,
      display: "inline-flex", alignItems: "center", gap: 4,
      whiteSpace: "nowrap",
    }}>
      {p === "high" && <Flame size={9} />}
      {m.label}
    </span>
  );
}

// ── Task Card ─────────────────────────────────────────────────────────────────
function TaskCard({ task, onComplete, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const due = formatDue(task.due_date);
  const overdue = !task.completed && isOverdue(task.due_date);

  const handleComplete = async (e) => {
    e.stopPropagation();
    setCompleting(true);
    try {
      await tasksApi.update(task.id, { completed: true });
      toast.success("Task completed");
      onComplete(task.id);
    } catch {
      toast.error("Failed to complete task");
      setCompleting(false);
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    setDeleting(true);
    try {
      await tasksApi.delete(task.id);
      toast.success("Task deleted");
      onDelete(task.id);
    } catch {
      toast.error("Failed to delete task");
      setDeleting(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -24, transition: { duration: 0.2 } }}
      transition={{ duration: 0.25 }}
      onClick={() => setExpanded(e => !e)}
      style={{
        background: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: 12, overflow: "hidden", cursor: "pointer",
        transition: "border-color 0.15s, background 0.15s",
      }}
      whileHover={{ borderColor: "var(--gold)" }}
    >
      <div style={{ padding: "13px 14px", display: "flex", alignItems: "flex-start", gap: 10 }}>

        {/* Check button */}
        {!task.completed && (
          <motion.button
            whileHover={{ scale: 1.15 }}
            whileTap={{ scale: 0.9 }}
            onClick={handleComplete}
            disabled={completing}
            style={{
              background: "transparent", border: "none", padding: 0,
              color: completing ? "var(--gold)" : "var(--text-secondary)",
              flexShrink: 0, marginTop: 1, display: "flex",
            }}
            title="Mark complete"
          >
            {completing
              ? <CheckCircle2 size={17} strokeWidth={2} color="var(--gold)" />
              : <Circle size={17} strokeWidth={1.6} />
            }
          </motion.button>
        )}
        {task.completed && (
          <CheckCircle2 size={17} strokeWidth={2} color="#10B981" style={{ flexShrink: 0, marginTop: 1 }} />
        )}

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4, flexWrap: "wrap" }}>
            <span style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500,
              color: task.completed ? "var(--text-secondary)" : "var(--text-primary)",
              textDecoration: task.completed ? "line-through" : "none",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%",
            }}>{task.title}</span>
            {task.priority && <PriorityBadge priority={task.priority} />}
          </div>

          {task.business_name && (
            <p style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: 11,
              color: "var(--text-secondary)", marginBottom: 5,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {task.business_name}
            </p>
          )}

          {due && (
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <Clock size={10} color={overdue ? "#EF4444" : "var(--text-secondary)"} />
              <span style={{
                fontFamily: "'DM Mono', monospace", fontSize: 10,
                color: overdue ? "#EF4444" : "var(--text-secondary)",
              }}>{due}</span>
            </div>
          )}

          {/* Notes preview (collapsed) */}
          {!expanded && task.notes && (
            <p style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: 11,
              color: "var(--text-secondary)", marginTop: 7, lineHeight: 1.5,
              overflow: "hidden", textOverflow: "ellipsis",
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
            }}>{task.notes}</p>
          )}

          {/* Notes full (expanded) */}
          <AnimatePresence>
            {expanded && task.notes && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                style={{
                  fontFamily: "'DM Sans', sans-serif", fontSize: 12,
                  color: "var(--text-secondary)", marginTop: 8, lineHeight: 1.6,
                  overflow: "hidden",
                }}
              >{task.notes}</motion.p>
            )}
          </AnimatePresence>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flexShrink: 0 }}>
          <motion.button
            whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
            onClick={handleDelete}
            disabled={deleting}
            style={{
              background: "transparent", border: "none", padding: 3,
              color: "var(--text-secondary)", display: "flex",
              borderRadius: 5,
            }}
            title="Delete"
          >
            <Trash2 size={13} strokeWidth={1.6} color={deleting ? "#EF4444" : undefined} />
          </motion.button>
          <div style={{ color: "var(--text-secondary)", display: "flex", padding: 3 }}>
            {expanded
              ? <ChevronUp size={13} strokeWidth={1.6} />
              : <ChevronDown size={13} strokeWidth={1.6} />
            }
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
function SkeletonCard({ delay = 0 }) {
  return (
    <div className="skeleton-pulse" style={{
      background: "var(--bg-card)", border: "1px solid var(--border)",
      borderRadius: 12, padding: "14px", animationDelay: `${delay}s`,
    }}>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ width: 17, height: 17, borderRadius: "50%", background: "var(--border)", flexShrink: 0, marginTop: 1 }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: 13, width: "70%", background: "var(--border)", borderRadius: 5, marginBottom: 7 }} />
          <div style={{ height: 10, width: "45%", background: "var(--border)", borderRadius: 4, marginBottom: 7 }} />
          <div style={{ height: 10, width: "35%", background: "var(--border)", borderRadius: 4 }} />
        </div>
      </div>
    </div>
  );
}

// ── Column Empty State ────────────────────────────────────────────────────────
function ColEmpty({ icon: Icon, color, message }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "36px 16px", gap: 10, textAlign: "center",
    }}>
      <Icon size={20} color={color} strokeWidth={1.5} style={{ opacity: 0.45 }} />
      <p style={{
        fontFamily: "'DM Sans', sans-serif", fontSize: 12,
        color: "var(--text-secondary)", lineHeight: 1.5,
      }}>{message}</p>
    </div>
  );
}

// ── Column ────────────────────────────────────────────────────────────────────
function Column({ title, accent, icon: Icon, tasks, loading, onComplete, onDelete, emptyMessage }) {
  return (
    <div style={{
      flex: 1, minWidth: 0,
      display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8, marginBottom: 12,
        padding: "0 2px",
      }}>
        <div style={{
          width: 7, height: 7, borderRadius: "50%", background: accent, flexShrink: 0,
        }} />
        <span style={{
          fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 500,
          color: "var(--text-secondary)", letterSpacing: "0.08em", flex: 1,
        }}>{title}</span>
        {!loading && (
          <span style={{
            fontFamily: "'DM Mono', monospace", fontSize: 10,
            color: accent, background: `${accent}18`, border: `1px solid ${accent}30`,
            borderRadius: 20, padding: "1px 7px",
          }}>{tasks.length}</span>
        )}
      </div>

      {/* Cards */}
      <div style={{
        background: "var(--bg-secondary)", border: "1px solid var(--border)",
        borderRadius: 14, padding: 10, flex: 1,
        display: "flex", flexDirection: "column", gap: 8,
        minHeight: 120,
      }}>
        {loading ? (
          <>
            <SkeletonCard delay={0} />
            <SkeletonCard delay={0.1} />
            <SkeletonCard delay={0.2} />
          </>
        ) : tasks.length === 0 ? (
          <ColEmpty icon={Icon} color={accent} message={emptyMessage} />
        ) : (
          <AnimatePresence initial={false}>
            {tasks.map(t => (
              <TaskCard
                key={t.id}
                task={t}
                onComplete={onComplete}
                onDelete={onDelete}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function TasksPage() {
  const [allTasks, setAllTasks] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    tasksApi.list()
      .then(data => setAllTasks(data || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  // Partition tasks
  const todayTasks   = allTasks.filter(t => !t.completed && (isToday(t.due_date) || isOverdue(t.due_date)));
  const upcomingTasks = allTasks.filter(t => !t.completed && t.due_date && !isToday(t.due_date) && !isOverdue(t.due_date));
  const completedTasks = allTasks.filter(t => t.completed);

  const handleComplete = (id) => {
    setAllTasks(prev => prev.map(t => t.id === id ? { ...t, completed: true } : t));
  };

  const handleDelete = (id) => {
    setAllTasks(prev => prev.filter(t => t.id !== id));
  };

  const totalOpen = todayTasks.length + upcomingTasks.length;

  return (
    <Shell topbarText={loading ? "Tasks" : `${totalOpen} open task${totalOpen !== 1 ? "s" : ""}`}>
      <div className="fade-up">

        {/* Page header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 26 }}>
          <div>
            <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>Tasks</h2>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "var(--text-secondary)" }}>
              Follow-ups, callbacks, and action items across all leads
            </p>
          </div>
          {error && (
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={load}
              style={{
                display: "flex", alignItems: "center", gap: 7,
                fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 500,
                padding: "8px 14px", borderRadius: 8,
                border: "1px solid var(--border)", background: "transparent",
                color: "var(--text-secondary)",
              }}
            >
              <RefreshCw size={13} strokeWidth={1.8} />
              Retry
            </motion.button>
          )}
        </div>

        {/* Error banner */}
        {error && !loading && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)",
              borderRadius: 10, padding: "12px 16px", marginBottom: 24,
            }}
          >
            <AlertCircle size={15} color="#EF4444" strokeWidth={1.8} />
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#EF4444" }}>
              {error}
            </span>
          </motion.div>
        )}

        {/* Three-column layout */}
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
          <Column
            title="DUE TODAY"
            accent="#EF4444"
            icon={Clock}
            tasks={todayTasks}
            loading={loading}
            onComplete={handleComplete}
            onDelete={handleDelete}
            emptyMessage="No tasks due today"
          />
          <Column
            title="UPCOMING"
            accent="var(--gold)"
            icon={CalendarDays}
            tasks={upcomingTasks}
            loading={loading}
            onComplete={handleComplete}
            onDelete={handleDelete}
            emptyMessage="No upcoming tasks"
          />
          <Column
            title="COMPLETED"
            accent="#10B981"
            icon={CheckCircle2}
            tasks={completedTasks}
            loading={loading}
            onComplete={handleComplete}
            onDelete={handleDelete}
            emptyMessage="No completed tasks yet"
          />
        </div>
      </div>
    </Shell>
  );
}
