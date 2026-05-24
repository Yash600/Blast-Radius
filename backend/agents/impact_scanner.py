"""
Agent 2 — Impact Scanner
Takes what Agent 1 found and hunts for everything in the codebase that depends on it.
"""
import os
import json
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage
from tools.search_tools import search_codebase, get_file_content
from tools.memory_tools import read_memory

SOUL = open(os.path.join(".gitagent", "agent2", "SOUL.md")).read()

def run(state: dict) -> dict:
    llm = ChatGroq(
        model="llama-3.3-70b-versatile",
        temperature=0,
        api_key=os.getenv("GROQ_API_KEY"),
    )

    repo_name       = state["repo_name"]
    semantic_change = state.get("semantic_change", {})
    search_terms    = semantic_change.get("search_terms", [])
    changed_file    = semantic_change.get("file", "")

    print(f"  [Agent 2] Scanning for blast radius. Search terms: {search_terms}")

    # Step 1: Read memory — know what's been fragile before
    memory_context = read_memory.invoke({"repo_name": repo_name})

    # Step 2: Search codebase for all references to changed thing
    search_results = {}
    for term in search_terms[:5]:   # cap at 5 terms
        if term:
            result = search_codebase.invoke({
                "repo_name":       repo_name,
                "pattern":         term,
                "file_extensions": "",
            })
            search_results[term] = result

    # Combine all search hits into one block
    all_hits = []
    for term, hits in search_results.items():
        if hits and hits != "No matches found.":
            for line in hits.splitlines():
                # skip the file that was actually changed — we want consumers
                if changed_file and changed_file in line:
                    continue
                all_hits.append(line)

    hits_text = "\n".join(all_hits[:80]) if all_hits else "No external references found."

    # Step 3: Ask LLM to evaluate each hit — does it break?
    print(f"  [Agent 2] Evaluating {len(all_hits)} reference hits with LLM...")
    messages = [
        SystemMessage(content=SOUL),
        HumanMessage(content=f"""
You are analyzing the blast radius of a code change.

WHAT CHANGED:
{json.dumps(semantic_change, indent=2)}

MEMORY (what we know about this repo's fragile areas):
{memory_context}

ALL REFERENCES FOUND IN THE CODEBASE (file:line: content):
{hits_text}

For each reference above, decide:
1. Will it BREAK because of this change? (HIGH severity)
2. Will it behave differently / silently fail? (MEDIUM severity)
3. Is it unaffected? Skip it.

Respond with a JSON array ONLY (no markdown):
[
  {{
    "file": "path/to/file.py",
    "line": 42,
    "severity": "HIGH | MEDIUM | LOW",
    "reason": "brief explanation of why this breaks",
    "code_snippet": "the matching line of code"
  }}
]

Only include files that are actually impacted (HIGH or MEDIUM). Skip unaffected ones.
Return an empty array [] if nothing is impacted.
"""),
    ]

    response = llm.invoke(messages)
    raw      = response.content.strip()

    try:
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        impacted_files = json.loads(raw.strip())
        if not isinstance(impacted_files, list):
            impacted_files = []
    except Exception as e:
        print(f"  [Agent 2] JSON parse error: {e}")
        impacted_files = []

    print(f"  [Agent 2] Done. Found {len(impacted_files)} impacted locations.")

    return {
        "impacted_files": impacted_files,
        "memory_context": memory_context,
    }
