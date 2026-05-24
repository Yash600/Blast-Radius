import hmac
import hashlib
import json
import os
import requests
import asyncio
from fastapi import FastAPI, Request, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from database import init_db, save_analysis, get_all_analyses, get_analysis_by_pr

load_dotenv()

app = FastAPI(title="Blast Radius AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    init_db()
    print("Blast Radius AI is running.")

def verify_signature(body: bytes, signature: str):
    secret = os.getenv("GITHUB_WEBHOOK_SECRET", "").encode()
    expected = "sha256=" + hmac.new(secret, body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, signature):
        raise HTTPException(status_code=403, detail="Invalid webhook signature")

# ── Retroactive scanner — fetches recent PRs and runs them through pipeline ───

async def scan_recent_prs(repo_name: str, limit: int = 5):
    """
    Fetch the last N PRs from a repo and run blast radius on each.
    If no PRs exist (repo uses direct commits), fall back to scanning recent commits.
    """
    from pipeline import run_pipeline
    from tools.github_tools import _get_installation_token

    print(f"\n📦 Retroactive scan starting for {repo_name} (last {limit} items)...")

    try:
        token   = _get_installation_token(repo_name)
        headers = {
            "Authorization": f"token {token}",
            "Accept": "application/vnd.github+json",
        }

        # ── Try PRs first ──────────────────────────────────────────────────────
        url      = f"https://api.github.com/repos/{repo_name}/pulls"
        closed   = requests.get(url, headers=headers, params={"state": "closed", "sort": "updated", "direction": "desc", "per_page": limit}).json()
        opened   = requests.get(url, headers=headers, params={"state": "open",   "sort": "updated", "direction": "desc", "per_page": 5}).json()
        all_prs  = []
        if isinstance(closed, list): all_prs += closed
        if isinstance(opened, list): all_prs += opened
        all_prs  = all_prs[:limit]

        if all_prs:
            print(f"  Found {len(all_prs)} PRs — analyzing...")
            for pr in all_prs:
                pr_number = pr["number"]
                pr_title  = pr.get("title", "")
                pr_author = pr.get("user", {}).get("login", "unknown")
                pr_url    = pr.get("html_url", "")
                diff_url  = pr.get("diff_url", "")

                if get_analysis_by_pr(repo_name, pr_number):
                    print(f"  Skipping PR #{pr_number} — already analyzed")
                    continue

                print(f"  Analyzing PR #{pr_number}: {pr_title}")
                try:
                    await run_pipeline(
                        pr_number=pr_number,
                        repo_name=repo_name,
                        diff_url=diff_url,
                        pr_title=pr_title,
                        pr_author=pr_author,
                        pr_url=pr_url,
                    )
                    await asyncio.sleep(1)
                except Exception as e:
                    print(f"  ❌ Failed PR #{pr_number}: {e}")
                    continue

        else:
            # ── No PRs — fall back to recent commits ──────────────────────────
            print(f"  No PRs found — falling back to recent commits...")
            commits_url = f"https://api.github.com/repos/{repo_name}/commits"
            commits_resp = requests.get(commits_url, headers=headers, params={"per_page": limit})
            commits = commits_resp.json()

            if not isinstance(commits, list) or not commits:
                print(f"  ❌ No commits found either for {repo_name}")
                return

            print(f"  Found {len(commits)} commits — analyzing...")
            for idx, commit in enumerate(commits):
                sha          = commit["sha"]
                short_sha    = sha[:7]
                commit_msg   = commit.get("commit", {}).get("message", "").split("\n")[0]
                author       = commit.get("commit", {}).get("author", {}).get("name", "unknown")
                commit_url   = commit.get("html_url", "")

                # GitHub commit diff URL
                diff_url = f"https://github.com/{repo_name}/commit/{sha}.diff"

                # Use negative index as fake PR number to avoid collisions
                fake_pr_number = -(idx + 1)

                if get_analysis_by_pr(repo_name, fake_pr_number):
                    print(f"  Skipping commit {short_sha} — already analyzed")
                    continue

                print(f"  Analyzing commit {short_sha}: {commit_msg[:60]}")
                try:
                    await run_pipeline(
                        pr_number=fake_pr_number,
                        repo_name=repo_name,
                        diff_url=diff_url,
                        pr_title=f"[Commit] {commit_msg[:80]}",
                        pr_author=author,
                        pr_url=commit_url,
                    )
                    await asyncio.sleep(1)
                except Exception as e:
                    print(f"  ❌ Failed commit {short_sha}: {e}")
                    continue

        print(f"✅ Retroactive scan complete for {repo_name}")

    except Exception as e:
        print(f"❌ Retroactive scan failed for {repo_name}: {e}")

# ── Webhook handler ────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {"status": "Blast Radius AI is live"}

@app.post("/webhook")
async def handle_webhook(request: Request, background_tasks: BackgroundTasks):
    body      = await request.body()
    signature = request.headers.get("X-Hub-Signature-256", "")
    verify_signature(body, signature)

    payload = json.loads(body)
    action  = payload.get("action")
    event   = request.headers.get("X-GitHub-Event", "")

    # ── App installed on a repo → retroactive scan ────────────────────────────
    if event == "installation" and action in ["created"]:
        repos = payload.get("repositories", [])
        for repo in repos:
            repo_name = repo["full_name"]
            print(f"\n🎉 App installed on {repo_name} — starting retroactive scan")
            background_tasks.add_task(scan_recent_prs, repo_name, 10)
        return {"status": "installation_received", "repos": [r["full_name"] for r in repos]}

    # ── PR opened or updated → real-time analysis ─────────────────────────────
    if action not in ["opened", "synchronize"]:
        return {"status": "ignored", "action": action}

    pr        = payload["pull_request"]
    pr_number = pr["number"]
    repo_name = payload["repository"]["full_name"]
    diff_url  = pr["diff_url"]
    pr_title  = pr["title"]
    pr_author = pr["user"]["login"]
    pr_url    = pr["html_url"]

    print(f"\n🔍 PR #{pr_number} '{pr_title}' on {repo_name} — starting analysis")

    from pipeline import run_pipeline
    background_tasks.add_task(
        run_pipeline,
        pr_number=pr_number,
        repo_name=repo_name,
        diff_url=diff_url,
        pr_title=pr_title,
        pr_author=pr_author,
        pr_url=pr_url,
    )

    return {"status": "processing", "pr": pr_number, "repo": repo_name}

# ── REST endpoints for the Next.js dashboard ──────────────────────────────────

@app.get("/api/analyses")
async def list_analyses():
    return get_all_analyses()

@app.get("/api/analyses/{repo_owner}/{repo_name}/{pr_number}")
async def get_analysis(repo_owner: str, repo_name: str, pr_number: int):
    full_repo = f"{repo_owner}/{repo_name}"
    result    = get_analysis_by_pr(full_repo, pr_number)
    if not result:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return result

@app.get("/api/risk-map/{repo_owner}/{repo_name}")
async def risk_map(repo_owner: str, repo_name: str):
    full_repo = f"{repo_owner}/{repo_name}"
    analyses  = get_all_analyses(repo_filter=full_repo)
    file_risk: dict = {}
    for analysis in analyses:
        for impact in analysis.get("impacted_files", []):
            f     = impact.get("file", "")
            s     = impact.get("severity", "LOW")
            score = {"HIGH": 3, "MEDIUM": 2, "LOW": 1}.get(s, 1)
            file_risk[f] = file_risk.get(f, 0) + score
    sorted_risk = sorted(file_risk.items(), key=lambda x: x[1], reverse=True)
    return [{"file": f, "risk_score": s} for f, s in sorted_risk]

@app.get("/api/memory/{repo_owner}/{repo_name}")
async def get_memory(repo_owner: str, repo_name: str):
    full_repo  = f"{repo_owner}/{repo_name}"
    memory_dir = os.path.join(".gitagent", "memory", full_repo.replace("/", "_"))
    entries    = []
    if os.path.exists(memory_dir):
        for fname in sorted(os.listdir(memory_dir)):
            fpath = os.path.join(memory_dir, fname)
            with open(fpath) as f:
                entries.append({"file": fname, "content": f.read()})
    return entries

# ── Manual scan endpoint ───────────────────────────────────────────────────────

def normalize_repo_name(raw: str) -> str:
    """
    Accept any of these formats and return 'owner/repo':
      - Yash600/my-repo
      - https://github.com/Yash600/my-repo
      - https://github.com/Yash600/my-repo.git
      - github.com/Yash600/my-repo
    """
    raw = raw.strip().rstrip("/")
    # strip .git suffix
    if raw.endswith(".git"):
        raw = raw[:-4]
    # strip URL prefix
    for prefix in ["https://github.com/", "http://github.com/", "github.com/"]:
        if raw.startswith(prefix):
            raw = raw[len(prefix):]
            break
    return raw

class ScanRequest(BaseModel):
    repo_name: str
    limit: int = 5

@app.post("/api/scan")
async def manual_scan(body: ScanRequest, background_tasks: BackgroundTasks):
    """
    Manually trigger a retroactive scan on any installed repo.
    Called from the dashboard 'Scan Repo' button.
    """
    repo_name = normalize_repo_name(body.repo_name)
    if "/" not in repo_name or len(repo_name.split("/")) != 2:
        raise HTTPException(status_code=400, detail="Could not parse repo name. Use owner/repo format.")

    print(f"\n🔎 Manual scan requested for {repo_name}")
    background_tasks.add_task(scan_recent_prs, repo_name, body.limit)

    return {"status": "scanning", "repo": repo_name, "limit": body.limit}
