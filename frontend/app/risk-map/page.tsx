"use client";
import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
type RiskEntry = { file: string; risk_score: number };

function riskMeta(ratio: number) {
  if (ratio > 0.66) return { color: "#e11d48", bar: "linear-gradient(90deg,#e11d48,#fb7185)", glow: "rgba(225,29,72,0.25)",  label: "HIGH",   bg: "rgba(225,29,72,0.07)",  border: "rgba(225,29,72,0.2)"  };
  if (ratio > 0.33) return { color: "#d97706", bar: "linear-gradient(90deg,#d97706,#fbbf24)", glow: "rgba(217,119,6,0.25)",  label: "MEDIUM", bg: "rgba(217,119,6,0.07)",  border: "rgba(217,119,6,0.2)"  };
  return               { color: "#059669", bar: "linear-gradient(90deg,#059669,#34d399)", glow: "rgba(5,150,105,0.22)",  label: "LOW",    bg: "rgba(5,150,105,0.07)",  border: "rgba(5,150,105,0.2)"  };
}

export default function RiskMap() {
  const [data,    setData]    = useState<RiskEntry[]>([]);
  const [repo,    setRepo]    = useState("");
  const [loading, setLoading] = useState(false);
  const [repos,   setRepos]   = useState<string[]>([]);

  useEffect(() => {
    fetch(`${API}/api/analyses`)
      .then(r => r.json())
      .then((analyses: any[]) => {
        const unique = [...new Set(analyses.map((a: any) => a.repo_name))] as string[];
        setRepos(unique);
        if (unique.length > 0) setRepo(unique[0]);
      });
  }, []);

  useEffect(() => {
    if (!repo) return;
    setLoading(true);
    const [owner, name] = repo.split("/");
    fetch(`${API}/api/risk-map/${owner}/${name}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [repo]);

  const max = data[0]?.risk_score || 1;
  const highCount   = data.filter(e => e.risk_score / max > 0.66).length;
  const mediumCount = data.filter(e => { const r = e.risk_score / max; return r > 0.33 && r <= 0.66; }).length;
  const lowCount    = data.filter(e => e.risk_score / max <= 0.33).length;

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 36, gap: 20, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontWeight: 800, fontSize: 26, letterSpacing: "-0.6px", marginBottom: 6 }} className="gradient-text">Codebase Risk Map</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>Files ranked by cumulative blast radius score across all analyzed PRs.</p>
        </div>
        <select value={repo} onChange={e => setRepo(e.target.value)} style={{ padding: "9px 14px", fontSize: 13, borderRadius: 10, minWidth: 190 }}>
          {repos.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {data.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 28 }}>
          {[
            { label: "High Risk Files",   value: highCount,   cls: "danger", color: "#e11d48" },
            { label: "Medium Risk Files", value: mediumCount, cls: "medium", color: "#d97706" },
            { label: "Low Risk Files",    value: lowCount,    cls: "safe",   color: "#059669" },
          ].map(s => (
            <div key={s.label} className={`stat-card ${s.cls}`} style={{ position: "relative" }}>
              <p style={{ color: s.color, fontSize: 28, fontWeight: 800, marginBottom: 4, letterSpacing: "-0.5px", position: "relative", zIndex: 1 }}>{s.value}</p>
              <p style={{ color: "var(--text-secondary)", fontSize: 11, fontWeight: 500, position: "relative", zIndex: 1 }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-muted)" }}>
          <div style={{ fontSize: 30, marginBottom: 14 }}>🗺️</div>
          <p style={{ fontSize: 14 }}>Building risk map…</p>
        </div>
      ) : data.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <div style={{ fontSize: 44, marginBottom: 16 }}>🗺️</div>
          <p style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 16, marginBottom: 6 }}>No risk data yet.</p>
          <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>Risk data accumulates as PRs are analyzed for this repo.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {data.map((entry, i) => {
            const ratio = entry.risk_score / max;
            const meta  = riskMeta(ratio);
            const pct   = Math.round(ratio * 100);
            return (
              <div key={entry.file} className="card fade-up" style={{ padding: "18px 20px", borderLeft: `3px solid ${meta.color}` }}>
                <div style={{ position: "absolute", inset: 0, borderRadius: 16, background: `linear-gradient(90deg, ${meta.bg} 0%, transparent 45%)`, pointerEvents: "none" }} />
                <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, flexShrink: 0, background: i < 3 ? meta.bg : "rgba(0,0,0,0.03)", border: `1px solid ${i < 3 ? meta.border : "rgba(124,58,237,0.1)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: i < 3 ? meta.color : "var(--text-muted)" }}>
                      {i + 1}
                    </div>
                    <span style={{ color: "var(--text-primary)", fontFamily: "monospace", fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.file}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20, background: meta.bg, color: meta.color, border: `1px solid ${meta.border}` }}>{meta.label}</span>
                    <span style={{ color: meta.color, fontWeight: 800, fontSize: 14, minWidth: 24, textAlign: "right" }}>{entry.risk_score}</span>
                  </div>
                </div>
                <div style={{ position: "relative", height: 5, background: "rgba(0,0,0,0.07)", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, borderRadius: 4, background: meta.bar, boxShadow: `0 0 8px ${meta.glow}`, transition: "width 0.7s cubic-bezier(0.4,0,0.2,1)" }} />
                </div>
                <p style={{ color: "var(--text-muted)", fontSize: 10, marginTop: 6, textAlign: "right" }}>{pct}% of maximum risk</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
