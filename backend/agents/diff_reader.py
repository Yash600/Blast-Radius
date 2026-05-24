"""
Agent 1 — Diff Reader
Reads the raw PR diff and understands WHAT semantically changed.
"""
import os
import json
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage
from tools.github_tools import fetch_diff, read_repo_file, list_pr_files

SOUL = open(os.path.join(".gitagent", "agent1", "SOUL.md")).read()

def run(state: dict) -> dict:
    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        temperature=0,
        api_key=os.getenv("GROQ_API_KEY"),
    )

    repo_name  = state["repo_name"]
    diff_url   = state["diff_url"]
    pr_number  = state["pr_number"]

    # Step 1: Fetch the raw diff
    print(f"  [Agent 1] Fetching diff for PR #{pr_number}...")
    diff_content = fetch_diff.invoke({"diff_url": diff_url, "repo_name": repo_name})

    # Step 2: Fetch changed file list (only for real PRs, not commits)
    if pr_number > 0:
        changed_files = list_pr_files.invoke({"repo_name": repo_name, "pr_number": pr_number})
    else:
        # For commits, extract changed files from the diff itself
        changed_files = "\n".join(
            line[6:] for line in diff_content.splitlines()
            if line.startswith("+++ b/")
        ) or "See diff above"

    # Step 3: Ask LLM to understand the semantic change
    print(f"  [Agent 1] Analyzing semantic change...")
    messages = [
        SystemMessage(content=SOUL),
        HumanMessage(content=f"""
Analyze this pull request diff and identify what semantically changed.

Repository: {repo_name}
PR Title: {state.get('pr_title', 'N/A')}
Changed Files:
{changed_files}

Raw Diff:
{diff_content}

Respond with a JSON object ONLY (no markdown, no explanation) with this structure:
{{
  "change_type": "function_signature | api_response | db_schema | config | import | class_interface | other",
  "entity_name": "name of the changed function/class/endpoint/field",
  "file": "path/to/changed/file.py",
  "before": "what it was before (short description)",
  "after": "what it is now (short description)",
  "search_terms": ["term1", "term2"],
  "risk_level": "LOW | MEDIUM | HIGH",
  "summary": "one sentence plain English description of the change"
}}

search_terms should be the exact strings to grep for to find all places in the codebase
that use the changed thing (function name, field name, class name, endpoint path etc).
"""),
    ]

    response = llm.invoke(messages)
    raw      = response.content.strip()

    # Parse JSON from LLM response
    try:
        # Handle if LLM wraps in ```json ... ```
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        semantic_change = json.loads(raw.strip())
    except Exception as e:
        print(f"  [Agent 1] JSON parse error: {e} — using fallback")
        semantic_change = {
            "change_type": "other",
            "entity_name": "unknown",
            "file": "",
            "before": "",
            "after": "",
            "search_terms": [],
            "risk_level": "MEDIUM",
            "summary": raw[:200],
        }

    print(f"  [Agent 1] Done. Change: {semantic_change.get('summary', '')}")

    return {
        "diff_content":    diff_content,
        "semantic_change": semantic_change,
    }
