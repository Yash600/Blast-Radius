import os
import time
import jwt
import requests
from langchain_core.tools import tool

GITHUB_API = "https://api.github.com"

def _get_jwt() -> str:
    """Generate a JWT for GitHub App authentication."""
    app_id = os.getenv("GITHUB_APP_ID")

    # Support both a raw key string (cloud) and a file path (local dev)
    private_key = os.getenv("GITHUB_PRIVATE_KEY", "")
    if not private_key:
        key_path    = os.getenv("GITHUB_PRIVATE_KEY_PATH", "")
        private_key = open(key_path).read()

    # Railway / cloud envs often store the key with literal \n — fix that
    private_key = private_key.replace("\\n", "\n")

    now     = int(time.time())
    payload = {"iat": now - 60, "exp": now + 600, "iss": app_id}
    return jwt.encode(payload, private_key, algorithm="RS256")

def _get_installation_token(repo_name: str) -> str:
    """Exchange GitHub App JWT for a repo installation token."""
    token    = _get_jwt()
    headers  = {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"}
    owner, _ = repo_name.split("/")

    # list installations
    installs = requests.get(f"{GITHUB_API}/app/installations", headers=headers).json()
    install_id = None
    for inst in installs:
        if inst["account"]["login"] == owner:
            install_id = inst["id"]
            break

    if not install_id:
        raise ValueError(f"No installation found for owner: {owner}")

    resp = requests.post(
        f"{GITHUB_API}/app/installations/{install_id}/access_tokens",
        headers=headers,
    ).json()
    return resp["token"]

def _headers(repo_name: str) -> dict:
    token = _get_installation_token(repo_name)
    return {"Authorization": f"token {token}", "Accept": "application/vnd.github+json"}

@tool
def fetch_diff(diff_url: str, repo_name: str) -> str:
    """Fetch the raw unified diff of a pull request from GitHub."""
    headers = _headers(repo_name)
    headers["Accept"] = "application/vnd.github.v3.diff"
    resp = requests.get(diff_url, headers=headers)
    return resp.text[:8000]   # cap to avoid token overflow

@tool
def read_repo_file(repo_name: str, filepath: str, ref: str = "HEAD") -> str:
    """Read the current content of a file in the repository."""
    headers = _headers(repo_name)
    url     = f"{GITHUB_API}/repos/{repo_name}/contents/{filepath}?ref={ref}"
    resp    = requests.get(url, headers=headers).json()
    if "content" not in resp:
        return f"File not found: {filepath}"
    import base64
    content = base64.b64decode(resp["content"]).decode("utf-8", errors="replace")
    return content[:4000]

@tool
def post_pr_comment(repo_name: str, pr_number: int, comment: str) -> str:
    """Post a comment on a GitHub pull request."""
    headers = _headers(repo_name)
    url     = f"{GITHUB_API}/repos/{repo_name}/issues/{pr_number}/comments"
    resp    = requests.post(url, headers=headers, json={"body": comment})
    if resp.status_code == 201:
        return f"Comment posted on PR #{pr_number}"
    return f"Failed to post comment: {resp.text}"

@tool
def list_pr_files(repo_name: str, pr_number: int) -> str:
    """List all files changed in a pull request."""
    headers = _headers(repo_name)
    url     = f"{GITHUB_API}/repos/{repo_name}/pulls/{pr_number}/files"
    resp    = requests.get(url, headers=headers).json()
    files   = [f["filename"] for f in resp]
    return "\n".join(files)
