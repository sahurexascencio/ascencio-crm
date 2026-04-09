"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, LayoutGrid, Phone, PhoneCall, TrendingUp, CheckSquare, MessageSquare, Settings, Sun, Moon, LogOut, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const NAV = [
  { icon: LayoutDashboard, label: "Dashboard",       href: "/dashboard"  },
  { icon: LayoutGrid,      label: "Pipeline",       href: "/pipeline"   },
  { icon: PhoneCall,       label: "Call Mode",        href: "/call-mode"  },
  { icon: Phone,           label: "Pre-Call Brief",  href: "/brief"      },
  { icon: CheckSquare,     label: "Tasks",            href: "/tasks"      },
  { icon: MessageSquare,   label: "Templates",       href: "/templates" },
  { icon: TrendingUp,      label: "Revenue",          href: "/revenue"    },
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

export default function Shell({ children, topbarText, onAddLead, contentStyle }) {
  const { user, loading, logout } = useAuth();
  const router   = useRouter();
  const pathname = usePathname();
  const [theme, setTheme]       = useState("dark");
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

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

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("ascencio_theme", next);
    document.documentElement.setAttribute("data-theme", next);
  };

  const handleLogout = () => {
    setMenuOpen(false);
    // TEMP - REMOVE BEFORE PRODUCTION
    localStorage.removeItem("preview_mode");
    logout();
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

          {/* User card — clickable, opens pop-up menu */}
          <div ref={menuRef} style={{ position: "relative" }}>
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.97 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  style={{
                    position: "absolute", bottom: "calc(100% + 8px)", left: 0, right: 0,
                    background: "var(--bg-card)", border: "1px solid var(--border)",
                    borderRadius: 10, overflow: "hidden",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                    zIndex: 50,
                  }}
                >
                  {[
                    { icon: Settings, label: "Settings", onClick: () => { setMenuOpen(false); router.push("/settings"); } },
                    { icon: LogOut,   label: "Log out",  onClick: handleLogout, danger: true },
                  ].map(({ icon: Icon, label, onClick, danger }) => (
                    <motion.button
                      key={label}
                      whileHover={{ background: danger ? "rgba(239,68,68,0.07)" : "var(--bg-secondary)" }}
                      onClick={onClick}
                      style={{
                        width: "100%", display: "flex", alignItems: "center", gap: 9,
                        padding: "10px 14px", background: "transparent", border: "none",
                        color: danger ? "#EF4444" : "var(--text-secondary)",
                        fontFamily: "'DM Sans', sans-serif", fontSize: 13,
                        cursor: "pointer", textAlign: "left",
                      }}
                    >
                      <Icon size={13} strokeWidth={1.8} />
                      {label}
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <motion.div
              whileHover={{ borderColor: "var(--gold)" }}
              onClick={() => setMenuOpen(o => !o)}
              style={{
                display: "flex", gap: 8, alignItems: "center",
                padding: "10px 12px", borderRadius: 9,
                background: "var(--bg-card)", border: "1px solid var(--border)",
                cursor: "pointer", transition: "border-color 0.15s",
              }}
            >
              <div style={{
                width: 30, height: 30, borderRadius: "50%",
                background: "var(--gold-dim)", border: "1px solid var(--gold)",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 12, fontWeight: 700, color: "var(--gold)" }}>
                  {initial}
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 500,
                  color: "var(--text-primary)",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>{activeUser.name}</div>
                <div style={{
                  fontFamily: "'DM Mono', monospace", fontSize: 10,
                  color: "var(--text-secondary)", textTransform: "capitalize",
                }}>{activeUser.role?.replace("_", " ")}</div>
              </div>
              <ChevronRight
                size={13}
                strokeWidth={1.8}
                color="var(--text-secondary)"
                style={{
                  transform: menuOpen ? "rotate(90deg)" : "rotate(0deg)",
                  transition: "transform 0.2s",
                  flexShrink: 0,
                }}
              />
            </motion.div>
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
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px", ...contentStyle }}>
          {children}
        </div>
      </div>
    </div>
  );
}
