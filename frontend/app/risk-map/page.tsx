"use client";
import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
type RiskEntry = { file: string; risk_score: number };

function riskMeta(ratio: number) {
  if (ratio > 0.66) return { color: "#e53e3e", fill: "#1c1c1e",  label: "HIGH",   bg: "rgba(229,62,62,0.07)",   border: "rgba(229,62,62,0.18)"  };
  if (ratio > 0.33) return { color: "#c49a30", fill: "#e8b84b",  label: "MEDIUM", bg: "rgba(196,154,48,0.09)",  border: "rgba(196,154,48,0.22)" };
  return               { color: "#38a169", fill: "#c8c3b8",  label: "LOW",    bg: "rgba(56,161,105,0.07)",  border: "rgba(56,161,105,0.18)" };
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

  const max          = data[0]?.risk_score || 1;
  const highCount    = data.filter(e => e.risk_score / max > 0.66).length;
  const mediumCount  = data.filter(e => { const r = e.risk_score / max; return r > 0.33 && r <= 0.66; }).length;
  const lowCount     = data.filter(e => e.risk_score / max <= 0.33).length;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "36px 28px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, gap: 20, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontWeight: 900, fontSize: 28, color: "#1a1a1a", letterSpacing: "-0.8px", marginBottom: 4 }}>Codebase Risk Map</h1>
          <p style={{ color: "#a0a0a0", fontSize: 13 }}>Files ranked by cumulative blast radius score across all analyzed PRs.</p>
        </div>
        <select value={repo} onChange={e => setRepo(e.target.value)} style={{ padding: "9px 14px", fontSize: 13, borderRadius: 99, minWidth: 190, cursor: "pointer" }}>
          {repos.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      {/* Stat strip */}
      {data.length > 0 && (
        <div style={{ background: "#fff", borderRadius: 18, border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 1px 8px rgba(0,0,0,0.06)", padding: "18px 24px", marginBottom: 22, display: "flex", alignItems: "center", gap: 28 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { label: "High Risk",   count: highCount,   pct: Math.round((highCount   / data.length) * 100), fill: "#1c1c1e" },
              { label: "Medium Risk", count: mediumCount, pct: Math.round((mediumCount / data.length) * 100), fill: "#e8b84b" },
              { label: "Low Risk",    count: lowCount,    pct: Math.round((lowCount    / data.length) * 100), fill: "#c8c3b8" },
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
          <div style={{ width: 1, height: 56, background: "rgba(0,0,0,0.07)", flexShrink: 0 }} />
          {[
            { value: highCount,   label: "High"   },
            { value: mediumCount, label: "Medium" },
            { value: lowCount,    label: "Safe"   },
          ].map(s => (
            <div key={s.label} style={{ textAlign: "center", flexShrink: 0, minWidth: 44 }}>
              <p style={{ fontSize: 28, fontWeight: 900, color: "#1a1a1a", letterSpacing: "-1px", lineHeight: 1 }}>{s.value}</p>
              <p style={{ fontSize: 10, color: "#aaa", fontWeight: 500, marginTop: 4 }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "80px 0", color: "#ccc" }}>
          <div style={{ fontSize: 30, marginBottom: 14 }}>🗺️</div>
          <p style={{ fontSize: 14 }}>Building risk map…</p>
        </div>
      ) : data.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🗺️</div>
          <p style={{ color: "#1a1a1a", fontWeight: 700, fontSize: 16, marginBottom: 6 }}>No risk data yet.</p>
          <p style={{ color: "#aaa", fontSize: 13 }}>Risk data accumulates as PRs are analyzed for this repo.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {data.map((entry, i) => {
            const ratio = entry.risk_score / max;
            const meta  = riskMeta(ratio);
            const pct   = Math.round(ratio * 100);
            const isTop = i < 3;
            return (
              <div key={entry.file} className="fade-up" style={{ background: "#fff", borderRadius: 14, border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", padding: "16px 18px", transition: "all 0.15s" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 4px rgba(0,0,0,0.05)"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, background: isTop ? meta.bg : "rgba(0,0,0,0.04)", border: `1px solid ${isTop ? meta.border : "rgba(0,0,0,0.08)"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: isTop ? meta.color : "#aaa" }}>
                      {i + 1}
                    </div>
                    <span style={{ color: "#1a1a1a", fontFamily: "monospace", fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.file}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: meta.bg, color: meta.color, border: `1px solid ${meta.border}`, letterSpacing: "0.4px" }}>{meta.label}</span>
                    <span style={{ color: "#1a1a1a", fontWeight: 800, fontSize: 14 }}>{entry.risk_score}</span>
                  </div>
                </div>
                <div style={{ height: 6, background: "rgba(0,0,0,0.06)", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${pct}%`, borderRadius: 99, background: meta.fill, transition: "width 0.7s cubic-bezier(0.4,0,0.2,1)" }} />
                </div>
                <p style={{ color: "#ccc", fontSize: 10, marginTop: 5, textAlign: "right" }}>{pct}% of maximum risk</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
