"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const inputStyle = {
  width: "100%", padding: "11px 14px",
  background: "var(--bg-primary)",
  border: "1px solid var(--border)",
  borderRadius: 9,
  fontFamily: "'DM Sans', sans-serif", fontSize: 14,
  color: "var(--text-primary)",
  outline: "none",
  transition: "border-color 0.2s",
};

export default function LoginPage() {
  const { login } = useAuth();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      toast.error(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg-primary)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: 20,
    }}>
      <motion.div
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{
          width: "100%", maxWidth: 400,
          padding: "44px 40px",
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: 20,
          boxShadow: "var(--shadow)",
        }}
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          style={{ marginBottom: 38, textAlign: "center" }}
        >
          <div style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: 26, fontWeight: 800,
            color: "var(--text-primary)", letterSpacing: "-0.02em",
            marginBottom: 5,
          }}>
            <span className="gold-pulse">A</span>SCENCIO
          </div>
          <div style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 10, color: "var(--text-secondary)", letterSpacing: "0.1em",
          }}>PERFORMANCE AGENCY</div>
        </motion.div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Email */}
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.35 }}
          >
            <label style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 10, color: "var(--text-secondary)",
              letterSpacing: "0.08em", display: "block", marginBottom: 7,
            }}>EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = "var(--gold)")}
              onBlur={e  => (e.target.style.borderColor = "var(--border)")}
            />
          </motion.div>

          {/* Password */}
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.27, duration: 0.35 }}
          >
            <label style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 10, color: "var(--text-secondary)",
              letterSpacing: "0.08em", display: "block", marginBottom: 7,
            }}>PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={inputStyle}
              onFocus={e => (e.target.style.borderColor = "var(--gold)")}
              onBlur={e  => (e.target.style.borderColor = "var(--border)")}
            />
          </motion.div>

          {/* Submit */}
          <motion.button
            type="submit"
            disabled={loading}
            whileHover={loading ? {} : { scale: 1.015 }}
            whileTap={loading ? {}   : { scale: 0.98  }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            style={{
              marginTop: 10, padding: "13px",
              borderRadius: 10, border: "none",
              background: "var(--gold)",
              color: "#0A0B0F",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 14, fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
              transition: "opacity 0.15s",
            }}
          >
            {loading ? "Signing in..." : "Sign in →"}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
