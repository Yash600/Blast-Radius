"use client";
import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const GITHUB_APP_URL =
  process.env.NEXT_PUBLIC_GITHUB_APP_URL ||
  "https://github.com/apps/blast-radius-ai/installations/new";

type ImpactedFile = { file: string; line: number; severity: string; reason: string };
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
  impacted_files: ImpactedFile[];
  report: string;
  created_at: string;
};

const SEV_DOT: Record<string, string> = { HIGH: "#e53e3e", MEDIUM: "#e8b84b", LOW: "#38a169" };

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, { bg: string; color: string; border: string }> = {
    HIGH:   { bg: "rgba(229,62,62,0.1)",   color: "#c53030", border: "rgba(229,62,62,0.22)"  },
    MEDIUM: { bg: "rgba(196,154,48,0.12)", color: "#a07730", border: "rgba(196,154,48,0.28)" },
    LOW:    { bg: "rgba(56,161,105,0.1)",  color: "#276749", border: "rgba(56,161,105,0.22)" },
  };
  const c = map[severity] || map.LOW;
  return (
    <span style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}`, padding: "3px 10px", borderRadius: 99, fontSize: 10, fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase" }}>
      {severity || "LOW"}
    </span>
  );
}

/* ── Featured dark card (left bento) ── */
function FeaturedCard({ analyses, onOpen }: { analyses: Analysis[]; onOpen: (a: Analysis) => void }) {
  const featured = analyses.find(a => a.severity === "HIGH") || analyses[0];

  if (!featured) return (
    <div className="card-dark" style={{ padding: 28, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", minHeight: 260, gap: 16 }}>
      <div style={{ fontSize: 40 }}>💥</div>
      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, textAlign: "center", lineHeight: 1.6 }}>No analyses yet.<br />Install the app to get started.</p>
      <a href={GITHUB_APP_URL} target="_blank" rel="noopener noreferrer"
        style={{ background: "#e8b84b", color: "#1a1a1a", padding: "10px 20px", borderRadius: 99, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
        Install on GitHub
      </a>
    </div>
  );

  const dot = SEV_DOT[featured.severity] || "#38a169";

  return (
    <div className="card-dark" style={{ padding: "26px 24px", display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 260, cursor: "pointer" }}
      onClick={() => onOpen(featured)}>
      {/* Subtle glow orb */}
      <div style={{ position: "absolute", top: -40, right: -40, width: 130, height: 130, borderRadius: "50%", background: `radial-gradient(circle, ${dot}22 0%, transparent 70%)`, pointerEvents: "none" }} />

      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "monospace", letterSpacing: "0.5px" }}>
            {featured.repo_name} · #{featured.pr_number}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: dot, boxShadow: `0 0 8px ${dot}` }} />
            <span style={{ fontSize: 10, color: dot, fontWeight: 700, letterSpacing: "0.6px" }}>{featured.severity}</span>
          </div>
        </div>

        <p style={{ color: "rgba(255,255,255,0.92)", fontWeight: 700, fontSize: 15, lineHeight: 1.45, marginBottom: 12 }}>
          {featured.pr_title || "Untitled PR"}
        </p>

        {featured.semantic_change?.entity_name && (
          <span style={{ display: "inline-block", background: "rgba(232,184,75,0.12)", border: "1px solid rgba(232,184,75,0.25)", color: "#e8b84b", fontFamily: "monospace", fontSize: 11, padding: "3px 10px", borderRadius: 7, marginBottom: 12 }}>
            {featured.semantic_change.entity_name}
          </span>
        )}

        <p style={{ color: "rgba(255,255,255,0.38)", fontSize: 12, lineHeight: 1.65 }}>
          {featured.semantic_change?.summary || "No summary available"}
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 22, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.07)", position: "relative" }}>
        <div>
          <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 10, marginBottom: 2 }}>Author</p>
          <p style={{ color: "rgba(255,255,255,0.65)", fontSize: 12, fontWeight: 600 }}>@{featured.pr_author}</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", padding: "6px 12px", borderRadius: 9 }}>
            {featured.impact_count} impacts
          </span>
          {featured.pr_url && (
            <a href={featured.pr_url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
              style={{ color: "#fff", fontSize: 12, fontWeight: 600, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.12)", padding: "6px 12px", borderRadius: 9, textDecoration: "none" }}>
              View PR ↗
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Severity bar chart card ── */
function SeverityChart({ analyses }: { analyses: Analysis[] }) {
  const total = analyses.length || 1;
  const high   = analyses.filter(a => a.severity === "HIGH").length;
  const medium = analyses.filter(a => a.severity === "MEDIUM").length;
  const low    = analyses.filter(a => a.severity === "LOW").length;
  const totalImpacts = analyses.reduce((s, a) => s + (a.impact_count || 0), 0);

  const bars = [
    { label: "High Risk",    count: high,   pct: Math.round((high / total) * 100),   fill: "#1c1c1e" },
    { label: "Medium Risk",  count: medium, pct: Math.round((medium / total) * 100), fill: "#e8b84b" },
    { label: "Safe to Merge",count: low,    pct: Math.round((low / total) * 100),    fill: "#c8c3b8" },
  ];

  return (
    <div className="card" style={{ padding: "22px 20px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <p style={{ fontWeight: 700, fontSize: 14, color: "#1a1a1a", marginBottom: 2 }}>Severity Breakdown</p>
          <p style={{ fontSize: 11, color: "#a0a0a0" }}>{analyses.length} PRs analyzed</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: 26, fontWeight: 900, color: "#1a1a1a", letterSpacing: "-1px", lineHeight: 1 }}>{analyses.length}</p>
          <p style={{ fontSize: 10, color: "#a0a0a0", marginTop: 2 }}>total</p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
        {bars.map(bar => (
          <div key={bar.label}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: "#6b6b6b", fontWeight: 500 }}>{bar.label}</span>
              <span style={{ fontSize: 11, color: "#1a1a1a", fontWeight: 700 }}>{bar.pct}%</span>
            </div>
            <div style={{ height: 8, background: "rgba(0,0,0,0.06)", borderRadius: 99, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.max(bar.pct, bar.count > 0 ? 4 : 0)}%`, background: bar.fill, borderRadius: 99, transition: "width 0.7s ease" }} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(0,0,0,0.06)", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
        {[
          { label: "Critical", value: high,          color: "#e53e3e" },
          { label: "Medium",   value: medium,         color: "#c49a30" },
          { label: "Impacts",  value: totalImpacts,   color: "#1a1a1a" },
        ].map(s => (
          <div key={s.label} style={{ textAlign: "center", padding: "10px 0", background: "rgba(0,0,0,0.03)", borderRadius: 10 }}>
            <p style={{ fontSize: 20, fontWeight: 900, color: s.color, letterSpacing: "-0.5px" }}>{s.value}</p>
            <p style={{ fontSize: 10, color: "#a0a0a0", fontWeight: 500, marginTop: 2 }}>{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Top at-risk files card ── */
function TopFilesCard({ analyses }: { analyses: Analysis[] }) {
  const fileCounts: Record<string, { count: number; maxSev: string }> = {};
  const sevRank: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
  analyses.forEach(a =>
    a.impacted_files?.forEach(f => {
      if (!fileCounts[f.file]) fileCounts[f.file] = { count: 0, maxSev: "LOW" };
      fileCounts[f.file].count++;
      if ((sevRank[f.severity] || 0) > (sevRank[fileCounts[f.file].maxSev] || 0))
        fileCounts[f.file].maxSev = f.severity;
    })
  );
  const topFiles = Object.entries(fileCounts).sort(([, a], [, b]) => b.count - a.count).slice(0, 5);
  const totalFiles = Object.keys(fileCounts).length;

  return (
    <div className="card" style={{ padding: "22px 20px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <p style={{ fontWeight: 700, fontSize: 14, color: "#1a1a1a", marginBottom: 2 }}>Top At-Risk Files</p>
          <p style={{ fontSize: 11, color: "#a0a0a0" }}>Across all analyses</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: 26, fontWeight: 900, color: "#1a1a1a", letterSpacing: "-1px", lineHeight: 1 }}>{totalFiles}</p>
          <p style={{ fontSize: 10, color: "#a0a0a0", marginTop: 2 }}>files</p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {topFiles.length === 0 ? (
          <p style={{ color: "#bbb", fontSize: 12, textAlign: "center", padding: "24px 0" }}>No impact data yet</p>
        ) : topFiles.map(([file, { count, maxSev }], i) => {
          const dot = SEV_DOT[maxSev] || "#999";
          return (
            <div key={file} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: "rgba(0,0,0,0.03)", borderRadius: 10, border: "1px solid rgba(0,0,0,0.04)" }}>
              <span style={{ fontSize: 10, color: "#bbb", fontWeight: 700, width: 14, textAlign: "right", flexShrink: 0 }}>{i + 1}</span>
              <p style={{ flex: 1, fontSize: 11, fontFamily: "monospace", color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{file}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: dot }} />
                <span style={{ fontSize: 10, color: "#aaa", fontWeight: 700 }}>{count}×</span>
              </div>
            </div>
          );
        })}
      </div>

      {topFiles.length > 0 && (
        <p style={{ marginTop: 14, fontSize: 11, color: "#bbb", textAlign: "center", paddingTop: 12, borderTop: "1px solid rgba(0,0,0,0.05)" }}>
          {totalFiles} unique files impacted total
        </p>
      )}
    </div>
  );
}

/* ── PR list row ── */
function PRCard({ analysis, onClick }: { analysis: Analysis; onClick: () => void }) {
  const dot = SEV_DOT[analysis.severity] || "#999";
  return (
    <div onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", background: "#fff", borderRadius: 14, border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", cursor: "pointer", transition: "all 0.15s" }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 20px rgba(0,0,0,0.1)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 4px rgba(0,0,0,0.05)"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
    >
      <div style={{ width: 9, height: 9, borderRadius: "50%", background: dot, boxShadow: `0 0 6px ${dot}88`, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
          <span style={{ fontSize: 10, fontFamily: "monospace", color: "#999", background: "rgba(0,0,0,0.05)", padding: "1px 7px", borderRadius: 5 }}>
            {analysis.repo_name} #{analysis.pr_number}
          </span>
        </div>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#1a1a1a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {analysis.pr_title || "Untitled PR"}
        </p>
        <p style={{ fontSize: 11, color: "#aaa", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }}>
          {analysis.semantic_change?.summary || ""}
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
        <SeverityBadge severity={analysis.severity} />
        <span style={{ fontSize: 10, color: "#ccc" }}>{analysis.impact_count} impact{analysis.impact_count !== 1 ? "s" : ""}</span>
      </div>
    </div>
  );
}

/* ── PR detail modal ── */
function PRDetail({ analysis, onClose }: { analysis: Analysis; onClose: () => void }) {
  const high   = analysis.impacted_files.filter(f => f.severity === "HIGH");
  const medium = analysis.impacted_files.filter(f => f.severity === "MEDIUM");
  const low    = analysis.impacted_files.filter(f => f.severity === "LOW");
  const groups = [
    { label: "Will Break",   color: "#e53e3e", icon: "🔴", items: high   },
    { label: "May Degrade",  color: "#c49a30", icon: "🟡", items: medium },
    { label: "Minor Impact", color: "#38a169", icon: "🟢", items: low    },
  ].filter(g => g.items.length > 0);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(26,26,26,0.55)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div className="glass" style={{ maxWidth: 660, width: "100%", maxHeight: "88vh", overflowY: "auto", borderRadius: 22 }}>
        <div style={{ padding: "24px 28px", borderBottom: "1px solid rgba(0,0,0,0.07)", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontFamily: "monospace", color: "#999" }}>{analysis.repo_name} #{analysis.pr_number}</span>
              <SeverityBadge severity={analysis.severity} />
            </div>
            <h2 style={{ color: "#1a1a1a", fontWeight: 800, fontSize: 18, marginBottom: 6 }}>{analysis.pr_title}</h2>
            <p style={{ color: "#888", fontSize: 13 }}>{analysis.semantic_change?.summary}</p>
          </div>
          <button onClick={onClose} style={{ background: "rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.08)", color: "#888", borderRadius: 9, width: 32, height: 32, cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>✕</button>
        </div>

        <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 12, padding: "16px 18px" }}>
            <p style={{ color: "#aaa", fontSize: 10, fontWeight: 700, letterSpacing: "0.8px", textTransform: "uppercase", marginBottom: 8 }}>Changed Entity</p>
            <p style={{ color: "#1a1a1a", fontFamily: "monospace", fontSize: 14, fontWeight: 700, marginBottom: 4 }}>{analysis.semantic_change?.entity_name}</p>
            <p style={{ color: "#aaa", fontSize: 12 }}>{analysis.semantic_change?.change_type?.replace(/_/g, " ")}</p>
          </div>

          {analysis.impacted_files.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
              <p style={{ color: "#1a1a1a", fontWeight: 700, fontSize: 15, marginBottom: 4 }}>No blast radius detected</p>
              <p style={{ color: "#888", fontSize: 13 }}>Safe to merge.</p>
            </div>
          ) : (
            <div>
              <p style={{ color: "#888", fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
                Impact Breakdown — <span style={{ color: "#1a1a1a" }}>{analysis.impacted_files.length}</span> touchpoint{analysis.impacted_files.length !== 1 ? "s" : ""}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {groups.map(group => (
                  <div key={group.label}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                      <span>{group.icon}</span>
                      <span style={{ color: group.color, fontSize: 12, fontWeight: 700 }}>{group.label}</span>
                      <span style={{ color: "#bbb", fontSize: 11, background: "rgba(0,0,0,0.04)", borderRadius: 5, padding: "1px 7px", border: "1px solid rgba(0,0,0,0.07)" }}>{group.items.length}</span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {group.items.map((f, i) => (
                        <div key={i} style={{ background: "rgba(0,0,0,0.02)", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 10, padding: "12px 14px" }}>
                          <p style={{ color: "#1a1a1a", fontFamily: "monospace", fontSize: 12, marginBottom: 4 }}>
                            {f.file}<span style={{ color: "#ccc" }}>:{f.line}</span>
                          </p>
                          <p style={{ color: "#888", fontSize: 12 }}>{f.reason}</p>
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

/* ── Scan modal ── */
function ScanModal({ onClose, onScanStarted }: { onClose: () => void; onScanStarted: () => void }) {
  const [repo, setRepo] = useState("");
  const [limit, setLimit] = useState(5);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");

  function normalizeRepo(raw: string): string {
    let r = raw.trim().replace(/\/$/, "").replace(/\.git$/, "");
    for (const prefix of ["https://github.com/", "http://github.com/", "github.com/"]) {
      if (r.startsWith(prefix)) { r = r.slice(prefix.length); break; }
    }
    return r;
  }

  async function handleScan() {
    const normalized = normalizeRepo(repo);
    if (!normalized || !normalized.includes("/")) { setError("Enter a GitHub repo URL or owner/repo"); return; }
    setScanning(true); setError("");
    try {
      const res = await fetch(`${API}/api/scan`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_name: normalized, limit }),
      });
      if (!res.ok) throw new Error(await res.text());
      onScanStarted(); onClose();
    } catch (e: any) { setError(e.message || "Scan failed"); setScanning(false); }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(26,26,26,0.55)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div className="glass" style={{ maxWidth: 440, width: "100%", borderRadius: 22, padding: "30px 32px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, background: "#1c1c1e", borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>🔎</div>
            <h2 style={{ color: "#1a1a1a", fontWeight: 800, fontSize: 17 }}>Scan Existing Repo</h2>
          </div>
          <button onClick={onClose} style={{ background: "rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.08)", color: "#888", borderRadius: 9, width: 32, height: 32, cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        <p style={{ color: "#888", fontSize: 13, margin: "14px 0 24px", lineHeight: 1.7 }}>
          Retroactively scan a repo's commit and PR history for blast radius.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ color: "#aaa", fontSize: 10, fontWeight: 700, letterSpacing: "0.7px", textTransform: "uppercase" as const, display: "block", marginBottom: 8 }}>Repository</label>
            <input type="text" placeholder="owner/repo or full GitHub URL" value={repo} onChange={e => setRepo(e.target.value)} style={{ width: "100%", padding: "10px 14px" }} />
          </div>
          <div>
            <label style={{ color: "#aaa", fontSize: 10, fontWeight: 700, letterSpacing: "0.7px", textTransform: "uppercase" as const, display: "block", marginBottom: 8 }}>Scan depth</label>
            <select value={limit} onChange={e => setLimit(Number(e.target.value))} style={{ width: "100%", padding: "10px 14px" }}>
              <option value={5}>Last 5 commits / PRs</option>
              <option value={10}>Last 10 commits / PRs</option>
              <option value={20}>Last 20 commits / PRs</option>
            </select>
          </div>
          {error && <p style={{ color: "#e53e3e", fontSize: 12, padding: "9px 13px", background: "rgba(229,62,62,0.06)", borderRadius: 9, border: "1px solid rgba(229,62,62,0.15)" }}>{error}</p>}
          <button onClick={handleScan} disabled={scanning} className="btn-primary" style={{ width: "100%", padding: "13px", fontSize: 14 }}>
            {scanning ? "Starting scan…" : "Start Scan"}
          </button>
          <p style={{ color: "#ccc", fontSize: 11, textAlign: "center" }}>GitHub App must be installed on this repo first.</p>
        </div>
      </div>
    </div>
  );
}

/* ── Main page ── */
export default function Home() {
  const [analyses,     setAnalyses]     = useState<Analysis[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [selected,     setSelected]     = useState<Analysis | null>(null);
  const [filter,       setFilter]       = useState("ALL");
  const [selectedRepo, setSelectedRepo] = useState("ALL");
  const [showScan,     setShowScan]     = useState(false);
  const [scanBanner,   setScanBanner]   = useState(false);

  function fetchAnalyses() {
    fetch(`${API}/api/analyses`)
      .then(r => r.json())
      .then(data => { setAnalyses(data); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => {
    fetchAnalyses();
    const id = setInterval(fetchAnalyses, 5000);
    return () => clearInterval(id);
  }, []);

  // All unique repos across all analyses
  const repos = [...new Set(analyses.map(a => a.repo_name))];

  // Analyses scoped to the selected repo (or all)
  const repoAnalyses = selectedRepo === "ALL"
    ? analyses
    : analyses.filter(a => a.repo_name === selectedRepo);

  const filtered = filter === "ALL"
    ? repoAnalyses
    : repoAnalyses.filter(a => a.severity === filter);

  const high    = repoAnalyses.filter(a => a.severity === "HIGH").length;
  const medium  = repoAnalyses.filter(a => a.severity === "MEDIUM").length;
  const low     = repoAnalyses.filter(a => a.severity === "LOW").length;
  const impacts = repoAnalyses.reduce((s, a) => s + (a.impact_count || 0), 0);

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "36px 28px" }}>

      {/* Page header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontWeight: 900, fontSize: 28, color: "#1a1a1a", letterSpacing: "-0.8px", marginBottom: 4 }}>PR Analysis Feed</h1>
          <p style={{ color: "#a0a0a0", fontSize: 13 }}>Know what breaks before you merge.</p>
        </div>
        <button onClick={() => setShowScan(true)} style={{ display: "flex", alignItems: "center", gap: 8, background: "#1c1c1e", color: "#fff", border: "none", borderRadius: 12, padding: "11px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 10px rgba(0,0,0,0.18)", transition: "all 0.15s", flexShrink: 0 }}>
          🔎 Scan Repo
        </button>
      </div>

      {/* Repo tabs — only show when multiple repos exist */}
      {repos.length > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: "#aaa", fontWeight: 600, marginRight: 4 }}>Repo</span>
          {["ALL", ...repos].map(r => {
            const active = selectedRepo === r;
            const count  = r === "ALL" ? analyses.length : analyses.filter(a => a.repo_name === r).length;
            return (
              <button key={r} onClick={() => { setSelectedRepo(r); setFilter("ALL"); }} style={{
                display: "flex", alignItems: "center", gap: 6,
                fontSize: 12, fontWeight: active ? 700 : 500,
                padding: "6px 14px", borderRadius: 99, cursor: "pointer",
                border: "1px solid rgba(0,0,0,0.1)",
                background: active ? "#1c1c1e" : "rgba(0,0,0,0.04)",
                color: active ? "#fff" : "#777",
                transition: "all 0.15s",
                boxShadow: active ? "0 2px 8px rgba(0,0,0,0.18)" : "none",
              }}>
                {r === "ALL" ? "All Repos" : r.split("/")[1]}
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  background: active ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)",
                  color: active ? "#fff" : "#aaa",
                  padding: "1px 6px", borderRadius: 99,
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Stats strip */}
      <div style={{ background: "#fff", borderRadius: 18, border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 1px 8px rgba(0,0,0,0.06)", padding: "18px 24px", marginBottom: 22, display: "flex", alignItems: "center", gap: 28 }}>
        {/* Progress bars */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { label: "High Risk",   pct: repoAnalyses.length ? Math.round((high   / repoAnalyses.length) * 100) : 0, fill: "#1c1c1e" },
            { label: "Medium Risk", pct: repoAnalyses.length ? Math.round((medium / repoAnalyses.length) * 100) : 0, fill: "#e8b84b" },
            { label: "Safe",        pct: repoAnalyses.length ? Math.round((low    / repoAnalyses.length) * 100) : 0, fill: "#c8c3b8" },
          ].map(b => (
            <div key={b.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 11, color: "#aaa", fontWeight: 500, width: 72, flexShrink: 0 }}>{b.label}</span>
              <div style={{ flex: 1, height: 7, background: "rgba(0,0,0,0.06)", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${b.pct || 0}%`, background: b.fill, borderRadius: 99, minWidth: b.pct > 0 ? 4 : 0, transition: "width 0.6s ease" }} />
              </div>
              <span style={{ fontSize: 11, color: "#ccc", fontWeight: 600, width: 28, textAlign: "right" }}>{b.pct}%</span>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 56, background: "rgba(0,0,0,0.07)", flexShrink: 0 }} />

        {/* Big numbers */}
        {[
          { value: repoAnalyses.length, label: "Analyzed" },
          { value: impacts,             label: "Impacts"  },
          { value: high,                label: "Critical" },
        ].map(s => (
          <div key={s.label} style={{ textAlign: "center", flexShrink: 0, minWidth: 52 }}>
            <p style={{ fontSize: 30, fontWeight: 900, color: "#1a1a1a", letterSpacing: "-1.5px", lineHeight: 1 }}>{s.value}</p>
            <p style={{ fontSize: 10, color: "#aaa", fontWeight: 500, marginTop: 4 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Scan banner */}
      {scanBanner && (
        <div style={{ marginBottom: 20, background: "rgba(232,184,75,0.1)", border: "1px solid rgba(232,184,75,0.3)", borderRadius: 12, padding: "12px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ color: "#9a6f10", fontSize: 13, fontWeight: 500 }}>⚡ Scan started — results will appear below automatically.</span>
          <button onClick={() => setScanBanner(false)} style={{ background: "none", border: "none", color: "#ccc", cursor: "pointer", fontSize: 16, lineHeight: 1 }}>✕</button>
        </div>
      )}

      {/* Bento grid */}
      {repoAnalyses.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 28 }}>
          <FeaturedCard analyses={repoAnalyses} onOpen={setSelected} />
          <SeverityChart analyses={repoAnalyses} />
          <TopFilesCard analyses={repoAnalyses} />
        </div>
      )}

      {/* PR feed */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <p style={{ fontWeight: 700, fontSize: 15, color: "#1a1a1a" }}>All Analyses</p>
          <div style={{ display: "flex", gap: 5 }}>
            {[{ key: "ALL", label: "All" }, { key: "HIGH", label: "High" }, { key: "MEDIUM", label: "Medium" }, { key: "LOW", label: "Low" }].map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)} style={{ fontSize: 12, fontWeight: 600, padding: "6px 14px", borderRadius: 99, cursor: "pointer", transition: "all 0.15s", border: "1px solid rgba(0,0,0,0.1)", background: filter === f.key ? "#1c1c1e" : "rgba(0,0,0,0.04)", color: filter === f.key ? "#fff" : "#888" }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "#ccc" }}>
            <div style={{ fontSize: 28, marginBottom: 14 }}>⚙️</div>
            <p style={{ fontSize: 14 }}>Loading analyses…</p>
          </div>
        ) : analyses.length === 0 ? (
          /* Empty / install CTA */
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ maxWidth: 460, margin: "0 auto 28px", background: "#fff", border: "1px solid rgba(0,0,0,0.07)", borderRadius: 22, padding: "40px", boxShadow: "0 2px 16px rgba(0,0,0,0.07)" }}>
              <div style={{ fontSize: 44, marginBottom: 16 }}>💥</div>
              <h2 style={{ color: "#1a1a1a", fontWeight: 800, fontSize: 20, marginBottom: 8, letterSpacing: "-0.4px" }}>No analyses yet</h2>
              <p style={{ color: "#888", fontSize: 14, lineHeight: 1.7, marginBottom: 28 }}>
                Install the GitHub App on your repo. Every pull request gets automatically analyzed for blast radius — zero config.
              </p>
              <a href={GITHUB_APP_URL} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 9, background: "#1c1c1e", color: "#fff", fontSize: 14, fontWeight: 700, padding: "13px 26px", borderRadius: 12, textDecoration: "none", boxShadow: "0 4px 16px rgba(0,0,0,0.2)", marginBottom: 18 }}>
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.741 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/></svg>
                Install on GitHub — Free
              </a>
              <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "4px 0 18px" }}>
                <div style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.07)" }} />
                <span style={{ color: "#ccc", fontSize: 11 }}>or</span>
                <div style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.07)" }} />
              </div>
              <button onClick={() => setShowScan(true)} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(0,0,0,0.05)", border: "1px solid rgba(0,0,0,0.1)", color: "#888", fontSize: 13, fontWeight: 600, padding: "10px 20px", borderRadius: 10, cursor: "pointer" }}>
                🔎 Scan an existing repo
              </button>
            </div>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              {[{ step: "1", text: "Install the GitHub App" }, { step: "2", text: "Open any pull request" }, { step: "3", text: "See your blast radius" }].map(({ step, text }) => (
                <div key={step} style={{ display: "flex", alignItems: "center", gap: 8, color: "#bbb", fontSize: 12 }}>
                  <span style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#888" }}>{step}</span>
                  {text}
                  {step !== "3" && <span style={{ color: "rgba(0,0,0,0.18)", marginLeft: 4 }}>→</span>}
                </div>
              ))}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", color: "#bbb", fontSize: 13 }}>
            No {filter.toLowerCase()} severity PRs found.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map(a => <PRCard key={a.id} analysis={a} onClick={() => setSelected(a)} />)}
          </div>
        )}
      </div>

      {selected  && <PRDetail analysis={selected} onClose={() => setSelected(null)} />}
      {showScan  && <ScanModal onClose={() => setShowScan(false)} onScanStarted={() => setScanBanner(true)} />}
    </div>
  );
}
