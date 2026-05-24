"use client";
import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const GITHUB_APP_URL =
  process.env.NEXT_PUBLIC_GITHUB_APP_URL ||
  "https://github.com/apps/blast-radius-ai/installations/new";

type Analysis = {
  id: number;
  repo_name: string;
  pr_number: number;
  pr_title: string;
  pr_author: string;
  pr_url: string;
  severity: string;
  impact_count: number;
  semantic_change: { summary?: string; entity_name?: string; change_type?: string };
  impacted_files: { file: string; line: number; severity: string; reason: string }[];
  report: string;
  created_at: string;
};

const SEV: Record<string, { bar: string; badge: string; glow: string; sweep: string }> = {
  HIGH:   { bar: "#e11d48", badge: "badge-high",   glow: "rgba(225,29,72,0.15)",  sweep: "rgba(225,29,72,0.05)"  },
  MEDIUM: { bar: "#d97706", badge: "badge-medium", glow: "rgba(217,119,6,0.15)",  sweep: "rgba(217,119,6,0.05)"  },
  LOW:    { bar: "#059669", badge: "badge-low",    glow: "rgba(5,150,105,0.15)",  sweep: "rgba(5,150,105,0.04)"  },
};

function SeverityBadge({ severity }: { severity: string }) {
  const s = SEV[severity] || SEV.LOW;
  const labels: Record<string,string> = { HIGH: "🔴 HIGH", MEDIUM: "🟡 MEDIUM", LOW: "🟢 LOW" };
  return (
    <span className={s.badge} style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20, letterSpacing: "0.3px" }}>
      {labels[severity] || "⚪ LOW"}
    </span>
  );
}

function PRCard({ analysis, onClick }: { analysis: Analysis; onClick: () => void }) {
  const s = SEV[analysis.severity] || SEV.LOW;
  return (
    <div onClick={onClick} className="card fade-up" style={{ cursor: "pointer", padding: "20px 22px", borderLeft: `3px solid ${s.bar}` }}>
      <div style={{ position: "absolute", inset: 0, borderRadius: 16, background: `linear-gradient(90deg, ${s.sweep} 0%, transparent 40%)`, pointerEvents: "none" }} />

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, position: "relative" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
            <span style={{ fontSize: 11, fontFamily: "monospace", color: "#7c3aed", background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.18)", padding: "2px 8px", borderRadius: 6 }}>
              {analysis.repo_name}
            </span>
            <span style={{ color: "var(--text-muted)", fontSize: 11, fontFamily: "monospace" }}>#{analysis.pr_number}</span>
          </div>
          <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 14, marginBottom: 5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {analysis.pr_title || "Untitled PR"}
          </p>
          <p style={{ color: "var(--text-secondary)", fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {analysis.semantic_change?.summary || "No summary available"}
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
          <SeverityBadge severity={analysis.severity} />
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{analysis.impact_count} impact{analysis.impact_count !== 1 ? "s" : ""}</span>
        </div>
      </div>

      <div style={{ position: "relative", marginTop: 14, paddingTop: 12, borderTop: "1px solid rgba(124,58,237,0.08)", display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>@{analysis.pr_author}</span>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
          {new Date(analysis.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
        {analysis.pr_url && (
          <a href={analysis.pr_url} target="_blank" rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            style={{ marginLeft: "auto", fontSize: 11, color: "#7c3aed", textDecoration: "none", fontWeight: 600 }}>
            GitHub ↗
          </a>
        )}
      </div>
    </div>
  );
}

function PRDetail({ analysis, onClose }: { analysis: Analysis; onClose: () => void }) {
  const high   = analysis.impacted_files.filter(f => f.severity === "HIGH");
  const medium = analysis.impacted_files.filter(f => f.severity === "MEDIUM");
  const low    = analysis.impacted_files.filter(f => f.severity === "LOW");
  const groups = [
    { label: "Will Break",   color: "var(--danger)",  icon: "🔴", items: high   },
    { label: "May Degrade",  color: "var(--warning)", icon: "🟡", items: medium },
    { label: "Minor Impact", color: "var(--safe)",    icon: "🟢", items: low    },
  ].filter(g => g.items.length > 0);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(30,23,67,0.35)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div className="glass" style={{ maxWidth: 660, width: "100%", maxHeight: "88vh", overflowY: "auto", borderRadius: 20 }}>
        <div style={{ padding: "24px 28px", borderBottom: "1px solid rgba(124,58,237,0.12)", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontFamily: "monospace", color: "#7c3aed" }}>{analysis.repo_name} #{analysis.pr_number}</span>
              <SeverityBadge severity={analysis.severity} />
            </div>
            <h2 style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 18, marginBottom: 6 }}>{analysis.pr_title}</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>{analysis.semantic_change?.summary}</p>
          </div>
          <button onClick={onClose} style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)", color: "var(--text-secondary)", borderRadius: 9, width: 32, height: 32, cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✕</button>
        </div>

        <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ background: "rgba(124,58,237,0.05)", border: "1px solid rgba(124,58,237,0.15)", borderRadius: 12, padding: "16px 18px" }}>
            <p style={{ color: "var(--text-muted)", fontSize: 10, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 8 }}>Changed Entity</p>
            <p style={{ color: "#7c3aed", fontFamily: "monospace", fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{analysis.semantic_change?.entity_name}</p>
            <p style={{ color: "var(--text-muted)", fontSize: 12 }}>{analysis.semantic_change?.change_type?.replace(/_/g, " ")}</p>
          </div>

          {analysis.impacted_files.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
              <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 15, marginBottom: 4 }}>No blast radius detected</p>
              <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>Safe to merge.</p>
            </div>
          ) : (
            <div>
              <p style={{ color: "var(--text-secondary)", fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
                Impact Breakdown — <span style={{ color: "var(--text-primary)" }}>{analysis.impacted_files.length}</span> touchpoint{analysis.impacted_files.length !== 1 ? "s" : ""}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {groups.map(group => (
                  <div key={group.label}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <span>{group.icon}</span>
                      <span style={{ color: group.color, fontSize: 12, fontWeight: 700 }}>{group.label}</span>
                      <span style={{ color: "var(--text-muted)", fontSize: 11, background: "rgba(0,0,0,0.04)", borderRadius: 5, padding: "1px 7px", border: "1px solid rgba(124,58,237,0.12)" }}>{group.items.length}</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {group.items.map((f, i) => (
                        <div key={i} style={{ background: "rgba(0,0,0,0.02)", border: "1px solid rgba(124,58,237,0.1)", borderRadius: 10, padding: "12px 14px" }}>
                          <p style={{ color: "var(--text-primary)", fontFamily: "monospace", fontSize: 12, marginBottom: 4 }}>
                            {f.file}<span style={{ color: "var(--text-muted)" }}>:{f.line}</span>
                          </p>
                          <p style={{ color: "var(--text-secondary)", fontSize: 12 }}>{f.reason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ScanModal({ onClose, onScanStarted }: { onClose: () => void; onScanStarted: () => void }) {
  const [repo,     setRepo]     = useState("");
  const [limit,    setLimit]    = useState(5);
  const [scanning, setScanning] = useState(false);
  const [error,    setError]    = useState("");

  function normalizeRepo(raw: string): string {
    let r = raw.trim().replace(/\/$/, "").replace(/\.git$/, "");
    for (const prefix of ["https://github.com/", "http://github.com/", "github.com/"]) {
      if (r.startsWith(prefix)) { r = r.slice(prefix.length); break; }
    }
    return r;
  }

  async function handleScan() {
    const normalized = normalizeRepo(repo);
    if (!normalized || !normalized.includes("/")) {
      setError("Enter a GitHub repo URL or owner/repo, e.g. Yash600/blast-radius-test");
      return;
    }
    setScanning(true); setError("");
    try {
      const res = await fetch(`${API}/api/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_name: normalized, limit }),
      });
      if (!res.ok) throw new Error(await res.text());
      onScanStarted(); onClose();
    } catch (e: any) {
      setError(e.message || "Scan failed");
      setScanning(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(30,23,67,0.35)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div className="glass" style={{ maxWidth: 460, width: "100%", borderRadius: 20, padding: "30px 32px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 34, height: 34, background: "linear-gradient(135deg, #7c3aed, #0891b2)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, boxShadow: "0 4px 14px rgba(124,58,237,0.3)" }}>🔎</div>
            <h2 style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 17 }}>Scan Existing Repo</h2>
          </div>
          <button onClick={onClose} style={{ background: "rgba(124,58,237,0.07)", border: "1px solid rgba(124,58,237,0.2)", color: "var(--text-secondary)", borderRadius: 9, width: 32, height: 32, cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        <p style={{ color: "var(--text-secondary)", fontSize: 13, margin: "14px 0 24px", lineHeight: 1.7 }}>
          Scan an existing repo's commit/PR history and get instant blast radius analysis — no new activity needed.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ color: "var(--text-secondary)", fontSize: 10, fontWeight: 700, letterSpacing: "0.7px", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Repository</label>
            <input type="text" placeholder="owner/repo or https://github.com/owner/repo" value={repo} onChange={e => setRepo(e.target.value)} style={{ width: "100%", padding: "10px 14px" }} />
          </div>
          <div>
            <label style={{ color: "var(--text-secondary)", fontSize: 10, fontWeight: 700, letterSpacing: "0.7px", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Items to scan</label>
            <select value={limit} onChange={e => setLimit(Number(e.target.value))} style={{ width: "100%", padding: "10px 14px" }}>
              <option value={5}>Last 5 commits / PRs</option>
              <option value={10}>Last 10 commits / PRs</option>
              <option value={20}>Last 20 commits / PRs</option>
            </select>
          </div>
          {error && <p style={{ color: "var(--danger)", fontSize: 12, padding: "9px 13px", background: "rgba(225,29,72,0.06)", borderRadius: 9, border: "1px solid rgba(225,29,72,0.18)" }}>{error}</p>}
          <button onClick={handleScan} disabled={scanning} className="btn-primary" style={{ width: "100%", padding: "12px", fontSize: 14 }}>
            {scanning ? "Starting scan…" : "Start Scan"}
          </button>
          <p style={{ color: "var(--text-muted)", fontSize: 11, textAlign: "center" }}>GitHub App must be installed on this repo first.</p>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [analyses,   setAnalyses]   = useState<Analysis[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [selected,   setSelected]   = useState<Analysis | null>(null);
  const [filter,     setFilter]     = useState<string>("ALL");
  const [showScan,   setShowScan]   = useState(false);
  const [scanBanner, setScanBanner] = useState(false);

  function fetchAnalyses() {
    fetch(`${API}/api/analyses`)
      .then(r => r.json())
      .then(data => { setAnalyses(data); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => {
    fetchAnalyses();
    const interval = setInterval(fetchAnalyses, 5000);
    return () => clearInterval(interval);
  }, []);

  const filtered = filter === "ALL" ? analyses : analyses.filter(a => a.severity === filter);
  const stats = {
    total:  analyses.length,
    high:   analyses.filter(a => a.severity === "HIGH").length,
    medium: analyses.filter(a => a.severity === "MEDIUM").length,
    safe:   analyses.filter(a => a.severity === "LOW" || a.impact_count === 0).length,
  };

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 36 }}>
        <div>
          <h1 style={{ fontWeight: 800, fontSize: 26, letterSpacing: "-0.6px", marginBottom: 6 }} className="gradient-text">
            PR Analysis Feed
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>Every PR analyzed for blast radius, automatically.</p>
        </div>
        <button onClick={() => setShowScan(true)} className="btn-ghost" style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          🔎 Scan Existing Repo
        </button>
      </div>

      {scanBanner && (
        <div style={{ marginBottom: 22, background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.22)", borderRadius: 12, padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ color: "#7c3aed", fontSize: 13 }}>⚡ Scan started — results will appear below automatically.</span>
          <button onClick={() => setScanBanner(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 14 }}>✕</button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 30 }}>
        {[
          { label: "Total Analyzed", value: stats.total,  cls: "total",  color: "#7c3aed" },
          { label: "High Risk",      value: stats.high,   cls: "danger", color: "#e11d48" },
          { label: "Medium Risk",    value: stats.medium, cls: "medium", color: "#d97706" },
          { label: "Safe to Merge",  value: stats.safe,   cls: "safe",   color: "#059669" },
        ].map(s => (
          <div key={s.label} className={`stat-card ${s.cls}`} style={{ position: "relative" }}>
            <p style={{ color: s.color, fontSize: 30, fontWeight: 800, marginBottom: 4, letterSpacing: "-1px", position: "relative", zIndex: 1 }}>{s.value}</p>
            <p style={{ color: "var(--text-secondary)", fontSize: 11, fontWeight: 500, position: "relative", zIndex: 1 }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 22 }}>
        {[
          { key: "ALL", label: "All" }, { key: "HIGH", label: "High" },
          { key: "MEDIUM", label: "Medium" }, { key: "LOW", label: "Low" },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)} style={{
            fontSize: 12, fontWeight: 600, padding: "7px 16px", borderRadius: 20, cursor: "pointer", transition: "all 0.18s",
            border: filter === f.key ? "1px solid rgba(124,58,237,0.4)" : "1px solid rgba(124,58,237,0.15)",
            background: filter === f.key ? "rgba(124,58,237,0.12)" : "transparent",
            color: filter === f.key ? "#7c3aed" : "var(--text-secondary)",
            boxShadow: filter === f.key ? "0 0 12px rgba(124,58,237,0.1)" : "none",
          }}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-muted)" }}>
          <div style={{ fontSize: 30, marginBottom: 14 }}>⚙️</div>
          <p style={{ fontSize: 14 }}>Loading analyses…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 0" }}>
          {/* Install CTA card */}
          <div style={{
            maxWidth: 480,
            margin: "0 auto 28px",
            background: "linear-gradient(135deg, rgba(124,58,237,0.06) 0%, rgba(8,145,178,0.04) 100%)",
            border: "1px solid rgba(124,58,237,0.2)",
            borderRadius: 20,
            padding: "36px 40px",
            position: "relative",
            overflow: "hidden",
          }}>
            {/* Glow orb */}
            <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)", pointerEvents: "none" }} />

            <div style={{ fontSize: 44, marginBottom: 16 }}>💥</div>
            <h2 style={{ color: "var(--text-primary)", fontWeight: 800, fontSize: 18, marginBottom: 8, letterSpacing: "-0.4px" }}>
              No analyses yet
            </h2>
            <p style={{ color: "var(--text-secondary)", fontSize: 13, lineHeight: 1.7, marginBottom: 28 }}>
              Install the GitHub App on your repo — every pull request gets automatically analyzed for blast radius. Zero config required.
            </p>

            {/* Install button */}
            <a
              href={GITHUB_APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 9,
                background: "linear-gradient(135deg, #1e1743 0%, #2d1f6e 100%)",
                color: "#ffffff",
                fontSize: 14,
                fontWeight: 700,
                padding: "12px 24px",
                borderRadius: 11,
                textDecoration: "none",
                border: "1px solid rgba(124,58,237,0.35)",
                boxShadow: "0 4px 18px rgba(30,23,67,0.3)",
                marginBottom: 18,
                letterSpacing: "-0.1px",
              }}
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.741 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
              </svg>
              Install on GitHub — Free
            </a>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "4px 0 18px" }}>
              <div style={{ flex: 1, height: 1, background: "rgba(124,58,237,0.12)" }} />
              <span style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 500 }}>or</span>
              <div style={{ flex: 1, height: 1, background: "rgba(124,58,237,0.12)" }} />
            </div>

            {/* Scan existing */}
            <button
              onClick={() => setShowScan(true)}
              style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                background: "rgba(124,58,237,0.08)",
                border: "1px solid rgba(124,58,237,0.22)",
                color: "#7c3aed", fontSize: 13, fontWeight: 600,
                padding: "10px 20px", borderRadius: 10, cursor: "pointer",
              }}
            >
              🔎 Scan an existing repo
            </button>
          </div>

          {/* How it works steps */}
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            {[
              { step: "1", text: "Install the GitHub App" },
              { step: "2", text: "Open any pull request"  },
              { step: "3", text: "See your blast radius"  },
            ].map(({ step, text }) => (
              <div key={step} style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)", fontSize: 12 }}>
                <span style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#7c3aed" }}>{step}</span>
                {text}
                {step !== "3" && <span style={{ color: "rgba(124,58,237,0.3)", marginLeft: 4 }}>→</span>}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(a => <PRCard key={a.id} analysis={a} onClick={() => setSelected(a)} />)}
        </div>
      )}

      {selected  && <PRDetail analysis={selected} onClose={() => setSelected(null)} />}
      {showScan  && <ScanModal onClose={() => setShowScan(false)} onScanStarted={() => { setShowScan(false); setScanBanner(true); }} />}
    </div>
  );
}
