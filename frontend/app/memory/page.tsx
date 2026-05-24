"use client";
import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
type MemoryEntry = { file: string; content: string };

const FILE_META: Record<string, { icon: string; label: string; color: string; bg: string; border: string }> = {
  "high_risk_functions.md": { icon: "⚡", label: "High Risk Functions", color: "#e53e3e", bg: "rgba(229,62,62,0.08)",  border: "rgba(229,62,62,0.18)"  },
  "fragile_areas.md":       { icon: "🧨", label: "Fragile Areas",        color: "#c49a30", bg: "rgba(196,154,48,0.1)", border: "rgba(196,154,48,0.22)" },
  "past_findings.md":       { icon: "📋", label: "Past Findings Log",    color: "#1a1a1a", bg: "rgba(0,0,0,0.05)",    border: "rgba(0,0,0,0.12)"      },
};

export default function MemoryPage() {
  const [entries, setEntries] = useState<MemoryEntry[]>([]);
  const [repo,    setRepo]    = useState("");
  const [repos,   setRepos]   = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [open,    setOpen]    = useState<string | null>(null);

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
    fetch(`${API}/api/memory/${owner}/${name}`)
      .then(r => r.json())
      .then(d => { setEntries(d); setOpen(d[0]?.file ?? null); setLoading(false); })
      .catch(() => setLoading(false));
  }, [repo]);

  const wordCount = (c: string) => c.trim() ? c.trim().split(/\s+/).length : 0;
  const totalWords = entries.reduce((s, e) => s + wordCount(e.content), 0);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "36px 28px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, gap: 20, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontWeight: 900, fontSize: 28, color: "#1a1a1a", letterSpacing: "-0.8px", marginBottom: 4 }}>Agent Memory</h1>
          <p style={{ color: "#a0a0a0", fontSize: 13 }}>Everything the agent has learned — committed to git after every PR.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {entries.length > 0 && (
            <span style={{ fontSize: 11, color: "#888", background: "rgba(0,0,0,0.06)", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 99, padding: "5px 12px", fontWeight: 600 }}>
              {totalWords} words learned
            </span>
          )}
          <select value={repo} onChange={e => setRepo(e.target.value)} style={{ padding: "9px 14px", fontSize: 13, borderRadius: 99, cursor: "pointer" }}>
            {repos.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
      </div>

      {/* Memory file cards */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "80px 0", color: "#ccc" }}>
          <div style={{ fontSize: 30, marginBottom: 14 }}>🧠</div>
          <p style={{ fontSize: 14 }}>Loading memory…</p>
        </div>
      ) : entries.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🧠</div>
          <p style={{ color: "#1a1a1a", fontWeight: 700, fontSize: 16, marginBottom: 6 }}>No memory yet.</p>
          <p style={{ color: "#aaa", fontSize: 13 }}>Memory builds up as PRs are analyzed for this repo.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {entries.map(entry => {
            const meta   = FILE_META[entry.file];
            const isOpen = open === entry.file;
            const words  = wordCount(entry.content);
            return (
              <div key={entry.file} className="fade-up" style={{ background: "#fff", borderRadius: 16, border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", overflow: "hidden", cursor: "pointer", transition: "box-shadow 0.15s" }}
                onMouseEnter={e => { if (!isOpen) (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 4px rgba(0,0,0,0.05)"; }}
                onClick={() => setOpen(isOpen ? null : entry.file)}
              >
                <div style={{ padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
                    {meta && (
                      <div style={{ width: 38, height: 38, borderRadius: 11, background: meta.bg, border: `1px solid ${meta.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                        {meta.icon}
                      </div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <p style={{ color: "#1a1a1a", fontWeight: 700, fontSize: 14, marginBottom: 3 }}>{meta?.label || entry.file}</p>
                      <p style={{ color: "#bbb", fontFamily: "monospace", fontSize: 10 }}>{entry.file}</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontSize: 16, fontWeight: 800, color: meta?.color || "#1a1a1a", letterSpacing: "-0.5px" }}>{words}</p>
                      <p style={{ fontSize: 10, color: "#bbb", marginTop: 1 }}>words</p>
                    </div>
                    <div style={{ color: "#ccc", fontSize: 14, transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▾</div>
                  </div>
                </div>

                {isOpen && (
                  <div style={{ borderTop: "1px solid rgba(0,0,0,0.06)", background: "rgba(0,0,0,0.015)" }}>
                    <pre style={{ color: "#555", fontSize: 12, fontFamily: "monospace", whiteSpace: "pre-wrap", lineHeight: 1.8, padding: "18px 22px", margin: 0, overflowX: "auto" }}>
                      {entry.content.trim() || "— empty —"}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {entries.length > 0 && (
        <div style={{ marginTop: 28, padding: "14px 18px", background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.08)", borderRadius: 13, display: "flex", alignItems: "flex-start", gap: 12 }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>ℹ️</span>
          <p style={{ color: "#888", fontSize: 12, lineHeight: 1.6 }}>
            Agent memory is committed to{" "}
            <code style={{ color: "#1a1a1a", background: "rgba(0,0,0,0.06)", padding: "1px 6px", borderRadius: 4, fontFamily: "monospace" }}>.gitagent/memory/</code>
            {" "}in your repo after each PR analysis — giving a full audit trail via git history.
          </p>
        </div>
      )}
    </div>
  );
}
