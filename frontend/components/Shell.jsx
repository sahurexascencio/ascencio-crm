"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { C, T } from "@/lib/tokens";

function NavItem({ icon, label, href, active }) {
  return (
    <Link href={href} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 16px", borderRadius: 8, background: active ? C.accentDim : "transparent", color: active ? C.accent : C.muted, fontSize: 13, fontWeight: active ? 500 : 400, textDecoration: "none", transition: "all 0.15s", ...T.body }}>
      <span style={{ fontSize: 14 }}>{icon}</span>{label}
      {active && <span style={{ marginLeft: "auto", width: 4, height: 4, borderRadius: "50%", background: C.accent }} />}
    </Link>
  );
}

export default function Shell({ children, topbarText }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading]);

  if (loading || !user) return null;

  const initial = user.name?.[0]?.toUpperCase() || "U";

  return (
    <div style={{ display: "flex", height: "100vh", background: C.bg, overflow: "hidden" }}>
      {/* Sidebar */}
      <div style={{ width: 220, flexShrink: 0, background: C.surface, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", padding: "0 12px 20px" }}>
        <div style={{ padding: "22px 8px 28px" }}>
          <div style={{ ...T.heading, fontSize: 18, fontWeight: 800, color: C.text, letterSpacing: "-0.02em" }}>
            <span style={{ color: C.accent }}>A</span>SCENCIO
          </div>
          <div style={{ ...T.mono, fontSize: 10, color: C.muted, letterSpacing: "0.06em", marginTop: 2 }}>PERFORMANCE AGENCY</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
          <p style={{ ...T.mono, fontSize: 9, color: C.muted, letterSpacing: "0.1em", padding: "0 8px", marginBottom: 6 }}>WORKSPACE</p>
          <NavItem icon="◈" label="Pipeline"       href="/pipeline" active={pathname === "/pipeline"} />
          <NavItem icon="◎" label="Pre-Call Brief"  href="/brief"    active={pathname === "/brief"} />
          <NavItem icon="◇" label="Revenue"         href="/revenue"  active={pathname === "/revenue"} />
        </div>

        <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "8px 10px", borderRadius: 8, background: C.subtle }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.accentDim, border: `1px solid ${C.accent}35`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
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
        <div style={{ padding: "16px 28px", borderBottom: `1px solid ${C.border}`, background: C.surface, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ ...T.mono, fontSize: 11, color: C.muted }}>{topbarText}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ ...T.body, fontSize: 12, padding: "6px 14px", borderRadius: 7, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, cursor: "pointer" }}>⬆ Import</button>
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
