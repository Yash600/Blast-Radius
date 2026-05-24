import json
from typing import TypedDict, List
from langgraph.graph import StateGraph, END
from database import save_analysis

# ── Shared state flowing through the 3 agent nodes ────────────────────────────

class BlastRadiusState(TypedDict):
    # inputs
    pr_number:  int
    repo_name:  str
    diff_url:   str
    pr_title:   str
    pr_author:  str
    pr_url:     str

    # filled by Agent 1
    diff_content:    str
    semantic_change: dict

    # filled by Agent 2
    impacted_files:  List[dict]
    memory_context:  str

    # filled by Agent 3
    report: str

# ── Node functions (each calls its agent) ─────────────────────────────────────

def node_diff_reader(state: BlastRadiusState) -> BlastRadiusState:
    from agents.diff_reader import run as run_diff_reader
    result = run_diff_reader(state)
    state["diff_content"]    = result.get("diff_content", "")
    state["semantic_change"] = result.get("semantic_change", {})
    return state

def node_impact_scanner(state: BlastRadiusState) -> BlastRadiusState:
    from agents.impact_scanner import run as run_impact_scanner
    result = run_impact_scanner(state)
    state["impacted_files"] = result.get("impacted_files", [])
    state["memory_context"] = result.get("memory_context", "")
    return state

def node_reporter(state: BlastRadiusState) -> BlastRadiusState:
    from agents.reporter import run as run_reporter
    result = run_reporter(state)
    state["report"] = result.get("report", "")
    return state

def node_save(state: BlastRadiusState) -> BlastRadiusState:
    """Persist results to SQLite for the dashboard."""
    save_analysis(
        repo_name=state["repo_name"],
        pr_number=state["pr_number"],
        pr_title=state.get("pr_title", ""),
        pr_author=state.get("pr_author", ""),
        pr_url=state.get("pr_url", ""),
        semantic_change=state.get("semantic_change", {}),
        impacted_files=state.get("impacted_files", []),
        report=state.get("report", ""),
    )
    print(f"✅ Analysis saved for PR #{state['pr_number']}")
    return state

# ── Build the LangGraph pipeline ──────────────────────────────────────────────

def build_pipeline():
    graph = StateGraph(BlastRadiusState)

    graph.add_node("diff_reader",    node_diff_reader)
    graph.add_node("impact_scanner", node_impact_scanner)
    graph.add_node("reporter",       node_reporter)
    graph.add_node("save",           node_save)

    graph.set_entry_point("diff_reader")
    graph.add_edge("diff_reader",    "impact_scanner")
    graph.add_edge("impact_scanner", "reporter")
    graph.add_edge("reporter",       "save")
    graph.add_edge("save",           END)

    return graph.compile()

# ── Entry point called from main.py background task ───────────────────────────

async def run_pipeline(
    pr_number: int,
    repo_name: str,
    diff_url:  str,
    pr_title:  str,
    pr_author: str,
    pr_url:    str,
):
    pipeline = build_pipeline()

    initial_state: BlastRadiusState = {
        "pr_number":      pr_number,
        "repo_name":      repo_name,
        "diff_url":       diff_url,
        "pr_title":       pr_title,
        "pr_author":      pr_author,
        "pr_url":         pr_url,
        "diff_content":   "",
        "semantic_change": {},
        "impacted_files": [],
        "memory_context": "",
        "report":         "",
    }

    try:
        result = pipeline.invoke(initial_state)
        print(f"✅ Pipeline complete for PR #{pr_number} on {repo_name}")
        return result
    except Exception as e:
        print(f"❌ Pipeline failed for PR #{pr_number}: {e}")
        raise
