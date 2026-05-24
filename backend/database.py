import sqlite3
import json
import os
from datetime import datetime

DB_PATH = "blast_radius.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS analyses (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            repo_name     TEXT NOT NULL,
            pr_number     INTEGER NOT NULL,
            pr_title      TEXT,
            pr_author     TEXT,
            pr_url        TEXT,
            semantic_change TEXT,
            impacted_files  TEXT,
            report          TEXT,
            severity        TEXT DEFAULT 'LOW',
            impact_count    INTEGER DEFAULT 0,
            created_at      TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

def save_analysis(
    repo_name: str,
    pr_number: int,
    pr_title: str,
    pr_author: str,
    pr_url: str,
    semantic_change: dict,
    impacted_files: list,
    report: str,
):
    severity     = "LOW"
    severities   = [f.get("severity", "LOW") for f in impacted_files]
    if "HIGH"   in severities: severity = "HIGH"
    elif "MEDIUM" in severities: severity = "MEDIUM"

    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        """
        INSERT INTO analyses
            (repo_name, pr_number, pr_title, pr_author, pr_url,
             semantic_change, impacted_files, report, severity, impact_count)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            repo_name, pr_number, pr_title, pr_author, pr_url,
            json.dumps(semantic_change),
            json.dumps(impacted_files),
            report,
            severity,
            len(impacted_files),
        ),
    )
    conn.commit()
    conn.close()

def get_all_analyses(repo_filter: str = None) -> list:
    conn   = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    query  = "SELECT * FROM analyses"
    params = ()
    if repo_filter:
        query  += " WHERE repo_name = ?"
        params  = (repo_filter,)
    query += " ORDER BY created_at DESC"
    rows   = conn.execute(query, params).fetchall()
    conn.close()
    result = []
    for row in rows:
        d = dict(row)
        d["semantic_change"] = json.loads(d["semantic_change"] or "{}")
        d["impacted_files"]  = json.loads(d["impacted_files"]  or "[]")
        result.append(d)
    return result

def delete_analysis(analysis_id: int) -> bool:
    conn = sqlite3.connect(DB_PATH)
    cur  = conn.execute("DELETE FROM analyses WHERE id = ?", (analysis_id,))
    conn.commit()
    conn.close()
    return cur.rowcount > 0

def delete_repo_analyses(repo_name: str) -> int:
    conn = sqlite3.connect(DB_PATH)
    cur  = conn.execute("DELETE FROM analyses WHERE repo_name = ?", (repo_name,))
    conn.commit()
    conn.close()
    return cur.rowcount

def delete_all_analyses() -> int:
    conn = sqlite3.connect(DB_PATH)
    cur  = conn.execute("DELETE FROM analyses")
    conn.commit()
    conn.close()
    return cur.rowcount

def get_analysis_by_pr(repo_name: str, pr_number: int) -> dict | None:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    row  = conn.execute(
        "SELECT * FROM analyses WHERE repo_name=? AND pr_number=? ORDER BY created_at DESC LIMIT 1",
        (repo_name, pr_number),
    ).fetchone()
    conn.close()
    if not row:
        return None
    d = dict(row)
    d["semantic_change"] = json.loads(d["semantic_change"] or "{}")
    d["impacted_files"]  = json.loads(d["impacted_files"]  or "[]")
    return d
