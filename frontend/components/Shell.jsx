"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { LayoutGrid, Phone, TrendingUp, Sun, Moon, LogOut, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const NAV = [
  { icon: LayoutGrid, label: "Pipeline",       href: "/pipeline" },
  { icon: Phone,       label: "Pre-Call Brief",  href: "/brief"    },
  { icon: TrendingUp,  label: "Revenue",          href: "/revenue"  },
];

function NavItem({ icon: Icon, label, href, active }) {
  return (
    <Link href={href} style={{ textDecoration: "none" }}>
      <motion.div
        whileHover={{ x: active ? 0 : 3 }}
        whileTap={{ scale: 0.97 }}
        transition={{ duration: 0.15 }}
        style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "9px 12px", borderRadius: 9, position: "relative",
          background: active ? "var(--gold-dim)" : "transparent",
          color: active ? "var(--gold)" : "var(--text-secondary)",
          fontSize: 13, fontWeight: active ? 500 : 400,
          transition: "background 0.15s, color 0.15s",
          overflow: "hidden",
        }}
      >
        {active && (
          <motion.div
            layoutId="nav-indicator"
            style={{
              position: "absolute", left: 0, top: "15%", bottom: "15%",
              width: 3, borderRadius: 2, background: "var(--gold)",
            }}
            transition={{ type: "spring", stiffness: 400, damping: 35 }}
          />
        )}
        <Icon size={15} strokeWidth={active ? 2.2 : 1.8} />
        <span style={{ fontFamily: "'DM Sans', sans-serif" }}>{label}</span>
        {active && (
          <ChevronRight size={12} style={{ marginLeft: "auto", opacity: 0.5 }} />
        )}
      </motion.div>
    </Link>
  );
}

export default function Shell({ children, topbarText, onAddLead }) {
  const { user, loading, logout } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const saved = localStorage.getItem("ascencio_theme") || "dark";
    setTheme(saved);
    document.documentElement.setAttribute("data-theme", saved);
  }, []);

  // TEMP - REMOVE BEFORE PRODUCTION
  const isPreview = typeof window !== "undefined" && localStorage.getItem("preview_mode") === "1";
  const previewUser = { name: "Preview User", role: "admin" };
  const activeUser = isPreview ? previewUser : user;

  useEffect(() => {
    if (!isPreview && !loading && !user) router.replace("/login");
  }, [user, loading, isPreview]);

  if (!isPreview && (loading || !user)) return null;

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("ascencio_theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  const initial = activeUser.name?.[0]?.toUpperCase() || "U";

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--bg-primary)", overflow: "hidden" }}>

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <div style={{
        width: 236, flexShrink: 0,
        background: "var(--bg-secondary)",
        borderRight: "1px solid var(--border)",
        display: "flex", flexDirection: "column",
        padding: "0 10px 18px",
        transition: "background 0.3s ease",
      }}>

        {/* Logo */}
        <div style={{ padding: "24px 14px 26px" }}>
          <div style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: 17, fontWeight: 800,
            color: "var(--text-primary)", letterSpacing: "-0.02em",
          }}>
            <span style={{ color: "var(--gold)" }}>A</span>SCENCIO
          </div>
          <div style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 9, color: "var(--text-secondary)",
            letterSpacing: "0.1em", marginTop: 3,
          }}>
            PERFORMANCE AGENCY
          </div>
        </div>

        {/* Nav */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
          <p style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 9, color: "var(--text-secondary)",
            letterSpacing: "0.1em", padding: "0 12px", marginBottom: 8,
          }}>WORKSPACE</p>
          {NAV.map(item => (
            <NavItem key={item.href} {...item} active={pathname === item.href} />
          ))}
        </div>

        {/* Bottom */}
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>

          {/* Theme toggle */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={toggleTheme}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 12px", borderRadius: 8,
              border: "1px solid var(--border)",
              background: "transparent",
              fontFamily: "'DM Mono', monospace", fontSize: 11,
              color: "var(--text-secondary)", width: "100%",
              transition: "border-color 0.15s, color 0.15s",
            }}
          >
            {theme === "dark"
              ? <Sun size={13} strokeWidth={1.8} />
              : <Moon size={13} strokeWidth={1.8} />}
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </motion.button>

          {/* User card */}
          <div style={{
            display: "flex", gap: 8, alignItems: "center",
            padding: "10px 12px", borderRadius: 9,
            background: "var(--bg-card)", border: "1px solid var(--border)",
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: "50%",
              background: "var(--gold-dim)",
              border: "1px solid var(--gold)",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <span style={{
                fontFamily: "'Syne', sans-serif",
                fontSize: 12, fontWeight: 700, color: "var(--gold)",
              }}>{initial}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 12, fontWeight: 500,
                color: "var(--text-primary)",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>{activeUser.name}</div>
              <div style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 10, color: "var(--text-secondary)", textTransform: "capitalize",
              }}>{activeUser.role?.replace("_", " ")}</div>
            </div>
            <motion.button
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.9 }}
              onClick={logout}
              style={{
                background: "transparent", border: "none",
                color: "var(--text-secondary)", padding: 4,
                display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: 6, transition: "color 0.15s",
              }}
              title="Sign out"
            >
              <LogOut size={13} strokeWidth={1.8} />
            </motion.button>
          </div>
        </div>
      </div>

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>

        {/* Topbar */}
        <div style={{
          padding: "13px 28px",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-secondary)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
          transition: "background 0.3s ease",
        }}>
          <div style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 11, color: "var(--text-secondary)",
          }}>{topbarText}</div>

          <div style={{ display: "flex", gap: 7 }}>
            <button style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 12, padding: "6px 14px", borderRadius: 7,
              border: "1px solid var(--border)",
              background: "transparent", color: "var(--text-secondary)",
            }}>⬆ Import</button>
            <button
              onClick={onAddLead}
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 12, padding: "6px 14px", borderRadius: 7,
                border: "1px solid var(--border)",
                background: "transparent", color: "var(--text-secondary)",
              }}
            >+ Add Lead</button>
            <button style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 12, fontWeight: 600, padding: "6px 16px", borderRadius: 7,
              border: "none", background: "var(--gold)", color: "#0A0B0F",
            }}>Export</button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
          {children}
        </div>
      </div>
    </div>
  );
}
