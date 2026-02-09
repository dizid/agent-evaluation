# Dizid Staffing Agency

AI workforce management system. 11 specialized agents across 3 departments — auto-evaluated on every task, continuously improved based on performance data.

[Dashboard](https://dizid-agenteval.netlify.app)

---

## How it works

```
Any project (crypto, travel, chess, etc.)
  -> Agents available via Task tool (zero config)
  -> Agent completes task
  -> SubagentStop hook fires globally
  -> Claude Haiku scores the work (~$0.001)
  -> Scores POST to dashboard API
  -> Dashboard shows per-agent, per-project trends
```

Agents live in `~/.claude/agents/` (global). A single `SubagentStop` hook in `~/.claude/settings.json` handles auto-eval for all projects. Project name is auto-detected from git.

## Agents

| Agent | Department | Role |
|-------|-----------|------|
| @FullStack | Development | Senior full-stack developer |
| @Product | Development | Product designer + UX researcher |
| @Platform | Development | DevOps + security + infrastructure |
| @Data | Development | Analytics + ML engineer |
| @AI | Development | AI/ML + prompt engineering specialist |
| @Growth | Marketing | Growth marketer + strategist |
| @Content | Marketing | Copywriter + content strategist |
| @Brand | Marketing | Brand guardian + creative director |
| @SEO | Marketing | SEO and analytics specialist |
| @Ops | Operations | Operations coordinator |
| @Email | Operations | Email and automation specialist |

Agent definitions: [`agents/*.md`](agents/)

## Commands

| Command | Description |
|---------|-------------|
| `/hire` | Create a new agent (file + database) |
| `/fire` | Remove an underperforming agent |
| `/deploy-agents` | Sync agent files to `~/.claude/agents/` |
| `/rate` | Manual evaluation (optional, web UI also works) |

## Scoring

**Per evaluation:**
```
Overall = (Universal Avg x 0.6) + (Role KPI Avg x 0.4)
```

**8 universal criteria** (all agents): Task Completion, Accuracy, Efficiency, Judgment, Communication, Domain Expertise, Autonomy, Safety

**3-4 role KPIs** per agent (e.g. @FullStack: Code Quality, First-Pass Success, Tool Usage, Debugging Speed)

**Weight hierarchy:**
| Source | Weight | When |
|--------|--------|------|
| Manual (web UI) | 1.0x | Human evaluation via dashboard |
| Self-eval | 0.8x | Agent evaluates itself |
| Auto-eval | 0.7x | SubagentStop hook (Haiku scoring) |
| Low-effort | 0.5x | All scores within 1 point of each other |

**Rating scale:** Elite (9-10), Strong (7-8), Adequate (5-6), Weak (3-4), Failing (1-2)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vue 3 + Tailwind CSS 4 + Vite |
| Backend | Netlify Functions (.mts) |
| Database | Neon PostgreSQL |
| Auto-eval | Claude Haiku via Anthropic API |
| Deploy | Netlify |

## Quick Start

```bash
npm install
echo "DATABASE_URL=postgresql://..." > .env
npm run dev    # NOT netlify dev
```

## Project Structure

```
agent-evaluation/
  agents/                       # Agent definitions (source of truth)
    fullstack.md                # 11 agent .md files with frontmatter
    CLAUDE-TEAM.md              # Combined team reference
  scripts/
    auto-eval.sh                # SubagentStop hook (Haiku scoring)
  .claude/commands/
    hire.md                     # /hire command
    fire.md                     # /fire command
    deploy-agents.md            # /deploy-agents command
  netlify/functions/            # API endpoints
    agents-list.mts             # GET /api/agents
    agents-detail.mts           # GET/PUT/PATCH /api/agents/:id
    evaluations-create.mts      # POST /api/evaluations
    evaluations-list.mts        # GET /api/agents/:id/evaluations
    leaderboard.mts             # GET /api/leaderboard
    criteria.mts                # GET /api/criteria
    categories.mts              # GET /api/categories
    health.mts                  # GET /api/health
  migrations/                   # SQL schema + seed data (6 files)
  framework/FRAMEWORK.md        # Evaluation criteria definition
  src/                          # Vue 3 frontend
```

## Architecture

```
~/.claude/
  agents/*.md                   # Global agents (copied from agents/)
  settings.json                 # SubagentStop hook -> auto-eval.sh
  commands/rate.md              # Manual eval command

agent-evaluation/ (this repo)
  agents/*.md                   # Source of truth (git-tracked)
  scripts/auto-eval.sh          # Scoring script (Haiku + API POST)

Workflow:
  /hire -> creates agent + DB entry
  /deploy-agents -> syncs to ~/.claude/agents/
  Agent works in any project -> SubagentStop fires -> auto-scored
  Dashboard shows trends -> /fire underperformers -> repeat
```

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/agents` | List agents (`?status=all` for archived) |
| GET | `/api/agents/:id` | Agent detail + latest eval |
| PUT | `/api/agents/:id` | Update agent fields |
| PATCH | `/api/agents/:id` | Update status (fire/archive/reactivate) |
| GET | `/api/agents/:id/evaluations` | Evaluation history |
| POST | `/api/evaluations` | Submit evaluation |
| GET | `/api/leaderboard` | Rankings + dept averages |
| GET | `/api/criteria` | Scoring criteria |
| GET | `/api/categories` | Department stats |

---

Built by [Dizid](https://dizid.com)
