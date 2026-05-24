"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/",         label: "PR Feed"      },
  { href: "/risk-map", label: "Risk Map"     },
  { href: "/memory",   label: "Agent Memory" },
];

const GITHUB_APP_URL =
  process.env.NEXT_PUBLIC_GITHUB_APP_URL ||
  "https://github.com/apps/blast-radius-ai/installations/new";

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

      {/* Right side: Live indicator + Install button */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        {/* Live dot */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            width: 7, height: 7, borderRadius: "50%",
            background: "#059669",
            boxShadow: "0 0 8px #059669, 0 0 14px rgba(5,150,105,0.4)",
            animation: "pulse 2s infinite",
          }} />
          <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500 }}>Live</span>
        </div>

        {/* Install button */}
        <a
          href={GITHUB_APP_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            background: "linear-gradient(135deg, #1e1743 0%, #2d1f6e 100%)",
            color: "#ffffff",
            fontSize: 12,
            fontWeight: 650,
            padding: "7px 14px",
            borderRadius: 9,
            textDecoration: "none",
            border: "1px solid rgba(124,58,237,0.35)",
            boxShadow: "0 2px 10px rgba(30,23,67,0.25), 0 0 0 1px rgba(255,255,255,0.04) inset",
            transition: "all 0.18s",
            letterSpacing: "-0.1px",
            flexShrink: 0,
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLAnchorElement).style.boxShadow =
              "0 4px 16px rgba(124,58,237,0.35), 0 0 0 1px rgba(255,255,255,0.06) inset";
            (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-1px)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLAnchorElement).style.boxShadow =
              "0 2px 10px rgba(30,23,67,0.25), 0 0 0 1px rgba(255,255,255,0.04) inset";
            (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
          }}
        >
          {/* GitHub mark */}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.741 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
          </svg>
          Install App
        </a>
      </div>
    </nav>
  );
}
