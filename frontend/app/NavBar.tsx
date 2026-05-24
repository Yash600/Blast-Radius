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
      background: "rgba(232,227,216,0.9)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      borderBottom: "1px solid rgba(0,0,0,0.06)",
      position: "sticky",
      top: 0,
      zIndex: 50,
      height: "60px",
      display: "flex",
      alignItems: "center",
      padding: "0 28px",
    }}>

      {/* Logo — left */}
      <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <div style={{
          width: 33, height: 33,
          background: "#1c1c1e",
          borderRadius: 10,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16,
          boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
        }}>💥</div>
        <span style={{ fontWeight: 800, fontSize: 15, color: "#1a1a1a", letterSpacing: "-0.3px" }}>
          Blast Radius
        </span>
        <span style={{
          fontSize: 9, fontWeight: 800, letterSpacing: "1px",
          color: "#9a6f10",
          background: "rgba(232,184,75,0.2)",
          border: "1px solid rgba(232,184,75,0.45)",
          borderRadius: 5,
          padding: "2px 6px",
          textTransform: "uppercase",
        }}>AI</span>
      </Link>

      {/* Nav links — center */}
      <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", gap: 3 }}>
        {NAV_LINKS.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} style={{
              color: active ? "#fff" : "#777",
              fontSize: 13,
              fontWeight: active ? 600 : 500,
              padding: "7px 18px",
              borderRadius: 99,
              textDecoration: "none",
              background: active ? "#1c1c1e" : "transparent",
              transition: "all 0.18s",
              boxShadow: active ? "0 2px 8px rgba(0,0,0,0.2)" : "none",
            }}>
              {label}
            </Link>
          );
        })}
      </div>

      {/* Right — live indicator + install */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            width: 7, height: 7, borderRadius: "50%",
            background: "#38a169",
            boxShadow: "0 0 0 2px rgba(56,161,105,0.25)",
            animation: "pulse 2s infinite",
          }} />
          <span style={{ fontSize: 12, color: "#a0a0a0", fontWeight: 500 }}>Live</span>
        </div>

        <a
          href={GITHUB_APP_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex", alignItems: "center", gap: 7,
            background: "#1c1c1e",
            color: "#fff",
            fontSize: 12, fontWeight: 600,
            padding: "7px 15px",
            borderRadius: 99,
            textDecoration: "none",
            boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
            transition: "all 0.18s",
            letterSpacing: "-0.1px",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-1px)";
            (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 4px 14px rgba(0,0,0,0.28)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
            (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.18)";
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.741 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
          </svg>
          Install App
        </a>
      </div>
    </nav>
  );
}
