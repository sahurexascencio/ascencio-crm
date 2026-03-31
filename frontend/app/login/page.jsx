"use client";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { C, T } from "@/lib/tokens";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 380, padding: "40px 36px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, boxShadow: "0 4px 24px rgba(0,0,0,0.06)" }}>
        <div style={{ marginBottom: 32, textAlign: "center" }}>
          <div style={{ ...T.heading, fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: "-0.02em", marginBottom: 4 }}>
            <span style={{ color: C.accent }}>A</span>SCENCIO
          </div>
          <div style={{ ...T.mono, fontSize: 10, color: C.muted, letterSpacing: "0.06em" }}>PERFORMANCE AGENCY</div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ ...T.mono, fontSize: 10, color: C.muted, letterSpacing: "0.07em", display: "block", marginBottom: 6 }}>EMAIL</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
              style={{ width: "100%", padding: "10px 12px", background: C.subtle, border: `1px solid ${C.border}`, borderRadius: 8, ...T.body, fontSize: 14, color: C.text, outline: "none" }} />
          </div>
          <div>
            <label style={{ ...T.mono, fontSize: 10, color: C.muted, letterSpacing: "0.07em", display: "block", marginBottom: 6 }}>PASSWORD</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              style={{ width: "100%", padding: "10px 12px", background: C.subtle, border: `1px solid ${C.border}`, borderRadius: 8, ...T.body, fontSize: 14, color: C.text, outline: "none" }} />
          </div>

          {error && (
            <div style={{ ...T.body, fontSize: 12, color: "#C0392B", background: "rgba(192,57,43,0.08)", border: "1px solid rgba(192,57,43,0.2)", borderRadius: 7, padding: "8px 12px" }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            style={{ marginTop: 6, padding: "11px", borderRadius: 9, border: "none", background: C.accent, color: "#FFFFFF", ...T.body, fontSize: 14, fontWeight: 500, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
