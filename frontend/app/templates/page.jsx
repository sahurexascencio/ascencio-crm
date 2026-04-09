"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  MessageSquare, Copy, Pencil, Trash2, Plus,
  AlertCircle, RefreshCw, X, Check,
} from "lucide-react";
import Shell from "@/components/Shell";
import { templates as templatesApi } from "@/lib/api";

// ── Constants ─────────────────────────────────────────────────────────────────
const CATEGORIES = ["Intro", "Follow-up", "Callback", "Confirmation", "Other"];

const CAT_META = {
  "Intro":        { color: "#3B82F6", bg: "rgba(59,130,246,0.10)"  },
  "Follow-up":    { color: "#F59E0B", bg: "rgba(245,158,11,0.10)"  },
  "Callback":     { color: "#8B5CF6", bg: "rgba(139,92,246,0.10)"  },
  "Confirmation": { color: "#10B981", bg: "rgba(16,185,129,0.10)"  },
  "Other":        { color: "#6B7B8D", bg: "rgba(107,123,141,0.10)" },
};

const MAX_CHARS = 160;

// ── Category Badge ────────────────────────────────────────────────────────────
function CategoryBadge({ category }) {
  const m = CAT_META[category] || CAT_META["Other"];
  return (
    <span style={{
      fontFamily: "'DM Mono', monospace", fontSize: 10, fontWeight: 500,
      padding: "2px 9px", borderRadius: 20,
      color: m.color, background: m.bg,
      border: `1px solid ${m.color}25`,
      display: "inline-flex", alignItems: "center", gap: 4,
      whiteSpace: "nowrap",
    }}>
      {category || "Other"}
    </span>
  );
}

// ── Modal primitives ──────────────────────────────────────────────────────────
function Backdrop({ onClose, children }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "24px",
      }}
    >
      {children}
    </motion.div>
  );
}

function ModalCard({ children, width = 480 }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 8 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      style={{
        width: "100%", maxWidth: width,
        background: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: 16, boxShadow: "var(--shadow)",
        overflow: "hidden",
      }}
    >
      {children}
    </motion.div>
  );
}

// ── Field helpers ─────────────────────────────────────────────────────────────
const labelStyle = {
  fontFamily: "'DM Mono', monospace", fontSize: 10,
  color: "var(--text-secondary)", letterSpacing: "0.07em",
  display: "block", marginBottom: 6,
};

const inputStyle = {
  width: "100%", padding: "9px 12px", borderRadius: 8,
  background: "var(--bg-secondary)", border: "1px solid var(--border)",
  color: "var(--text-primary)", fontFamily: "'DM Sans', sans-serif",
  fontSize: 13, outline: "none", boxSizing: "border-box",
  transition: "border-color 0.15s",
};

// ── Template Form Modal ───────────────────────────────────────────────────────
function TemplateModal({ initial, onClose, onSave }) {
  const [name, setName]         = useState(initial?.name || "");
  const [category, setCategory] = useState(initial?.subject || "Follow-up");
  const [body, setBody]         = useState(initial?.body || "");
  const [saving, setSaving]     = useState(false);
  const isEdit = !!initial;

  const charCount = body.length;
  const segments  = Math.ceil(charCount / MAX_CHARS) || 1;
  const overLimit = charCount > MAX_CHARS * 3;

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Title is required"); return; }
    if (!body.trim()) { toast.error("Message body is required"); return; }
    setSaving(true);
    try {
      const payload = { name: name.trim(), subject: category, body: body.trim(), type: "sms" };
      let result;
      if (isEdit) {
        result = await templatesApi.update(initial.id, payload);
      } else {
        result = await templatesApi.create(payload);
      }
      toast.success(isEdit ? "Template updated" : "Template created");
      onSave(result, isEdit);
      onClose();
    } catch (e) {
      toast.error(e.message || "Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Backdrop onClose={onClose}>
      <ModalCard>
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 22px", borderBottom: "1px solid var(--border)",
        }}>
          <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
            {isEdit ? "Edit Template" : "New Template"}
          </p>
          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-secondary)", display: "flex" }}>
            <X size={17} />
          </motion.button>
        </div>

        {/* Body */}
        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Title */}
          <div>
            <label style={labelStyle}>TITLE</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Initial outreach"
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = "var(--gold)")}
              onBlur={e => (e.target.style.borderColor = "var(--border)")}
            />
          </div>

          {/* Category */}
          <div>
            <label style={labelStyle}>CATEGORY</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              style={{ ...inputStyle, cursor: "pointer", appearance: "none" }}
              onFocus={e => (e.target.style.borderColor = "var(--gold)")}
              onBlur={e => (e.target.style.borderColor = "var(--border)")}
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Body */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>MESSAGE BODY</label>
              <span style={{
                fontFamily: "'DM Mono', monospace", fontSize: 10,
                color: overLimit ? "#EF4444" : charCount > MAX_CHARS ? "#F59E0B" : "var(--text-secondary)",
              }}>
                {charCount} chars · {segments} SMS segment{segments !== 1 ? "s" : ""}
              </span>
            </div>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Write your SMS template here..."
              rows={5}
              style={{
                ...inputStyle, resize: "vertical", lineHeight: 1.6,
                borderColor: overLimit ? "#EF4444" : "var(--border)",
              }}
              onFocus={e => (e.target.style.borderColor = overLimit ? "#EF4444" : "var(--gold)")}
              onBlur={e => (e.target.style.borderColor = overLimit ? "#EF4444" : "var(--border)")}
            />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: "flex", justifyContent: "flex-end", gap: 10,
          padding: "14px 22px", borderTop: "1px solid var(--border)",
        }}>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={onClose}
            style={{
              padding: "8px 16px", borderRadius: 8,
              border: "1px solid var(--border)", background: "transparent",
              color: "var(--text-secondary)", fontFamily: "'DM Sans', sans-serif",
              fontSize: 13, cursor: "pointer",
            }}>
            Cancel
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "8px 18px", borderRadius: 8,
              border: "1px solid var(--gold)", background: "var(--gold-dim)",
              color: "var(--gold)", fontFamily: "'DM Sans', sans-serif",
              fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1,
            }}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Template"}
          </motion.button>
        </div>
      </ModalCard>
    </Backdrop>
  );
}

// ── Delete Confirm Modal ──────────────────────────────────────────────────────
function DeleteModal({ template, onClose, onConfirm }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await templatesApi.delete(template.id);
      toast.success("Template deleted");
      onConfirm(template.id);
      onClose();
    } catch (e) {
      toast.error(e.message || "Failed to delete template");
      setDeleting(false);
    }
  };

  return (
    <Backdrop onClose={onClose}>
      <ModalCard width={400}>
        <div style={{ padding: "24px 24px 20px" }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 14,
          }}>
            <Trash2 size={18} color="#EF4444" strokeWidth={1.8} />
          </div>
          <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
            Delete template?
          </p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
            <strong style={{ color: "var(--text-primary)" }}>"{template.name}"</strong> will be permanently removed.
            This cannot be undone.
          </p>
        </div>
        <div style={{
          display: "flex", gap: 10, padding: "14px 24px",
          borderTop: "1px solid var(--border)",
        }}>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={onClose} style={{
              flex: 1, padding: "8px 0", borderRadius: 8,
              border: "1px solid var(--border)", background: "transparent",
              color: "var(--text-secondary)", fontFamily: "'DM Sans', sans-serif",
              fontSize: 13, cursor: "pointer",
            }}>Cancel</motion.button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={handleDelete} disabled={deleting} style={{
              flex: 1, padding: "8px 0", borderRadius: 8,
              border: "1px solid rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.08)",
              color: "#EF4444", fontFamily: "'DM Sans', sans-serif",
              fontSize: 13, fontWeight: 600, cursor: deleting ? "not-allowed" : "pointer",
              opacity: deleting ? 0.7 : 1,
            }}>
            {deleting ? "Deleting…" : "Delete"}
          </motion.button>
        </div>
      </ModalCard>
    </Backdrop>
  );
}

// ── Template Card ─────────────────────────────────────────────────────────────
function TemplateCard({ template, onEdit, onDelete, index }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(template.body);
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.18 } }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      style={{
        background: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: 14, padding: "18px 18px 14px",
        display: "flex", flexDirection: "column", gap: 10,
        transition: "border-color 0.15s",
      }}
      whileHover={{ borderColor: "var(--gold)" }}
    >
      {/* Top row: category + actions */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <CategoryBadge category={template.subject} />
        <div style={{ display: "flex", gap: 4 }}>
          {/* Copy */}
          <motion.button
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            onClick={handleCopy}
            title="Copy to clipboard"
            style={{
              background: copied ? "rgba(16,185,129,0.1)" : "transparent",
              border: `1px solid ${copied ? "rgba(16,185,129,0.2)" : "var(--border)"}`,
              borderRadius: 7, padding: "5px 7px", display: "flex",
              color: copied ? "#10B981" : "var(--text-secondary)",
              transition: "all 0.15s",
            }}
          >
            {copied ? <Check size={13} strokeWidth={2.2} /> : <Copy size={13} strokeWidth={1.6} />}
          </motion.button>
          {/* Edit */}
          <motion.button
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            onClick={e => { e.stopPropagation(); onEdit(template); }}
            title="Edit template"
            style={{
              background: "transparent", border: "1px solid var(--border)",
              borderRadius: 7, padding: "5px 7px", display: "flex",
              color: "var(--text-secondary)",
            }}
          >
            <Pencil size={13} strokeWidth={1.6} />
          </motion.button>
          {/* Delete */}
          <motion.button
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
            onClick={e => { e.stopPropagation(); onDelete(template); }}
            title="Delete template"
            style={{
              background: "transparent", border: "1px solid var(--border)",
              borderRadius: 7, padding: "5px 7px", display: "flex",
              color: "var(--text-secondary)",
            }}
          >
            <Trash2 size={13} strokeWidth={1.6} />
          </motion.button>
        </div>
      </div>

      {/* Title */}
      <p style={{
        fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700,
        color: "var(--text-primary)", lineHeight: 1.3,
      }}>
        {template.name}
      </p>

      {/* Body preview */}
      <p style={{
        fontFamily: "'DM Sans', sans-serif", fontSize: 12,
        color: "var(--text-secondary)", lineHeight: 1.6,
        overflow: "hidden", display: "-webkit-box",
        WebkitLineClamp: 3, WebkitBoxOrient: "vertical",
        flex: 1,
      }}>
        {template.body}
      </p>

      {/* Footer: char count */}
      <div style={{
        paddingTop: 8, borderTop: "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "flex-end",
      }}>
        <span style={{
          fontFamily: "'DM Mono', monospace", fontSize: 10,
          color: "var(--text-secondary)",
        }}>
          {template.body?.length || 0} chars
        </span>
      </div>
    </motion.div>
  );
}

// ── Skeleton Card ─────────────────────────────────────────────────────────────
function SkeletonCard({ delay = 0 }) {
  const S = ({ w, h = 12, r = 5, mb = 0 }) => (
    <div className="skeleton-pulse" style={{
      width: w, height: h, borderRadius: r,
      background: "var(--border)", marginBottom: mb || 0,
      animationDelay: `${delay}s`,
    }} />
  );
  return (
    <div style={{
      background: "var(--bg-card)", border: "1px solid var(--border)",
      borderRadius: 14, padding: "18px 18px 14px",
      display: "flex", flexDirection: "column", gap: 12,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <S w={70} h={20} r={20} />
        <div style={{ display: "flex", gap: 6 }}>
          <S w={28} h={26} r={7} />
          <S w={28} h={26} r={7} />
          <S w={28} h={26} r={7} />
        </div>
      </div>
      <S w="65%" h={16} r={5} />
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <S w="100%" h={11} r={4} />
        <S w="90%"  h={11} r={4} />
        <S w="75%"  h={11} r={4} />
      </div>
      <div style={{ paddingTop: 8, borderTop: "1px solid var(--border)" }}>
        <S w={55} h={10} r={4} />
      </div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────
function EmptyState({ onCreate }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        gridColumn: "1 / -1",
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "80px 24px", textAlign: "center",
      }}
    >
      <div style={{
        width: 56, height: 56, borderRadius: 16,
        background: "var(--gold-dim)", border: "1px solid var(--gold)",
        display: "flex", alignItems: "center", justifyContent: "center",
        marginBottom: 20,
      }}>
        <MessageSquare size={22} color="var(--gold)" strokeWidth={1.8} />
      </div>
      <p style={{
        fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 700,
        color: "var(--text-primary)", marginBottom: 8,
      }}>No templates yet</p>
      <p style={{
        fontFamily: "'DM Sans', sans-serif", fontSize: 13,
        color: "var(--text-secondary)", maxWidth: 280, lineHeight: 1.6,
        marginBottom: 24,
      }}>
        Save your best SMS scripts as templates to reuse across leads.
      </p>
      <motion.button
        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
        onClick={onCreate}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 20px", borderRadius: 10,
          border: "1px solid var(--gold)", background: "var(--gold-dim)",
          color: "var(--gold)", fontFamily: "'DM Sans', sans-serif",
          fontSize: 13, fontWeight: 600, cursor: "pointer",
        }}
      >
        <Plus size={15} strokeWidth={2} />
        Create your first template
      </motion.button>
    </motion.div>
  );
}

// ── Error State ───────────────────────────────────────────────────────────────
function ErrorState({ message, onRetry }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        gridColumn: "1 / -1",
        display: "flex", flexDirection: "column", alignItems: "center",
        padding: "72px 24px", textAlign: "center",
      }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 14,
        background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16,
      }}>
        <AlertCircle size={20} color="#EF4444" strokeWidth={1.8} />
      </div>
      <p style={{
        fontFamily: "'DM Sans', sans-serif", fontSize: 13,
        color: "#EF4444", marginBottom: 16,
      }}>
        {message || "Failed to load templates"}
      </p>
      <motion.button
        whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
        onClick={onRetry}
        style={{
          display: "flex", alignItems: "center", gap: 7,
          padding: "8px 16px", borderRadius: 8,
          border: "1px solid var(--border)", background: "transparent",
          color: "var(--text-secondary)", fontFamily: "'DM Sans', sans-serif",
          fontSize: 12, fontWeight: 500, cursor: "pointer",
        }}
      >
        <RefreshCw size={13} strokeWidth={1.8} />
        Try again
      </motion.button>
    </motion.div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function TemplatesPage() {
  const [templateList, setTemplateList] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [showCreate, setShowCreate]     = useState(false);
  const [editTarget, setEditTarget]     = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    templatesApi.list()
      .then(data => setTemplateList(data || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = (result, isEdit) => {
    if (isEdit) {
      setTemplateList(prev => prev.map(t => t.id === result.id ? result : t));
    } else {
      setTemplateList(prev => [result, ...prev]);
    }
  };

  const handleDeleted = (id) => {
    setTemplateList(prev => prev.filter(t => t.id !== id));
  };

  return (
    <Shell topbarText={loading ? "Templates" : `${templateList.length} template${templateList.length !== 1 ? "s" : ""}`}>
      <div className="fade-up">

        {/* Page header */}
        <div style={{
          display: "flex", alignItems: "flex-start",
          justifyContent: "space-between", marginBottom: 26,
        }}>
          <div>
            <h2 style={{
              fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700,
              color: "var(--text-primary)", marginBottom: 4,
            }}>SMS Templates</h2>
            <p style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: 13,
              color: "var(--text-secondary)",
            }}>
              Reusable scripts for outreach, follow-ups, and confirmations
            </p>
          </div>

          {!loading && !error && (
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => setShowCreate(true)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "9px 16px", borderRadius: 10,
                border: "1px solid var(--gold)", background: "var(--gold-dim)",
                color: "var(--gold)", fontFamily: "'DM Sans', sans-serif",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              <Plus size={15} strokeWidth={2.2} />
              New Template
            </motion.button>
          )}
        </div>

        {/* Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
          alignItems: "start",
        }}>
          <AnimatePresence mode="popLayout">
            {loading ? (
              [0,1,2,3,4,5].map(i => <SkeletonCard key={i} delay={i * 0.06} />)
            ) : error ? (
              <ErrorState key="error" message={error} onRetry={load} />
            ) : templateList.length === 0 ? (
              <EmptyState key="empty" onCreate={() => setShowCreate(true)} />
            ) : (
              templateList.map((t, i) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  index={i}
                  onEdit={setEditTarget}
                  onDelete={setDeleteTarget}
                />
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showCreate && (
          <TemplateModal
            key="create"
            onClose={() => setShowCreate(false)}
            onSave={handleSave}
          />
        )}
        {editTarget && (
          <TemplateModal
            key="edit"
            initial={editTarget}
            onClose={() => setEditTarget(null)}
            onSave={handleSave}
          />
        )}
        {deleteTarget && (
          <DeleteModal
            key="delete"
            template={deleteTarget}
            onClose={() => setDeleteTarget(null)}
            onConfirm={handleDeleted}
          />
        )}
      </AnimatePresence>
    </Shell>
  );
}
