# Agent Evaluation & Improvement App

## What is this?

A standalone app for evaluating, scoring, and managing AI agents. Tracks 17 agents across 5 departments — 11 Dizid personas (from `agents/CLAUDE-TEAM.md`) and 6 Claude Code custom agents (from `~/.claude/agents/`). The goal: systematically evaluate, improve, and manage every agent through one system.

## Tech Stack

- **Frontend**: Vue 3 + Tailwind CSS 4 + Vite
- **Backend**: Netlify Functions v2 (`.mts` files with `config.path`)
- **Database**: Neon PostgreSQL (project: `calm-cherry-13678492`)
- **Deploy**: Netlify (`dizid-agenteval.netlify.app`)

## Key Files

| File | Purpose |
|------|---------|
| `framework/FRAMEWORK.md` | Evaluation criteria, KPIs, scoring formula, rating scale |
| `agents/CLAUDE-TEAM.md` | Dizid agent definitions |
| `migrations/*.sql` | Database schema and seed data |
| `netlify/functions/*.mts` | API endpoints |
| `src/views/*.vue` | Page components |
| `src/services/api.js` | Frontend API client |
| `src/services/scoring.js` | Score calculations and formatting |

## Architecture

### Database (3 tables)
- `agents` — id (TEXT PK), name, department, role, persona, kpi_definitions (JSONB), overall_score, status, source_type, source_path, model
- `evaluations` — id (SERIAL PK), agent_id (FK), scores (JSONB), overall, weight, action_item, etc.
- `criteria` — id (TEXT PK), name, category, agent_id (FK)

### API Endpoints
| Method | Path | Handler | Purpose |
|--------|------|---------|---------|
| GET | `/api/agents` | agents-list.mts | List agents (default: active only, `?status=all` for all) |
| POST | `/api/agents` | agents-list.mts | Create new agent |
| GET | `/api/agents/:id` | agents-detail.mts | Agent detail + latest evaluation |
| PUT | `/api/agents/:id` | agents-detail.mts | Update agent fields |
| PATCH | `/api/agents/:id` | agents-detail.mts | Update agent status (fire/archive/reactivate) |
| GET | `/api/agents/:id?include=action_items` | agents-detail.mts | Action items from evaluations |
| GET | `/api/agents/:id/evaluations` | evaluations-list.mts | All evaluations for agent |
| POST | `/api/evaluations` | evaluations-create.mts | Submit evaluation |
| GET | `/api/leaderboard` | leaderboard.mts | Rankings + dept averages |
| GET | `/api/criteria` | criteria.mts | Evaluation criteria |
| GET | `/api/categories` | categories.mts | Department stats |

### Frontend Routes
| Path | View | Purpose |
|------|------|---------|
| `/` | Landing | Homepage |
| `/browse` | Browse | Agent directory with dept/score filters |
| `/agent/:id` | AgentDetail | Agent profile + evaluation history |
| `/agent/:id/edit` | AgentEdit | Edit agent + improvement suggestions |
| `/evaluate` | Evaluate | Submit evaluations |
| `/leaderboard` | Leaderboard | Rankings by dept |
| `/manage` | AgentManage | Admin hub: fire/archive/reactivate agents |

## Current Roster (17 agents, 5 departments)

- **Development** (5): @FullStack, @Product, @Platform, @Data, @AI
- **Marketing** (4): @Content, @Growth, @Brand, @SEO
- **Operations** (2): @Ops, @Email
- **Tools** (2): @CodeImprover, @SecurityReviewer — source: `claude-agent`
- **Trading** (4): @BacktestQuant, @RiskQuant, @RegimeDetector, @EdgeMonitor — source: `claude-agent`

## Core Concepts

- **8 Universal Criteria** scored 1-10 (Task Completion, Accuracy, Efficiency, Judgment, Communication, Domain Expertise, Autonomy, Safety)
- **3-4 Role KPIs** per agent scored 1-10
- **Overall Score** = (Universal Avg x 0.6) + (Role KPI Avg x 0.4)
- **Anti-gaming**: self-eval 0.8 weight, auto-eval 0.7, low-effort 0.5
- **Bayesian smoothing**: `(v/(v+m))*R + (m/(v+m))*6.0` where m=5
- **Agent lifecycle**: active → archived/fired (soft-delete, hidden from Browse/Leaderboard)

## Netlify Functions Gotchas

- New function files may NOT be discovered by git deploys — use `netlify deploy --prod`
- Array paths in `config.path` don't work reliably
- Best pattern: one file handles multiple HTTP methods via `req.method` routing
- For sub-resources, use query params (`?include=action_items`) not sub-routes
- `evaluations` column is `overall`, `agents` column is `overall_score`
- `overall_score` comes back as string from Neon — use `Number()` in frontend

## Design Preferences

- Mobile-first (CEO uses phone primarily)
- Tailwind CSS 4 (`@theme {}` syntax)
- Dark mode default, glass morphism UI
- Vue 3 Composition API (`<script setup>`)
- Simple solutions over clever ones
- Complete working code — no TODOs, mocks, or stubs

## Using Agents Across Projects

All 11 Dizid agents are defined globally in `~/.claude/CLAUDE.md` and available in every project.

### Workflow
1. **Use agents naturally** — say "as @SEO, audit this page" or "route to @Growth"
2. **After significant work**, run `/rate @AgentName` to evaluate performance
3. **Fill in the project name** when evaluating — this tracks per-project performance
4. **View trends** at https://dizid-agenteval.netlify.app

### Where Things Live
| What | Where | Purpose |
|------|-------|---------|
| Agent personas + behavior rules | `~/.claude/CLAUDE.md` | Global — loaded in every project |
| Individual agent files | `agents/*.md` | Source of truth for AgentEval |
| Combined team reference | `agents/CLAUDE-TEAM.md` | Detailed version with toolbox |
| Evaluation data | Neon PostgreSQL | Scores, trends, action items |
| Dashboard | dizid-agenteval.netlify.app | Visual leaderboard and history |

### Improving Agents
1. Rate agents via `/rate` or the web UI at `/evaluate`
2. Check action items on the agent detail page
3. Edit persona in `agents/{name}.md` based on action items
4. Sync changes to `~/.claude/CLAUDE.md` (global) and `agents/CLAUDE-TEAM.md`

## Rules

- Read existing files before suggesting changes
- Keep it modular and maintainable
- One action item per evaluation scorecard (focus beats breadth)
- Action items must target domain skills, not meta-workflow behavior
- Action items must be specific, testable, and implementable as persona edits
