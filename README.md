# 💥 Blast Radius AI

**Know what breaks before you merge.**

Blast Radius AI is a multi-agent GitHub App that automatically analyzes every pull request and commit to map the full blast radius of any code change — which files will break, which functions will degrade, and which areas are safe — before a single line reaches production.


---

## The Problem

In a team codebase, a single renamed function, a changed API response shape, or a shifted database field can silently cascade into dozens of broken files. Code reviewers catch the *change* — they rarely catch the *downstream impact*. Teams ship, something breaks in production, and nobody knew it was coming.

**Blast Radius AI solves this at the PR level, before merge.**

---

## What It Does

- **Intercepts every PR** via a GitHub App webhook the moment it's opened or updated
- **Reads the diff** and understands semantically what changed — not just line diffs, but *what* the change means (function renamed, API shape changed, field removed)
- **Scans the entire codebase** to find every file that imports, calls, or depends on the changed entity
- **Classifies each impact** as HIGH (will break), MEDIUM (may degrade silently), or LOW (minor effect)
- **Posts a blast radius report** as a PR comment for the reviewer to see inline
- **Builds persistent agent memory** — a growing knowledge base of fragile areas, high-risk functions, and past findings, committed to git after every analysis
- **Provides a real-time dashboard** — a live feed of every analyzed PR, a codebase risk map, and the agent's full memory

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          GitHub                                     │
│                                                                     │
│   Developer opens PR  ──►  GitHub App Webhook  ──►  FastAPI        │
└─────────────────────────────────────────────────────────────────────┘
                                                          │
                                                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     LangGraph Pipeline                              │
│                                                                     │
│  ┌─────────────┐    ┌──────────────────┐    ┌──────────────────┐  │
│  │  Agent 1    │    │    Agent 2       │    │    Agent 3       │  │
│  │ Diff Reader │───►│ Impact Scanner   │───►│   Reporter       │  │
│  │             │    │                  │    │                  │  │
│  │ • Fetch PR  │    │ • Read memory    │    │ • Write report   │  │
│  │   diff      │    │ • Clone repo     │    │ • Post PR comment│  │
│  │ • Identify  │    │ • Search for     │    │ • Update memory  │  │
│  │   semantic  │    │   usages         │    │ • Commit to git  │  │
│  │   change    │    │ • LLM evaluate   │    │                  │  │
│  │ • Extract   │    │   each hit       │    │                  │  │
│  │   search    │    │ • Score severity │    │                  │  │
│  │   terms     │    │                  │    │                  │  │
│  └─────────────┘    └──────────────────┘    └──────────────────┘  │
│         │                    │                       │              │
│         └────────────────────┴───────────────────────┘              │
│                    Shared BlastRadiusState                          │
└─────────────────────────────────────────────────────────────────────┘
                                                          │
                          ┌───────────────────────────────┘
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       Storage Layer                                 │
│                                                                     │
│   SQLite DB  ──►  Analysis results, impacted files, severity       │
│   Git Repo   ──►  .gitagent/memory/ committed after each PR        │
└─────────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Next.js Dashboard                                │
│                                                                     │
│   PR Analysis Feed  │  Codebase Risk Map  │  Agent Memory Viewer   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Multi-Agent Pipeline (Deep Dive)

The core of Blast Radius AI is a **3-agent LangGraph pipeline**. Each agent has a dedicated role, a SOUL.md system prompt, and its own set of tools.

### Agent 1 — Diff Reader
**Role:** Understand *what* semantically changed, not just *which lines* changed.

- Fetches the raw unified diff from GitHub
- Lists all changed files
- Sends diff + file list to LLaMA 3.3 70B with a structured prompt
- Returns a JSON object describing the semantic change:

```json
{
  "change_type": "function_signature",
  "entity_name": "processPayment",
  "file": "services/payment.py",
  "before": "processPayment(amount, currency)",
  "after": "processPayment(amount, currency, idempotency_key)",
  "search_terms": ["processPayment", "process_payment"],
  "risk_level": "HIGH",
  "summary": "Added required idempotency_key param to processPayment"
}
```

### Agent 2 — Impact Scanner
**Role:** Find every file in the codebase that will be affected by this change.

- Reads `.gitagent/memory/` to get known fragile areas and high-risk functions
- Clones the repo locally (cached per session) using the GitHub App installation token
- Searches the entire codebase for each `search_term` using pure Python (`os.walk` + `re.compile`)
- For each match found, asks the LLM: *"Given this change, will this specific usage break?"*
- Classifies each impacted file as HIGH / MEDIUM / LOW with a reason

### Agent 3 — Reporter
**Role:** Format findings, communicate them, and persist learned knowledge.

- Builds a structured markdown blast radius report
- Posts it as a PR comment on GitHub so reviewers see it inline
- Updates `.gitagent/memory/high_risk_functions.md` and `fragile_areas.md`
- Appends a timestamped entry to `past_findings.md`
- Commits all memory updates to git — giving a full audit trail

### State Machine (LangGraph)

```
START
  │
  ▼
node_diff_reader
  │  Outputs: diff_content, semantic_change
  ▼
node_impact_scanner
  │  Outputs: impacted_files[]
  ▼
node_reporter
  │  Outputs: report, severity, impact_count
  ▼
node_save  ──►  SQLite  ──►  Dashboard
  │
END
```

---

## GitAgent Integration

This project is built on the **GitAgent protocol** — a standard for git-native AI agents where behavior, memory, and tools live inside the repository itself.

```
backend/
└── .gitagent/
    ├── agent1/
    │   ├── SOUL.md      ← System prompt: "You are a code change analyst..."
    │   ├── SKILL.md     ← Tool descriptions: fetch_diff, list_pr_files
    │   └── agent.yaml   ← Model config: llama-3.3-70b-versatile, temp=0
    ├── agent2/
    │   ├── SOUL.md      ← System prompt: "You are a dependency detective..."
    │   ├── SKILL.md     ← Tool descriptions: search_codebase, read_memory
    │   └── agent.yaml
    ├── agent3/
    │   ├── SOUL.md      ← System prompt: "You are a technical communicator..."
    │   ├── SKILL.md     ← Tool descriptions: post_pr_comment, update_memory
    │   └── agent.yaml
    └── memory/
        └── {repo_owner}_{repo_name}/
            ├── high_risk_functions.md   ← Grows with every PR
            ├── fragile_areas.md
            └── past_findings.md
```

**Why this matters:** The agent's memory is not stored in a database — it lives inside the git repository as markdown files. Every time the agent learns something new about a codebase, it commits that knowledge. You get a full history of what the agent learned and when, just by running `git log .gitagent/memory/`.

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **LLM** | Groq — LLaMA 3.3 70B Versatile | All three agent reasoning tasks |
| **Agent Framework** | LangGraph + LangChain | Multi-agent state machine, tool calling |
| **Backend** | FastAPI + Python | Webhook handler, REST API, async pipeline |
| **GitHub Integration** | GitHub App (JWT + Installation Tokens) | Webhook events, diff fetch, PR comments |
| **Agent Protocol** | GitAgent (SOUL.md / SKILL.md / agent.yaml) | Git-native agent identity and memory |
| **Codebase Search** | Pure Python (os.walk + re.compile) | Cross-platform file search, no grep needed |
| **Database** | SQLite | Analysis result persistence |
| **Frontend** | Next.js 15 (App Router) | Real-time dashboard with 5s polling |
| **Deployment** | Railway (backend) + Vercel (frontend) | Cloud hosting |

---

## Project Structure

```
BlastRadius/
├── backend/
│   ├── main.py                  # FastAPI app, webhook handler, scan endpoints
│   ├── pipeline.py              # LangGraph StateGraph — 4-node pipeline
│   ├── database.py              # SQLite init, save/query analysis results
│   ├── agents/
│   │   ├── diff_reader.py       # Agent 1
│   │   ├── impact_scanner.py    # Agent 2
│   │   └── reporter.py          # Agent 3
│   ├── tools/
│   │   ├── github_tools.py      # fetch_diff, post_pr_comment, list_pr_files
│   │   ├── search_tools.py      # Codebase cloning + file search
│   │   └── memory_tools.py      # Read/write/commit .gitagent/memory/
│   ├── .gitagent/
│   │   ├── agent1/SOUL.md
│   │   ├── agent2/SOUL.md
│   │   ├── agent3/SOUL.md
│   │   └── memory/              # Committed after every PR analysis
│   ├── requirements.txt
│   └── .env                     # Local only — never committed
│
└── frontend/
    ├── app/
    │   ├── layout.tsx            # Root layout + sticky nav
    │   ├── NavBar.tsx            # Client component nav with active state
    │   ├── page.tsx              # PR Analysis Feed
    │   ├── globals.css           # Design system (CSS custom properties)
    │   ├── risk-map/
    │   │   └── page.tsx          # Codebase risk map by file
    │   └── memory/
    │       └── page.tsx          # Agent memory viewer
    ├── package.json
    └── .env.local                # Local only — never committed
```

---

## Quick Start (Local)

### Prerequisites
- Python 3.10+
- Node.js 18+
- A [Groq API key](https://console.groq.com)
- A GitHub App (see setup below)
- [ngrok](https://ngrok.com) for local webhook testing

### 1. Clone and install

```bash
git clone https://github.com/your-username/blast-radius-ai.git
cd blast-radius-ai

# Backend
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
```

### 2. Configure environment

```bash
# backend/.env
GITHUB_APP_ID=your_app_id
GITHUB_PRIVATE_KEY_PATH=./your-key.pem
GITHUB_WEBHOOK_SECRET=your_webhook_secret
GROQ_API_KEY=your_groq_key

# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. Create a GitHub App

1. Go to **GitHub Settings → Developer Settings → GitHub Apps → New GitHub App**
2. Set permissions: `Pull requests` (Read & Write), `Contents` (Read)
3. Subscribe to events: `Pull request`, `Installation`
4. Set webhook URL to your ngrok URL + `/webhook`
5. Download the private key `.pem` file and place it in `backend/`

### 4. Run everything

```bash
# Terminal 1 — expose localhost to GitHub
ngrok http 8000

# Terminal 2 — backend
cd backend
uvicorn main:app --reload --port 8000

# Terminal 3 — frontend
cd frontend
npm run dev
```

Open **http://localhost:3000** — the dashboard is live.

### 5. Test it

Install your GitHub App on any repo, then either:
- Open a pull request → analysis runs automatically
- Use the **"Scan Existing Repo"** button on the dashboard → analyzes recent commits/PRs retroactively

---

## Environment Variables

| Variable | Where | Description |
|---|---|---|
| `GITHUB_APP_ID` | backend | Your GitHub App's numeric ID |
| `GITHUB_PRIVATE_KEY` | backend (cloud) | Full contents of the `.pem` file |
| `GITHUB_PRIVATE_KEY_PATH` | backend (local) | Path to the `.pem` file |
| `GITHUB_WEBHOOK_SECRET` | backend | Secret set in GitHub App settings |
| `GROQ_API_KEY` | backend | From [console.groq.com](https://console.groq.com) |
| `NEXT_PUBLIC_API_URL` | frontend | URL of the deployed backend |

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/webhook` | GitHub App webhook receiver |
| `GET` | `/api/analyses` | All PR analyses (used by dashboard feed) |
| `GET` | `/api/analyses/{owner}/{repo}/{pr}` | Single PR analysis |
| `GET` | `/api/risk-map/{owner}/{repo}` | File risk scores for a repo |
| `GET` | `/api/memory/{owner}/{repo}` | Agent memory files for a repo |
| `POST` | `/api/scan` | Trigger retroactive scan `{ repo_name, limit }` |

---

## Deployment

### Backend → Railway

1. New Project → Deploy from GitHub → root directory: `backend`
2. Set all env vars in Railway dashboard (use `GITHUB_PRIVATE_KEY` with full `.pem` contents)
3. Copy the Railway URL

### Frontend → Vercel

1. New Project → Import repo → root directory: `frontend`
2. Add `NEXT_PUBLIC_API_URL` = your Railway URL
3. Deploy

### Update GitHub App webhook

Go to your GitHub App settings and update the Webhook URL from your ngrok address to:
```
https://your-railway-app.up.railway.app/webhook
```

---

## How the Dashboard Works

The Next.js frontend polls the backend every **5 seconds** — no WebSocket setup needed. As soon as the agent pipeline completes for a PR, the result appears automatically in the feed.

**Three views:**

- **PR Analysis Feed** — every analyzed PR with severity, impact count, semantic summary, and a drill-down modal showing the full breakdown by file
- **Codebase Risk Map** — all files in a repo ranked by cumulative blast radius score across all PRs. Files that appear repeatedly in impacts rise to the top
- **Agent Memory** — the live contents of `.gitagent/memory/`, showing what the agent has learned about fragile areas, high-risk functions, and past findings

---

## Built With GitAgent

This project implements the [GitAgent protocol](https://github.com/open-gitagent/gitagent) — a standard for building AI agents whose identity, instructions, and memory live natively in git.

Each agent in this system has:
- A **SOUL.md** — the system prompt defining who the agent is and how it thinks
- A **SKILL.md** — descriptions of the tools the agent can use
- An **agent.yaml** — model configuration (model name, temperature, max tokens)

The agent memory is stored in `.gitagent/memory/` and committed to the repository after every PR analysis, making the agent's learned knowledge versioned, auditable, and portable.

---

*Built for the GitAgent Builder Challenge.*
