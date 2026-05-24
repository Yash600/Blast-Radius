"""
Agent 3 — Reporter
Writes the blast radius report, posts it on the PR, and updates agent memory.
"""
import os
import json
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage
from tools.github_tools import post_pr_comment
from tools.memory_tools import update_memory, append_past_findings

SOUL = open(os.path.join(".gitagent", "agent3", "SOUL.md")).read()

def _severity_emoji(severity: str) -> str:
    return {"HIGH": "🔴", "MEDIUM": "🟡", "LOW": "🟢"}.get(severity, "⚪")

def _overall_severity(impacted_files: list) -> str:
    severities = [f.get("severity", "LOW") for f in impacted_files]
    if "HIGH"   in severities: return "HIGH"
    if "MEDIUM" in severities: return "MEDIUM"
    return "LOW"

def _build_report(state: dict) -> str:
    semantic_change = state.get("semantic_change", {})
    impacted_files  = state.get("impacted_files",  [])
    overall         = _overall_severity(impacted_files)
    emoji           = _severity_emoji(overall)

    lines = [
        f"## {emoji} Blast Radius Report",
        f"",
        f"**Change detected:** `{semantic_change.get('entity_name', 'unknown')}` in `{semantic_change.get('file', 'unknown')}`",
        f"**Summary:** {semantic_change.get('summary', '')}",
        f"",
    ]

    if not impacted_files:
        lines += [
            "### ✅ No blast radius detected",
            "",
            "No other files in the codebase appear to be impacted by this change.",
            "Safe to merge (from a dependency perspective).",
        ]
    else:
        high   = [f for f in impacted_files if f.get("severity") == "HIGH"]
        medium = [f for f in impacted_files if f.get("severity") == "MEDIUM"]
        low    = [f for f in impacted_files if f.get("severity") == "LOW"]

        lines += [
            f"### Impact Summary: **{len(impacted_files)} touchpoint(s) found**",
            "",
        ]

        if high:
            lines.append(f"#### 🔴 HIGH Severity ({len(high)} files — will break)")
            for f in high:
                lines.append(f"- **`{f.get('file')}:{f.get('line', '?')}`** — {f.get('reason', '')}")
                if f.get("code_snippet"):
                    lines.append(f"  ```\n  {f['code_snippet']}\n  ```")
            lines.append("")

        if medium:
            lines.append(f"#### 🟡 MEDIUM Severity ({len(medium)} files — may behave unexpectedly)")
            for f in medium:
                lines.append(f"- **`{f.get('file')}:{f.get('line', '?')}`** — {f.get('reason', '')}")
            lines.append("")

        if low:
            lines.append(f"#### 🟢 LOW Severity ({len(low)} files — minor impact)")
            for f in low:
                lines.append(f"- `{f.get('file')}:{f.get('line', '?')}` — {f.get('reason', '')}")
            lines.append("")

        lines += [
            "---",
            "> ⚡ Fix all HIGH severity touchpoints before merging.",
            f"> 🤖 *Powered by Blast Radius AI — analysis based on semantic diff, not just string matching.*",
        ]

    return "\n".join(lines)

def run(state: dict) -> dict:
    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        temperature=0,
        api_key=os.getenv("GROQ_API_KEY"),
    )

    repo_name       = state["repo_name"]
    pr_number       = state["pr_number"]
    semantic_change = state.get("semantic_change", {})
    impacted_files  = state.get("impacted_files",  [])

    print(f"  [Agent 3] Building report for PR #{pr_number}...")

    # Build the markdown report
    report = _build_report(state)

    # Post on GitHub PR
    print(f"  [Agent 3] Posting comment on PR #{pr_number}...")
    post_pr_comment.invoke({
        "repo_name": repo_name,
        "pr_number": pr_number,
        "comment":   report,
    })

    # Update memory — remember high risk areas
    if impacted_files:
        high_risk = [f for f in impacted_files if f.get("severity") == "HIGH"]
        if high_risk:
            memory_content = f"### {semantic_change.get('entity_name', 'unknown')} (PR #{pr_number})\n"
            memory_content += f"Change: {semantic_change.get('summary', '')}\n"
            memory_content += "High-risk consumers:\n"
            for f in high_risk:
                memory_content += f"- {f.get('file')}:{f.get('line')} — {f.get('reason')}\n"

            update_memory.invoke({
                "repo_name": repo_name,
                "key":       "high_risk_functions",
                "content":   memory_content,
            })

    # Append to past findings log
    summary = (
        f"Changed `{semantic_change.get('entity_name')}`, "
        f"found {len(impacted_files)} impact(s), "
        f"severity: {_overall_severity(impacted_files)}"
    )
    append_past_findings.invoke({
        "repo_name": repo_name,
        "pr_number": pr_number,
        "summary":   summary,
    })

    print(f"  [Agent 3] Done. Report posted and memory updated.")

    return {"report": report}
