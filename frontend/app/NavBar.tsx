"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/",         label: "PR Feed"      },
  { href: "/risk-map", label: "Risk Map"     },
  { href: "/memory",   label: "Agent Memory" },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav style={{
      borderBottom: "1px solid rgba(124,58,237,0.12)",
      background: "rgba(243,240,255,0.88)",
      backdropFilter: "blur(24px)",
      WebkitBackdropFilter: "blur(24px)",
      position: "sticky",
      top: 0,
      zIndex: 50,
      padding: "0 32px",
      height: "58px",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      boxShadow: "0 1px 0 rgba(124,58,237,0.08), 0 2px 12px rgba(0,0,0,0.04)",
    }}>
      {/* Logo */}
      <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 30, height: 30,
          background: "linear-gradient(135deg, #7c3aed, #db2777)",
          borderRadius: 9,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 15, flexShrink: 0,
          boxShadow: "0 4px 14px rgba(124,58,237,0.35)",
        }}>💥</div>
        <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.3px" }} className="gradient-text">
          Blast Radius
        </span>
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: "0.8px",
          color: "#7c3aed", background: "rgba(124,58,237,0.09)",
          border: "1px solid rgba(124,58,237,0.25)", borderRadius: 5,
          padding: "2px 7px", textTransform: "uppercase",
        }}>AI</span>
      </Link>

      {/* Nav links */}
      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
        {NAV_LINKS.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} style={{
              color: active ? "#7c3aed" : "var(--text-secondary)",
              fontSize: 13,
              fontWeight: active ? 600 : 500,
              padding: "7px 14px",
              borderRadius: 9,
              textDecoration: "none",
              background: active ? "rgba(124,58,237,0.1)" : "transparent",
              border: active ? "1px solid rgba(124,58,237,0.25)" : "1px solid transparent",
              transition: "all 0.18s",
              boxShadow: active ? "0 0 12px rgba(124,58,237,0.12)" : "none",
            }}>
              {label}
            </Link>
          );
        })}
      </div>

      {/* Live indicator */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{
          width: 7, height: 7, borderRadius: "50%",
          background: "#059669",
          boxShadow: "0 0 8px #059669, 0 0 14px rgba(5,150,105,0.4)",
          animation: "pulse 2s infinite",
        }} />
        <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500 }}>Live</span>
      </div>
    </nav>
  );
}
