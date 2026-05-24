import os
import subprocess
from datetime import datetime
from langchain_core.tools import tool

MEMORY_BASE = os.path.join(".gitagent", "memory")

def _repo_memory_dir(repo_name: str) -> str:
    safe = repo_name.replace("/", "_")
    path = os.path.join(MEMORY_BASE, safe)
    os.makedirs(path, exist_ok=True)
    return path

@tool
def read_memory(repo_name: str) -> str:
    """
    Read everything the agent has learned about this repo so far.
    Returns all memory files concatenated.
    """
    memory_dir = _repo_memory_dir(repo_name)
    files      = sorted(os.listdir(memory_dir))
    if not files:
        return "No memory yet for this repo. This is the first analysis."

    parts = []
    for fname in files:
        fpath = os.path.join(memory_dir, fname)
        with open(fpath) as f:
            parts.append(f"### {fname}\n{f.read()}")
    return "\n\n".join(parts)

@tool
def update_memory(repo_name: str, key: str, content: str) -> str:
    """
    Save something the agent learned about this repo.
    key: short filename like 'high_risk_functions' or 'fragile_areas'
    content: the markdown text to store
    """
    memory_dir = _repo_memory_dir(repo_name)
    filename   = f"{key}.md"
    fpath      = os.path.join(memory_dir, filename)

    timestamp  = datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
    entry      = f"\n\n<!-- updated: {timestamp} -->\n{content}"

    # append so history is preserved
    with open(fpath, "a") as f:
        f.write(entry)

    # commit to git so memory is fully versioned
    try:
        subprocess.run(["git", "add", fpath],        capture_output=True)
        subprocess.run(
            ["git", "commit", "-m", f"agent memory: {repo_name}/{key}"],
            capture_output=True,
        )
    except Exception:
        pass  # git not available in all envs — memory file still saved

    return f"Memory updated: {key} for {repo_name}"

@tool
def append_past_findings(repo_name: str, pr_number: int, summary: str) -> str:
    """
    Append a short summary of this PR's findings to the running findings log.
    """
    memory_dir = _repo_memory_dir(repo_name)
    fpath      = os.path.join(memory_dir, "past_findings.md")
    timestamp  = datetime.utcnow().strftime("%Y-%m-%d")

    with open(fpath, "a") as f:
        f.write(f"\n\n## PR #{pr_number} — {timestamp}\n{summary}")

    try:
        subprocess.run(["git", "add", fpath], capture_output=True)
        subprocess.run(
            ["git", "commit", "-m", f"agent log: PR #{pr_number} findings for {repo_name}"],
            capture_output=True,
        )
    except Exception:
        pass

    return f"Findings logged for PR #{pr_number}"
