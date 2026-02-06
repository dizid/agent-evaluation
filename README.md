# AgentEval

**The Credit Score for AI Agents** — Standardized evaluation engine + public leaderboard.

[Live Demo](https://dizid-agenteval.netlify.app) | [GitHub](https://github.com/dizid/agent-evaluation)

---

## Overview

AgentEval is a standalone app for evaluating, scoring, and improving AI agent personas. Born from the Dizid virtual company — 12 specialized agents across 3 departments (Development, Marketing, Operations), all personas of the same LLM.

The core loop: **Rate** → **Diagnose** → **Improve persona** → **Re-evaluate** → **Track**

Each agent is scored on 8 universal criteria plus 3-4 role-specific KPIs. Scores are weighted, smoothed with Bayesian statistics, and protected by an anti-gaming pipeline.

## Features

- **12 Agents** across 3 departments: Development (4), Marketing (4), Operations (4)
- **8 Universal Criteria**: Task Completion, Accuracy, Efficiency, Judgment, Communication, Domain Expertise, Autonomy, Safety
- **3-4 Role KPIs per agent** (e.g., @FullStack: Code Quality, First-Pass Success, Tool Usage, Debugging Speed)
- **Weighted Scoring**: `Overall = (Universal Avg × 0.6) + (Role KPI Avg × 0.4)`
- **Bayesian Smoothing**: New agents pulled toward 6.0 midpoint until enough evaluations accumulate
- **Anti-Gaming Pipeline**: Self-eval weight cap (0.8×), low-effort detection (0.5×), extreme score capping without justification
- **Rating Labels**: Elite (9-10), Strong (7-8), Adequate (5-6), Weak (3-4), Failing (1-2)
- **Confidence Badges**: Established (10+ evals), Early (3-9), New (1-2)
- **Trend Tracking**: Up/Down/Stable based on score movement
- **5 Pages**: Landing, Browse, Agent Detail, Evaluate, Leaderboard
- **8 API Endpoints**: RESTful JSON API with CORS support
- **Glass Morphism Dark UI**: Mobile-first responsive design

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | Vue 3 (Composition API) | 3.5 |
| Styling | Tailwind CSS 4 (`@theme` syntax) | 4.1 |
| Build | Vite | 7.3 |
| Router | Vue Router | 5.0 |
| Backend | Netlify Functions (TypeScript) | - |
| Database | Neon PostgreSQL (serverless) | - |
| Charts | Chart.js (Phase 2) | 4.5 |
| Dev Plugin | @netlify/vite-plugin | 2.8 |

## Quick Start

```bash
# Clone
git clone https://github.com/dizid/agent-evaluation.git
cd agent-evaluation

# Install
npm install

# Set database connection
echo "DATABASE_URL=postgresql://..." > .env

# Run dev server (uses @netlify/vite-plugin — do NOT use netlify dev)
npm run dev
# → http://localhost:3000

# Build for production
npm run build
```

> **Note**: The `@netlify/vite-plugin` emulates Netlify Functions inside Vite's dev server. No proxy configuration needed — the plugin handles `/api/*` routing automatically.

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check → `{ status, timestamp }` |
| GET | `/api/agents` | List agents → `{ agents[], total }` |
| GET | `/api/agents?department=X` | Filter by department |
| GET | `/api/agents/:id` | Agent detail → `{ agent, latest_evaluation }` |
| GET | `/api/agents/:id/evaluations` | Evaluation history → `{ evaluations[] }` |
| POST | `/api/evaluations` | Submit evaluation → `{ evaluation, agent_summary }` |
| GET | `/api/criteria` | Scoring criteria → `{ criteria[] }` |
| GET | `/api/criteria?category=universal` | Filter by category |
| GET | `/api/leaderboard` | Ranked agents → `{ agents[], department_averages[] }` |
| GET | `/api/categories` | Department summaries → `{ categories[] }` |

### Example: Submit an Evaluation

```json
POST /api/evaluations
{
  "agent_id": "fullstack",
  "scores": {
    "task_completion": 9, "accuracy": 8, "efficiency": 7,
    "judgment": 8, "communication": 8, "domain_expertise": 8,
    "autonomy": 9, "safety": 9,
    "code_quality": 8, "first_pass_success": 7,
    "tool_usage": 8, "debugging_speed": 8
  },
  "evaluator_type": "community",
  "task_description": "Built the evaluation framework",
  "top_strength": "Autonomy",
  "top_weakness": "Accuracy",
  "action_item": "Verify SQL table names before embedding in docs"
}
```

## Scoring System

### Per-Evaluation Score

```
Overall = (Universal Avg × 0.6) + (Role KPI Avg × 0.4)
```

Each criterion is scored 1-10. Universal criteria apply to all agents. Role KPIs are specific to each agent's specialization.

### Agent-Level Score (Bayesian Smoothing)

```
Displayed = (v / (v + m)) × R + (m / (v + m)) × C
```

| Variable | Meaning | Default |
|----------|---------|---------|
| `v` | Number of evaluations | - |
| `R` | Weighted average of all evaluations | - |
| `m` | Minimum evals for full weight | 5 |
| `C` | Prior (midpoint) | 6.0 |

This prevents a single high evaluation from inflating a new agent's score. With 1 evaluation at 8.1, the displayed score is ~6.4. After 10+ evaluations, the displayed score converges to the true average.

### Anti-Gaming Pipeline

1. **Self-evaluation cap**: Evaluations by the agent's creator get 0.8× weight
2. **Low-effort detection**: All scores within 1 point → 0.5× weight
3. **Extreme score capping**: Scores of 9-10 or 1-3 without justification notes are capped to 8 or floored to 4

### Rating Scale

| Score | Label | Meaning |
|-------|-------|---------|
| 9-10 | Elite | Exceeds senior human specialist |
| 7-8 | Strong | Reliable for production use |
| 5-6 | Adequate | Gets the job done |
| 3-4 | Weak | Frequent issues |
| 1-2 | Failing | Do not trust |

## Project Structure

```
agent-evaluation/
├── src/                          # Frontend (Vue 3)
│   ├── views/                    # 6 page components
│   │   ├── Landing.vue           # Hero, stats, top performers
│   │   ├── Browse.vue            # Filterable agent grid
│   │   ├── AgentDetail.vue       # Profile, scores, eval history
│   │   ├── Evaluate.vue          # Multi-step evaluation form
│   │   ├── Leaderboard.vue       # Ranked table/cards
│   │   └── NotFound.vue          # 404
│   ├── components/
│   │   ├── ui/                   # ScoreBadge, RatingLabel, ConfidenceBadge, DeptBadge
│   │   ├── agents/               # AgentCard, ScoreBreakdown
│   │   └── evaluations/          # ScoreSlider, EvaluationCard
│   ├── services/
│   │   ├── api.js                # REST client
│   │   └── scoring.js            # Client-side scoring utils
│   ├── router/index.js           # Route definitions
│   └── assets/tailwind.css       # Tailwind 4 @theme config
│
├── netlify/functions/            # Backend API (TypeScript)
│   ├── utils/                    # database.ts, scoring.ts, response.ts
│   ├── health.mts                # GET /api/health
│   ├── agents-list.mts           # GET /api/agents
│   ├── agents-detail.mts         # GET /api/agents/:id
│   ├── evaluations-list.mts      # GET /api/agents/:id/evaluations
│   ├── evaluations-create.mts    # POST /api/evaluations
│   ├── criteria.mts              # GET /api/criteria
│   ├── leaderboard.mts           # GET /api/leaderboard
│   └── categories.mts            # GET /api/categories
│
├── migrations/                   # SQL schema + seed data
│   ├── 001-schema.sql            # 3 tables + indexes
│   ├── 002-seed-criteria.sql     # 8 universal + 48 role KPIs
│   └── 003-seed-agents.sql       # 12 agents
│
├── framework/FRAMEWORK.md        # Evaluation criteria source of truth
├── agents/CLAUDE-TEAM.md         # 12 agent persona definitions
├── commands/                     # Slash command templates
└── scorecards/                   # Historical evaluation scorecards
```

## Database

Three tables on Neon PostgreSQL:

**agents** — 12 AI agent personas with denormalized scores
- Fields: `id`, `name`, `department`, `role`, `persona`, `kpi_definitions` (JSONB), `overall_score`, `rating_label`, `eval_count`, `confidence`, `trend`

**evaluations** — Individual scoring records
- Fields: `id`, `agent_id`, `scores` (JSONB), `universal_avg`, `role_avg`, `overall`, `rating_label`, `top_strength`, `top_weakness`, `action_item`, `is_self_eval`, `weight`

**criteria** — 56 scoring criteria definitions (8 universal + 48 role KPIs)
- Fields: `id`, `name`, `description`, `scoring_guide`, `category`, `applies_to` (TEXT[]), `sort_order`

## Deployment

- **Hosting**: Netlify (continuous deployment from `main` branch)
- **Database**: Neon PostgreSQL (serverless)
- **Environment variable**: `DATABASE_URL` (Neon connection string)
- **Build**: `npm run build` → `dist/` directory
- **Functions**: Auto-bundled from `netlify/functions/`
- **Redirects**: `/api/*` → Netlify Functions, `/*` → SPA fallback

## Roadmap (Phase 2)

- **LLM-as-Judge**: Automated evaluation using Claude with G-Eval framework
- **Benchmark Suite**: Standardized tasks per role for objective scoring
- **Trend Charts**: Score history visualization with Chart.js
- **Agent Marketplace**: Claude Code plugin packaging for agent distribution
- **MCP Server**: Agent-to-agent discovery (`search_agents`, `hire_agent`, `rate_agent`)
- **Community Ratings**: Public reviews and star ratings
- **Trust Tiers**: Unrated → Rated → Verified → Trusted → Elite

---

Built by [Dizid](https://dizid.com)
