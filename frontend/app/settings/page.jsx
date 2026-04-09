"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Sun, Moon, User, Mail, Shield, Lock, Eye, EyeOff,
  UserPlus, Trash2, X, ChevronDown, Globe,
  AlertCircle,
} from "lucide-react";
import Shell from "@/components/Shell";
import { useAuth } from "@/hooks/useAuth";
import { users as usersApi } from "@/lib/api";

// ── Constants ─────────────────────────────────────────────────────────────────
const ROLES = ["admin", "caller", "success_manager", "junior"];
const ROLE_META = {
  admin:           { label: "Admin",           color: "#C9A84C", bg: "rgba(201,168,76,0.12)"  },
  caller:          { label: "Caller",          color: "#3B82F6", bg: "rgba(59,130,246,0.12)"  },
  success_manager: { label: "Success Manager", color: "#10B981", bg: "rgba(16,185,129,0.12)"  },
  junior:          { label: "Junior",          color: "#6B7B8D", bg: "rgba(107,123,141,0.12)" },
};

const TIMEZONES = [
  "UTC", "Europe/London", "Europe/Paris", "Europe/Berlin", "Europe/Madrid",
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Toronto", "America/Sao_Paulo", "Asia/Dubai", "Asia/Karachi",
  "Asia/Kolkata", "Asia/Singapore", "Asia/Tokyo", "Australia/Sydney",
  "Pacific/Auckland",
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function initials(name) {
  if (!name) return "?";
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function RoleBadge({ role }) {
  const m = ROLE_META[role] || ROLE_META.junior;
  return (
    <span style={{
      fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 500,
      padding: "3px 10px", borderRadius: 20,
      color: m.color, background: m.bg,
      border: `1px solid ${m.color}25`,
      display: "inline-flex", alignItems: "center", gap: 5,
      whiteSpace: "nowrap",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: m.color, flexShrink: 0 }} />
      {m.label}
    </span>
  );
}

// ── Shared field styles ───────────────────────────────────────────────────────
const labelStyle = {
  fontFamily: "'DM Mono', monospace", fontSize: 10,
  color: "var(--text-secondary)", letterSpacing: "0.07em",
  display: "block", marginBottom: 6,
};

function Field({ label, children }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text", readOnly = false, rightSlot }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%", padding: rightSlot ? "9px 38px 9px 12px" : "9px 12px",
          borderRadius: 8, border: `1px solid ${focused && !readOnly ? "var(--gold)" : "var(--border)"}`,
          background: readOnly ? "var(--bg-secondary)" : "var(--bg-secondary)",
          color: readOnly ? "var(--text-secondary)" : "var(--text-primary)",
          fontFamily: "'DM Sans', sans-serif", fontSize: 13,
          outline: "none", boxSizing: "border-box",
          transition: "border-color 0.15s",
          cursor: readOnly ? "default" : "text",
        }}
      />
      {rightSlot && (
        <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }}>
          {rightSlot}
        </div>
      )}
    </div>
  );
}

function SectionCard({ title, icon: Icon, iconColor = "var(--gold)", children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      style={{
        background: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: 14, overflow: "hidden",
      }}
    >
      <div style={{
        padding: "14px 20px", borderBottom: "1px solid var(--border)",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <Icon size={14} color={iconColor} strokeWidth={1.8} />
        <span style={{
          fontFamily: "'DM Mono', monospace", fontSize: 10,
          color: "var(--text-secondary)", letterSpacing: "0.08em",
        }}>{title}</span>
      </div>
      <div style={{ padding: "20px" }}>
        {children}
      </div>
    </motion.div>
  );
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ name, size = 56, fontSize = 18 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "var(--gold-dim)", border: "2px solid var(--gold)",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    }}>
      <span style={{
        fontFamily: "'Syne', sans-serif", fontSize, fontWeight: 700,
        color: "var(--gold)",
      }}>{initials(name)}</span>
    </div>
  );
}

// ── Skeleton block ─────────────────────────────────────────────────────────────
function Skel({ w = "100%", h = 14, r = 5, delay = 0 }) {
  return (
    <div className="skeleton-pulse" style={{
      width: w, height: h, borderRadius: r,
      background: "var(--border)", flexShrink: 0,
      animationDelay: `${delay}s`,
    }} />
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
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}
    >
      {children}
    </motion.div>
  );
}

function ModalCard({ children, width = 460 }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 8 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      style={{
        width: "100%", maxWidth: width,
        background: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: 16, boxShadow: "var(--shadow)", overflow: "hidden",
      }}
    >
      {children}
    </motion.div>
  );
}

function ModalHeader({ title, onClose }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "18px 22px", borderBottom: "1px solid var(--border)",
    }}>
      <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
        {title}
      </p>
      <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
        onClick={onClose}
        style={{ background: "none", border: "none", color: "var(--text-secondary)", display: "flex" }}>
        <X size={17} />
      </motion.button>
    </div>
  );
}

function ModalFooter({ onCancel, onConfirm, confirmLabel, confirmColor, loading }) {
  return (
    <div style={{
      display: "flex", justifyContent: "flex-end", gap: 10,
      padding: "14px 22px", borderTop: "1px solid var(--border)",
    }}>
      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
        onClick={onCancel}
        style={{
          padding: "8px 16px", borderRadius: 8,
          border: "1px solid var(--border)", background: "transparent",
          color: "var(--text-secondary)", fontFamily: "'DM Sans', sans-serif",
          fontSize: 13, cursor: "pointer",
        }}>
        Cancel
      </motion.button>
      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
        onClick={onConfirm} disabled={loading}
        style={{
          padding: "8px 18px", borderRadius: 8,
          border: `1px solid ${confirmColor || "var(--gold)"}`,
          background: confirmColor ? `${confirmColor}14` : "var(--gold-dim)",
          color: confirmColor || "var(--gold)",
          fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600,
          cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
        }}>
        {loading ? "Saving…" : confirmLabel}
      </motion.button>
    </div>
  );
}

// ── Invite Modal ──────────────────────────────────────────────────────────────
function InviteModal({ onClose, onInvited }) {
  const [form, setForm]     = useState({ name: "", email: "", password: "", role: "caller" });
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.name.trim())  { toast.error("Name is required"); return; }
    if (!form.email.trim()) { toast.error("Email is required"); return; }
    if (form.password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setSaving(true);
    try {
      const result = await usersApi.invite(form);
      toast.success(`${result.name} invited successfully`);
      onInvited(result);
      onClose();
    } catch (e) {
      toast.error(e.message || "Failed to invite member");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Backdrop onClose={onClose}>
      <ModalCard>
        <ModalHeader title="Invite Team Member" onClose={onClose} />
        <div style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="FULL NAME">
            <Input value={form.name} onChange={set("name")} placeholder="Alex Johnson" />
          </Field>
          <Field label="EMAIL">
            <Input value={form.email} onChange={set("email")} placeholder="alex@example.com" type="email" />
          </Field>
          <Field label="TEMPORARY PASSWORD">
            <Input
              value={form.password}
              onChange={set("password")}
              type={showPw ? "text" : "password"}
              placeholder="Min 8 characters"
              rightSlot={
                <button
                  type="button"
                  onClick={() => setShowPw(p => !p)}
                  style={{ background: "none", border: "none", color: "var(--text-secondary)", display: "flex", cursor: "pointer", padding: 0 }}
                >
                  {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              }
            />
          </Field>
          <Field label="ROLE">
            <select
              value={form.role}
              onChange={set("role")}
              style={{
                width: "100%", padding: "9px 12px", borderRadius: 8,
                border: "1px solid var(--border)", background: "var(--bg-secondary)",
                color: "var(--text-primary)", fontFamily: "'DM Sans', sans-serif",
                fontSize: 13, outline: "none", cursor: "pointer", appearance: "none",
              }}
            >
              {ROLES.map(r => (
                <option key={r} value={r}>{ROLE_META[r]?.label || r}</option>
              ))}
            </select>
          </Field>
        </div>
        <ModalFooter onCancel={onClose} onConfirm={handleSave} confirmLabel="Send Invite" loading={saving} />
      </ModalCard>
    </Backdrop>
  );
}

// ── Remove Confirm Modal ──────────────────────────────────────────────────────
function RemoveModal({ member, onClose, onRemoved }) {
  const [removing, setRemoving] = useState(false);

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await usersApi.remove(member.id);
      toast.success(`${member.name} removed`);
      onRemoved(member.id);
      onClose();
    } catch (e) {
      toast.error(e.message || "Failed to remove member");
      setRemoving(false);
    }
  };

  return (
    <Backdrop onClose={onClose}>
      <ModalCard width={400}>
        <div style={{ padding: "24px 24px 20px" }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
            display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14,
          }}>
            <Trash2 size={18} color="#EF4444" strokeWidth={1.8} />
          </div>
          <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
            Remove team member?
          </p>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6 }}>
            <strong style={{ color: "var(--text-primary)" }}>{member.name}</strong> will lose access immediately.
            This cannot be undone.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, padding: "14px 24px", borderTop: "1px solid var(--border)" }}>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={onClose}
            style={{
              flex: 1, padding: "8px 0", borderRadius: 8,
              border: "1px solid var(--border)", background: "transparent",
              color: "var(--text-secondary)", fontFamily: "'DM Sans', sans-serif", fontSize: 13, cursor: "pointer",
            }}>Cancel</motion.button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
            onClick={handleRemove} disabled={removing}
            style={{
              flex: 1, padding: "8px 0", borderRadius: 8,
              border: "1px solid rgba(239,68,68,0.35)", background: "rgba(239,68,68,0.08)",
              color: "#EF4444", fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600,
              cursor: removing ? "not-allowed" : "pointer", opacity: removing ? 0.7 : 1,
            }}>
            {removing ? "Removing…" : "Remove"}
          </motion.button>
        </div>
      </ModalCard>
    </Backdrop>
  );
}

// ── Profile Section ───────────────────────────────────────────────────────────
function ProfileSection({ user, updateUser }) {
  const [name, setName]           = useState(user?.name || "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw]         = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showPws, setShowPws]     = useState({ current: false, new: false, confirm: false });
  const [savingPw, setSavingPw]   = useState(false);

  const handleSaveProfile = async () => {
    if (!name.trim()) { toast.error("Name cannot be empty"); return; }
    if (name.trim() === user?.name) { toast.error("No changes to save"); return; }
    setSavingProfile(true);
    try {
      const result = await usersApi.updateMe({ name: name.trim() });
      updateUser({ name: result.name });
      toast.success("Profile updated");
    } catch (e) {
      toast.error(e.message || "Failed to update profile");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPw) { toast.error("Enter your current password"); return; }
    if (newPw.length < 8) { toast.error("New password must be at least 8 characters"); return; }
    if (newPw !== confirmPw) { toast.error("Passwords do not match"); return; }
    setSavingPw(true);
    try {
      await usersApi.changePassword({ current_password: currentPw, new_password: newPw });
      toast.success("Password changed");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch (e) {
      toast.error(e.message || "Failed to change password");
    } finally {
      setSavingPw(false);
    }
  };

  const togglePw = (key) => setShowPws(s => ({ ...s, [key]: !s[key] }));

  return (
    <SectionCard title="PROFILE" icon={User} delay={0.05}>
      {/* Avatar + name row */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <Avatar name={name} size={60} fontSize={20} />
        <div>
          <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
            {user?.name}
          </p>
          <RoleBadge role={user?.role} />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
        <Field label="FULL NAME">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
        </Field>
        <Field label="EMAIL">
          <Input value={user?.email || ""} readOnly />
        </Field>
        <Field label="ROLE">
          <div style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-secondary)" }}>
            <RoleBadge role={user?.role} />
          </div>
        </Field>
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
        onClick={handleSaveProfile} disabled={savingProfile}
        style={{
          width: "100%", padding: "9px 0", borderRadius: 9,
          border: "1px solid var(--gold)", background: "var(--gold-dim)",
          color: "var(--gold)", fontFamily: "'DM Sans', sans-serif",
          fontSize: 13, fontWeight: 600, cursor: savingProfile ? "not-allowed" : "pointer",
          opacity: savingProfile ? 0.7 : 1, marginBottom: 28,
        }}>
        {savingProfile ? "Saving…" : "Save Profile"}
      </motion.button>

      {/* Divider */}
      <div style={{ borderTop: "1px solid var(--border)", marginBottom: 20 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <Lock size={13} color="var(--text-secondary)" strokeWidth={1.8} />
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--text-secondary)", letterSpacing: "0.07em" }}>
          CHANGE PASSWORD
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
        <Field label="CURRENT PASSWORD">
          <Input
            value={currentPw} onChange={e => setCurrentPw(e.target.value)}
            type={showPws.current ? "text" : "password"}
            placeholder="Enter current password"
            rightSlot={
              <button type="button" onClick={() => togglePw("current")}
                style={{ background: "none", border: "none", color: "var(--text-secondary)", display: "flex", cursor: "pointer", padding: 0 }}>
                {showPws.current ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            }
          />
        </Field>
        <Field label="NEW PASSWORD">
          <Input
            value={newPw} onChange={e => setNewPw(e.target.value)}
            type={showPws.new ? "text" : "password"}
            placeholder="Min 8 characters"
            rightSlot={
              <button type="button" onClick={() => togglePw("new")}
                style={{ background: "none", border: "none", color: "var(--text-secondary)", display: "flex", cursor: "pointer", padding: 0 }}>
                {showPws.new ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            }
          />
        </Field>
        <Field label="CONFIRM NEW PASSWORD">
          <Input
            value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
            type={showPws.confirm ? "text" : "password"}
            placeholder="Repeat new password"
            rightSlot={
              <button type="button" onClick={() => togglePw("confirm")}
                style={{ background: "none", border: "none", color: "var(--text-secondary)", display: "flex", cursor: "pointer", padding: 0 }}>
                {showPws.confirm ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            }
          />
        </Field>
      </div>

      {/* New pw strength indicator */}
      {newPw.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ height: 3, borderRadius: 3, background: "var(--border)", overflow: "hidden", marginBottom: 4 }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (newPw.length / 16) * 100)}%` }}
              style={{
                height: "100%", borderRadius: 3,
                background: newPw.length < 8 ? "#EF4444" : newPw.length < 12 ? "#F59E0B" : "#10B981",
                transition: "background 0.3s",
              }}
            />
          </div>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--text-secondary)" }}>
            {newPw.length < 8 ? "Too short" : newPw.length < 12 ? "Fair" : "Strong"}
          </p>
        </div>
      )}

      <motion.button
        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
        onClick={handleChangePassword} disabled={savingPw}
        style={{
          width: "100%", padding: "9px 0", borderRadius: 9,
          border: "1px solid var(--border)", background: "transparent",
          color: "var(--text-secondary)", fontFamily: "'DM Sans', sans-serif",
          fontSize: 13, fontWeight: 500, cursor: savingPw ? "not-allowed" : "pointer",
          opacity: savingPw ? 0.7 : 1,
        }}>
        {savingPw ? "Updating…" : "Update Password"}
      </motion.button>
    </SectionCard>
  );
}

// ── Team Section ──────────────────────────────────────────────────────────────
function TeamSection({ currentUserId }) {
  const [members, setMembers]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    usersApi.list()
      .then(data => setMembers(data || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <SectionCard
        title="TEAM MANAGEMENT"
        icon={Shield}
        iconColor="#C9A84C"
        delay={0.1}
      >
        {/* Header action */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => setShowInvite(true)}
            style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "8px 14px", borderRadius: 9,
              border: "1px solid var(--gold)", background: "var(--gold-dim)",
              color: "var(--gold)", fontFamily: "'DM Sans', sans-serif",
              fontSize: 12, fontWeight: 600, cursor: "pointer",
            }}>
            <UserPlus size={13} strokeWidth={2} />
            Invite Member
          </motion.button>
        </div>

        {/* Members list */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Skel w={38} h={38} r={50} delay={i * 0.07} />
                <div style={{ flex: 1 }}>
                  <Skel w="55%" h={12} r={4} delay={i * 0.07} style={{ marginBottom: 6 }} />
                  <Skel w="70%" h={10} r={4} delay={i * 0.07 + 0.03} />
                </div>
                <Skel w={72} h={22} r={20} delay={i * 0.07} />
              </div>
            ))}
          </div>
        ) : error ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 0" }}>
            <AlertCircle size={15} color="#EF4444" />
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#EF4444" }}>{error}</span>
          </div>
        ) : members.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "var(--text-secondary)" }}>
              No team members yet
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <AnimatePresence>
              {members.map((m, i) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 20, transition: { duration: 0.18 } }}
                  transition={{ duration: 0.2, delay: i * 0.05 }}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "10px 10px", borderRadius: 10,
                    transition: "background 0.12s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-secondary)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <Avatar name={m.name} size={38} fontSize={13} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 500,
                      color: "var(--text-primary)", marginBottom: 2,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {m.name}
                      {m.id === currentUserId && (
                        <span style={{
                          fontFamily: "'DM Mono', monospace", fontSize: 9,
                          color: "var(--gold)", background: "var(--gold-dim)",
                          borderRadius: 4, padding: "1px 5px", marginLeft: 6,
                        }}>YOU</span>
                      )}
                    </p>
                    <p style={{
                      fontFamily: "'DM Mono', monospace", fontSize: 10, color: "var(--text-secondary)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>{m.email}</p>
                  </div>
                  <RoleBadge role={m.role} />
                  {m.id !== currentUserId && (
                    <motion.button
                      whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                      onClick={() => setRemoveTarget(m)}
                      style={{
                        background: "transparent", border: "1px solid var(--border)",
                        borderRadius: 7, padding: "5px 7px", display: "flex",
                        color: "var(--text-secondary)", flexShrink: 0,
                      }}
                      title="Remove member"
                    >
                      <Trash2 size={12} strokeWidth={1.6} />
                    </motion.button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </SectionCard>

      <AnimatePresence>
        {showInvite && (
          <InviteModal
            key="invite"
            onClose={() => setShowInvite(false)}
            onInvited={(newMember) => setMembers(prev => [...prev, newMember])}
          />
        )}
        {removeTarget && (
          <RemoveModal
            key="remove"
            member={removeTarget}
            onClose={() => setRemoveTarget(null)}
            onRemoved={(id) => setMembers(prev => prev.filter(m => m.id !== id))}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ── Preferences Section ───────────────────────────────────────────────────────
function PreferencesSection() {
  const [theme, setTheme]       = useState("dark");
  const [timezone, setTimezone] = useState("UTC");

  useEffect(() => {
    const t = localStorage.getItem("ascencio_theme") || "dark";
    const tz = localStorage.getItem("ascencio_timezone") || "UTC";
    setTheme(t);
    setTimezone(tz);
  }, []);

  const handleThemeChange = (next) => {
    setTheme(next);
    localStorage.setItem("ascencio_theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  const handleTimezoneChange = (e) => {
    const tz = e.target.value;
    setTimezone(tz);
    localStorage.setItem("ascencio_timezone", tz);
    toast.success(`Timezone set to ${tz}`);
  };

  return (
    <SectionCard title="PREFERENCES" icon={Globe} iconColor="#3B82F6" delay={0.15}>
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        {/* Theme toggle */}
        <div style={{ flex: 1, minWidth: 200 }}>
          <label style={labelStyle}>THEME</label>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { value: "dark",  icon: Moon, label: "Dark"  },
              { value: "light", icon: Sun,  label: "Light" },
            ].map(({ value, icon: Icon, label }) => (
              <motion.button
                key={value}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                onClick={() => handleThemeChange(value)}
                style={{
                  flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "10px 0", borderRadius: 9,
                  border: `1px solid ${theme === value ? "var(--gold)" : "var(--border)"}`,
                  background: theme === value ? "var(--gold-dim)" : "var(--bg-secondary)",
                  color: theme === value ? "var(--gold)" : "var(--text-secondary)",
                  fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: theme === value ? 600 : 400,
                  cursor: "pointer", transition: "all 0.15s",
                }}>
                <Icon size={14} strokeWidth={1.8} />
                {label}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Timezone */}
        <div style={{ flex: 1, minWidth: 200 }}>
          <label style={labelStyle}>TIMEZONE</label>
          <div style={{ position: "relative" }}>
            <select
              value={timezone}
              onChange={handleTimezoneChange}
              style={{
                width: "100%", padding: "9px 32px 9px 12px",
                borderRadius: 8, border: "1px solid var(--border)",
                background: "var(--bg-secondary)", color: "var(--text-primary)",
                fontFamily: "'DM Sans', sans-serif", fontSize: 13,
                outline: "none", cursor: "pointer", appearance: "none",
              }}
            >
              {TIMEZONES.map(tz => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
            <ChevronDown size={13} color="var(--text-secondary)" style={{
              position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none",
            }} />
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user, updateUser } = useAuth();

  // TEMP preview mode support
  const isPreview = typeof window !== "undefined" && localStorage.getItem("preview_mode") === "1";
  const activeUser = isPreview
    ? { id: "preview", name: "Preview User", email: "preview@ascencio.com", role: "admin" }
    : user;

  const isAdmin = activeUser?.role === "admin";

  return (
    <Shell topbarText="Settings">
      <div className="fade-up">
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{ marginBottom: 26 }}
        >
          <h2 style={{
            fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700,
            color: "var(--text-primary)", marginBottom: 4,
          }}>Settings</h2>
          <p style={{
            fontFamily: "'DM Sans', sans-serif", fontSize: 13,
            color: "var(--text-secondary)",
          }}>
            Manage your profile, team, and preferences
          </p>
        </motion.div>

        {/* Top row: Profile + Team */}
        <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <ProfileSection user={activeUser} updateUser={updateUser} />
          </div>
          {isAdmin && (
            <div style={{ flex: 1.3, minWidth: 0 }}>
              <TeamSection currentUserId={activeUser?.id} />
            </div>
          )}
        </div>

        {/* Bottom: Preferences */}
        <PreferencesSection />
      </div>
    </Shell>
  );
}
