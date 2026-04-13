"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { C, T } from "@/lib/tokens";
import ImportModal from "@/components/ImportModal";

function NavItem({ icon, label, href, active }) {
  return (
    <Link href={href} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 16px", borderRadius: 8, background: active ? C.accentDim : "transparent", color: active ? C.accent : C.muted, fontSize: 13, fontWeight: active ? 500 : 400, textDecoration: "none", transition: "all 0.15s", ...T.body }}>
      <span style={{ fontSize: 14 }}>{icon}</span>{label}
      {active && <span style={{ marginLeft: "auto", width: 4, height: 4, borderRadius: "50%", background: C.accent }} />}
    </Link>
  );
}

function B2CPlaceholder() {
  return (
    <div style={{ margin: "8px 0", padding: "12px 14px", borderRadius: 10, border: `1px dashed ${C.border}`, background: C.subtle, opacity: 0.7 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 13 }}>👥</span>
        <span style={{ ...T.body, fontSize: 12, fontWeight: 500, color: C.muted }}>B2C Leads</span>
        <span style={{ ...T.mono, fontSize: 9, padding: "2px 6px", borderRadius: 4, background: C.border, color: C.muted, letterSpacing: "0.05em" }}>SOON</span>
      </div>
      <p style={{ ...T.body, fontSize: 11, color: C.muted, lineHeight: 1.5, margin: 0 }}>
        Facebook & Instagram lead forms will flow here automatically once Meta accounts are connected.
      </p>
    </div>
  );
}

export default function Shell({ children, topbarText }) {
  const { user, loading, logout } = useAuth();
  const { isDark, toggle } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [showImport, setShowImport] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading]);

  if (loading || !user) return null;

  const initial = user.name?.[0]?.toUpperCase() || "U";

  return (
    <div style={{ display: "flex", height: "100vh", background: C.bg, overflow: "hidden" }}>

      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImported={() => { setShowImport(false); window.location.reload(); }}
        />
      )}

      {/* Sidebar */}
      <div style={{ width: 220, flexShrink: 0, background: C.surface, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", padding: "0 12px 20px" }}>
        <div style={{ padding: "22px 8px 24px" }}>
          <div style={{ ...T.heading, fontSize: 18, fontWeight: 800, color: C.text, letterSpacing: "-0.02em" }}>
            <span style={{ color: C.accent }}>A</span>SCENCIO
          </div>
          <div style={{ ...T.mono, fontSize: 10, color: C.muted, letterSpacing: "0.06em", marginTop: 2 }}>PERFORMANCE AGENCY</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <p style={{ ...T.mono, fontSize: 9, color: C.muted, letterSpacing: "0.1em", padding: "0 8px", marginBottom: 4 }}>B2B</p>
          <NavItem icon="◈" label="Pipeline"       href="/pipeline" active={pathname === "/pipeline"} />
          <NavItem icon="◎" label="Pre-Call Brief"  href="/brief"    active={pathname === "/brief"} />
          <NavItem icon="✉" label="Inbox"           href="/inbox"    active={pathname === "/inbox"} />
          <NavItem icon="◇" label="Revenue"         href="/revenue"  active={pathname === "/revenue"} />
          <NavItem icon="📞" label="Dialer"           href="/dialer"   active={pathname === "/dialer"} />
        </div>

        <div style={{ marginTop: 16 }}>
          <p style={{ ...T.mono, fontSize: 9, color: C.muted, letterSpacing: "0.1em", padding: "0 8px", marginBottom: 4 }}>B2C</p>
          <B2CPlaceholder />
        </div>

        <div style={{ flex: 1 }} />

        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 10px", borderRadius: 8, background: C.subtle }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.accentDim, border: `1px solid ${C.accentBorder}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span style={{ ...T.heading, fontSize: 12, color: C.accent, fontWeight: 700 }}>{initial}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ ...T.body, fontSize: 12, color: C.text, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</div>
              <div style={{ ...T.mono, fontSize: 10, color: C.muted, textTransform: "capitalize" }}>{user.role?.replace("_", " ")}</div>
            </div>
          </div>
          <button onClick={logout} style={{ ...T.mono, fontSize: 10, color: C.muted, background: "transparent", border: "none", cursor: "pointer", padding: "0 8px", textAlign: "left", letterSpacing: "0.04em" }}>
            Sign out →
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "14px 28px", borderBottom: `1px solid ${C.border}`, background: C.surface, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ ...T.mono, fontSize: 11, color: C.muted }}>{topbarText}</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>

            {/* Dark mode toggle — prominent in topbar */}
            <button onClick={toggle}
              title={isDark ? "Switch to light mode" : "Switch to dark mode"}
              style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${C.border}`, background: C.subtle, color: C.muted, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {isDark ? "☀️" : "🌙"}
            </button>

            <button onClick={() => setShowImport(true)} style={{ ...T.body, fontSize: 12, padding: "6px 14px", borderRadius: 7, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, cursor: "pointer" }}>⬆ Import</button>
            <button style={{ ...T.body, fontSize: 12, padding: "6px 14px", borderRadius: 7, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, cursor: "pointer" }}>+ Add Lead</button>
            <button style={{ ...T.body, fontSize: 12, fontWeight: 500, padding: "6px 14px", borderRadius: 7, border: "none", background: C.accent, color: "#FFFFFF", cursor: "pointer" }}>Export</button>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "24px 28px" }}>
          {children}
        </div>
      </div>
    </div>
  );
}