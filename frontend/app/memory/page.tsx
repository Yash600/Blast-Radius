"use client";
import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
type MemoryEntry = { file: string; content: string };

const FILE_META: Record<string, { icon: string; label: string; color: string; bg: string; border: string }> = {
  "high_risk_functions.md": { icon: "⚡", label: "High Risk Functions", color: "#e11d48", bg: "rgba(225,29,72,0.07)",  border: "rgba(225,29,72,0.2)"  },
  "fragile_areas.md":       { icon: "🧨", label: "Fragile Areas",        color: "#d97706", bg: "rgba(217,119,6,0.07)",  border: "rgba(217,119,6,0.2)"  },
  "past_findings.md":       { icon: "📋", label: "Past Findings Log",    color: "#7c3aed", bg: "rgba(124,58,237,0.07)", border: "rgba(124,58,237,0.2)" },
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

  return (
    <div style={{ maxWidth: 780, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 36, gap: 20, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontWeight: 800, fontSize: 26, letterSpacing: "-0.6px", marginBottom: 6 }} className="gradient-text">Agent Memory</h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>Everything the agent has learned about this codebase — grows with every PR.</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <select value={repo} onChange={e => setRepo(e.target.value)} style={{ padding: "9px 14px", fontSize: 13, borderRadius: 10 }}>
            {repos.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          {entries.length > 0 && (
            <span style={{ fontSize: 11, color: "var(--text-muted)", background: "rgba(124,58,237,0.07)", border: "1px solid rgba(124,58,237,0.18)", borderRadius: 8, padding: "5px 11px", fontWeight: 600 }}>
              {entries.length} file{entries.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-muted)" }}>
          <div style={{ fontSize: 30, marginBottom: 14 }}>🧠</div>
          <p style={{ fontSize: 14 }}>Loading memory…</p>
        </div>
      ) : entries.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 0" }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🧠</div>
          <p style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 16, marginBottom: 6 }}>No memory yet.</p>
          <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>Memory builds up as PRs are analyzed for this repo.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {entries.map(entry => {
            const meta   = FILE_META[entry.file];
            const isOpen = open === entry.file;
            const words  = wordCount(entry.content);
            return (
              <div key={entry.file} className="card fade-up" style={{ overflow: "hidden", cursor: "pointer", borderLeft: `3px solid ${meta?.color || "rgba(124,58,237,0.4)"}` }}
                onClick={() => setOpen(isOpen ? null : entry.file)}>
                {meta && <div style={{ position: "absolute", inset: 0, borderRadius: 16, background: `linear-gradient(90deg, ${meta.bg} 0%, transparent 45%)`, pointerEvents: "none" }} />}

                <div style={{ padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, position: "relative" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
                    {meta && (
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: meta.bg, border: `1px solid ${meta.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>
                        {meta.icon}
                      </div>
                    )}
                    <div style={{ minWidth: 0 }}>
                      <p style={{ color: "var(--text-primary)", fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{meta?.label || entry.file}</p>
                      <p style={{ color: "var(--text-muted)", fontFamily: "monospace", fontSize: 10 }}>{entry.file}</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{words} words</span>
                    <div style={{ color: "var(--text-muted)", fontSize: 13, transition: "transform 0.2s", transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>▾</div>
                  </div>
                </div>

                {isOpen && (
                  <div style={{ borderTop: "1px solid rgba(124,58,237,0.1)", background: "rgba(0,0,0,0.02)" }}>
                    <pre style={{ color: "var(--text-secondary)", fontSize: 12, fontFamily: "monospace", whiteSpace: "pre-wrap", lineHeight: 1.75, padding: "18px 24px", margin: 0, overflowX: "auto" }}>
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
        <div style={{ marginTop: 28, padding: "14px 18px", background: "rgba(124,58,237,0.05)", border: "1px solid rgba(124,58,237,0.15)", borderRadius: 13, display: "flex", alignItems: "flex-start", gap: 13 }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>ℹ️</span>
          <p style={{ color: "var(--text-secondary)", fontSize: 12, lineHeight: 1.6 }}>
            Agent memory is committed to <code style={{ color: "#7c3aed", background: "rgba(124,58,237,0.08)", padding: "1px 6px", borderRadius: 4 }}>.gitagent/memory/</code> in your repo after each PR analysis — giving you a full audit trail via git history.
          </p>
        </div>
      )}
    </div>
  );
}
