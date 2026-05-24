import os
import re
import subprocess
import tempfile
import requests
from langchain_core.tools import tool

# Cloned repos cache: repo_name -> local_path
_cloned_repos: dict[str, str] = {}

def clone_repo(repo_name: str, token: str) -> str:
    """Clone repo to a temp directory (cached per session)."""
    if repo_name in _cloned_repos and os.path.exists(_cloned_repos[repo_name]):
        return _cloned_repos[repo_name]

    tmp = tempfile.mkdtemp(prefix="blast_radius_")
    clone_url = f"https://x-access-token:{token}@github.com/{repo_name}.git"
    subprocess.run(
        ["git", "clone", "--depth=1", clone_url, tmp],
        capture_output=True, check=True
    )
    _cloned_repos[repo_name] = tmp
    return tmp

def _get_token(repo_name: str) -> str:
    from tools.github_tools import _get_installation_token
    return _get_installation_token(repo_name)

def _search_files(directory: str, pattern: str, extensions: list = None) -> list:
    """
    Pure Python file search — works on Windows, Mac, Linux.
    Returns matching lines in 'filepath:linenum: content' format.
    """
    results = []
    skip_dirs = {".git", "node_modules", "__pycache__", ".venv", "venv", "dist", "build"}

    try:
        regex = re.compile(re.escape(pattern), re.IGNORECASE)
    except re.error:
        regex = re.compile(re.escape(pattern))

    for root, dirs, files in os.walk(directory):
        dirs[:] = [d for d in dirs if d not in skip_dirs]

        for fname in files:
            if extensions and not any(fname.endswith(ext) for ext in extensions):
                continue

            fpath = os.path.join(root, fname)
            rel   = os.path.relpath(fpath, directory)

            try:
                with open(fpath, "r", encoding="utf-8", errors="replace") as f:
                    for i, line in enumerate(f, 1):
                        if regex.search(line):
                            results.append(f"{rel}:{i}: {line.rstrip()}")
                            if len(results) >= 50:
                                return results
            except Exception:
                continue

    return results

@tool
def search_codebase(repo_name: str, pattern: str, file_extensions: str = "") -> str:
    """
    Search the entire codebase for a pattern.
    file_extensions: comma-separated e.g. '.py,.ts,.js' — leave empty to search all files.
    Returns matching lines with file:line format.
    """
    token    = _get_token(repo_name)
    repo_dir = clone_repo(repo_name, token)

    extensions = None
    if file_extensions:
        extensions = [e.strip() for e in file_extensions.split(",") if e.strip()]

    matches = _search_files(repo_dir, pattern, extensions)
    clean   = [m.replace(repo_dir + os.sep, "").replace(repo_dir + "/", "") for m in matches]

    return "\n".join(clean) if clean else "No matches found."

@tool
def get_file_content(repo_name: str, filepath: str) -> str:
    """
    Read a specific file from the cloned repository.
    Returns the file content (first 3000 chars).
    """
    token    = _get_token(repo_name)
    repo_dir = clone_repo(repo_name, token)
    full     = os.path.join(repo_dir, filepath)

    if not os.path.exists(full):
        return f"File not found: {filepath}"

    with open(full, "r", errors="replace") as f:
        return f.read()[:3000]

@tool
def list_repo_files(repo_name: str, directory: str = "") -> str:
    """
    List all files in the repository (or a subdirectory).
    """
    token    = _get_token(repo_name)
    repo_dir = clone_repo(repo_name, token)
    base     = os.path.join(repo_dir, directory) if directory else repo_dir

    skip  = {".git", "node_modules", "__pycache__", ".venv", "venv"}
    files = []
    for root, dirs, fnames in os.walk(base):
        dirs[:] = [d for d in dirs if d not in skip]
        for fname in fnames:
            rel = os.path.relpath(os.path.join(root, fname), repo_dir)
            files.append(rel)

    return "\n".join(files[:200])
