# AgentEval — AI Agent Evaluation & Marketplace

## What is this?

Multi-tenant SaaS for evaluating, scoring, and managing AI agents. Organizations create workspaces, install agent templates from a public marketplace, and track performance with structured evaluations. Dizid runs 18 agents across 5 departments — 12 Dizid personas and 6 Claude Code custom agents.

## Tech Stack

- **Frontend**: Vue 3 + Tailwind CSS 4 + Vite + Chart.js
- **Backend**: Netlify Functions v2 (`.mts` files with `config.path`)
- **Database**: Neon PostgreSQL (project: `calm-cherry-13678492`)
- **Auth**: Clerk (JWT + webhooks) + Svix (webhook verification)
- **Domain**: `hirefire.dev` (Porkbun registrar, DNS delegated to Netlify)
- **Deploy**: Netlify (`dizid-agenteval.netlify.app` → `hirefire.dev`)

## Project Defaults

```bash
npm run dev          # Vite on port 3000 (uses @netlify/vite-plugin, NOT netlify dev)
npm run build        # Production build
npm test             # Vitest with coverage
```

**Required env vars** (`.env` locally, Netlify UI for prod):
- `DATABASE_URL` — Neon connection string
- `VITE_CLERK_PUBLISHABLE_KEY` — Clerk frontend key (pk_test_... or pk_live_...)
- `CLERK_SECRET_KEY` — Clerk backend key
- `CLERK_WEBHOOK_SECRET` — Svix signing secret for `/api/webhooks/clerk`
- `SERVICE_KEY` — machine-to-machine auth for auto-eval hook + CLI commands
- `ANTHROPIC_API_KEY` — required by auto-eval scripts (Haiku/Sonnet API calls)

## Key Files

| File | Purpose |
|------|---------|
| `framework/FRAMEWORK.md` | Evaluation criteria, KPIs, scoring formula |
| `agents/*.md` | Individual agent persona files (single source of truth) |
| `migrations/*.sql` | Database schema and seed data (001-012) |
| `scripts/auto-eval.sh` | SubagentStop hook dispatcher (fast vs deep eval) |
| `scripts/eval-fast.sh` | Haiku G-Eval with transcript compression |
| `scripts/eval-deep.sh` | Sonnet CLI agent for deep evaluations |
| `scripts/prompts/g-eval-system.txt` | G-Eval system prompt with calibration anchors |
| `netlify/functions/*.mts` | API endpoints |
| `netlify/functions/utils/auth.ts` | Clerk JWT verification, org context, RBAC |
| `netlify/functions/utils/database.ts` | Neon connection helper |
| `netlify/functions/utils/scoring.ts` | Score calculations + anti-gaming |
| `netlify/functions/utils/response.ts` | CORS headers, error responses |
| `src/composables/useAuthContext.js` | Frontend auth state (wraps @clerk/vue) |
| `src/composables/useOrgContext.js` | Org switching, RBAC permission checks |
| `src/services/api.js` | Frontend API client |
| `src/services/scoring.js` | Score formatting utilities |
| `src/composables/useToast.js` | Toast notification system |
| `vitest.config.js` | Test configuration (Vitest + happy-dom) |

## Architecture

### Multitenancy Model

- **Auth**: Clerk JWT in `Authorization: Bearer` header → verified by `authenticate()` in auth.ts
- **Org scoping**: All queries filter by `org_id`. Resolved from `X-Org-Slug` header or user's first org
- **RBAC roles**: `viewer` < `evaluator` < `admin` < `owner` — checked via `authorize(ctx, 'admin')`
- **Public endpoints**: Marketplace browse uses `optionalAuth()` (no auth required)
- **Seed data**: Dizid org auto-created in migration 011 with all existing agents/evaluations migrated

### Database (10 tables)

**Core:**
- `agents` — id (TEXT PK), org_id (FK), name, department, department_id (FK), role, persona, kpi_definitions (JSONB), overall_score, status, source_type, template_id
- `evaluations` — id (SERIAL PK), agent_id (FK), org_id (FK), evaluator_user_id (FK), scores (JSONB), overall, weight, action_item, applied, applied_at
- `criteria` — id (TEXT PK), name, category, org_id (FK, NULL = global)

**Auth & tenancy:**
- `users` — id (UUID PK), clerk_user_id (UNIQUE), email, full_name, avatar_url, onboarding_completed
- `organizations` — id (UUID PK), name, slug (UNIQUE), owner_id (FK), plan_tier ('free'|'pro'|'enterprise'), agent_limit, member_limit
- `org_members` — (org_id, user_id) PK, role ('owner'|'admin'|'evaluator'|'viewer'), invited_by, joined_at
- `departments` — id (UUID PK), org_id (FK), name, slug, color, sort_order

**Marketplace:**
- `agent_templates` — id (TEXT PK), category, role, persona, kpi_definitions (JSONB), author_org_id, is_official, is_public, install_count, avg_rating
- `template_ratings` — (template_id, user_id) PK, rating (1-5), review_text
- `agent_installs` — id (SERIAL PK), template_id, org_id, agent_id, installed_by

### API Endpoints

| Method | Path | Handler | Auth | Purpose |
|--------|------|---------|------|---------|
| GET | `/api/agents` | agents-list.mts | yes | List org agents |
| POST | `/api/agents` | agents-list.mts | yes | Create agent |
| GET | `/api/agents/:id` | agents-detail.mts | yes | Agent detail + latest eval |
| PUT | `/api/agents/:id` | agents-detail.mts | yes | Update agent fields |
| PATCH | `/api/agents/:id` | agents-detail.mts | yes | Update status (fire/archive) |
| GET | `/api/agents/:id?include=action_items` | agents-detail.mts | yes | Action items |
| GET | `/api/agents/:id/evaluations` | evaluations-list.mts | yes | Evaluation history |
| POST | `/api/evaluations` | evaluations-create.mts | yes | Submit evaluation |
| GET | `/api/leaderboard` | leaderboard.mts | yes | Rankings + dept averages |
| GET | `/api/criteria` | criteria.mts | yes | Evaluation criteria |
| GET | `/api/categories` | categories.mts | yes | Department stats |
| GET | `/api/organizations` | orgs.mts | yes | User's orgs |
| POST | `/api/organizations` | orgs.mts | yes | Create org |
| GET/POST | `/api/departments` | departments.mts | yes | List/create departments |
| PUT/DELETE | `/api/departments/:id` | departments-detail.mts | yes | Update/delete department |
| GET/PUT | `/api/users/me` | users-me.mts | yes | User profile |
| GET | `/api/dashboard` | dashboard.mts | yes | Org overview stats |
| GET | `/api/marketplace` | marketplace-list.mts | no | Browse templates |
| GET | `/api/marketplace/:id` | marketplace-detail.mts | no | Template detail |
| POST | `/api/marketplace/:id/install` | marketplace-detail.mts | yes | Install template |
| POST | `/api/marketplace/:id/reviews` | marketplace-detail.mts | yes | Submit review |
| POST | `/api/webhooks/clerk` | webhook-clerk.mts | svix | User sync |
| GET | `/api/health` | health.mts | no | Health check |

### Frontend Routes

**Public:**
| Path | View | Purpose |
|------|------|---------|
| `/` | Landing | Homepage |
| `/pricing` | Pricing | Plan comparison (Free/Pro/Enterprise) |
| `/sign-in` | SignIn | Clerk sign-in |
| `/sign-up` | SignUp | Clerk sign-up |
| `/marketplace` | MarketplaceBrowse | Browse agent templates |
| `/marketplace/:id` | MarketplaceDetail | Template detail + reviews |

**Authenticated:**
| Path | View | Purpose |
|------|------|---------|
| `/onboarding` | Onboarding | New user org creation |
| `/dashboard` | Dashboard | Org overview + stats |
| `/browse` | Browse | Agent directory (org-scoped) |
| `/agent/:id` | AgentDetail | Agent profile + eval history |
| `/agent/:id/edit` | AgentEdit | Edit agent + action items |
| `/evaluate` | Evaluate | Submit evaluations |
| `/leaderboard` | Leaderboard | Rankings by dept |
| `/manage` | AgentManage | Fire/archive/reactivate agents |
| `/marketplace/:id/install` | MarketplaceInstall | Install template into org |
| `/settings` | OrgSettings | Org settings |
| `/settings/team` | TeamManage | Invite/manage members |
| `/settings/departments` | DepartmentManage | Create/edit departments |
| `/profile` | UserProfile | User profile |

## Current Roster (18 agents, 5 departments)

- **Development** (5): @FullStack, @Product, @Platform, @Data, @AI
- **Marketing** (5): @Content, @Growth, @Brand, @SEO, @Sales
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
- **Plan tiers**: Free (5 agents, 3 members), Pro (20/10), Enterprise (unlimited)

## Evaluation Flow

Agents are scored through three channels that all feed into the same database and dashboard:

```
┌─────────────────────────────────────────────────────────────┐
│                    EVALUATION SOURCES                        │
│                                                             │
│  1. AUTO (every task)        2. MANUAL           3. WEB UI │
│  SubagentStop hook           /rate command        hirefire  │
│  ─────────────────           ───────────         .dev/eval  │
│  Agent completes    →        CEO runs /rate  →   Form in    │
│  Hook fires         →        Reviews work    →   browser    │
│  auto-eval.sh       →        Scores 1-10     →   Scores     │
│  dispatches:        →        POSTs to API    →   POST to    │
│    eval-fast.sh              with Service-       API with   │
│    (Haiku G-Eval)            Key auth            Clerk JWT  │
│    eval-deep.sh                                             │
│    (Sonnet CLI)                                             │
└─────────────┬───────────────────┬──────────────────┬────────┘
              │                   │                  │
              ▼                   ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│              POST /api/evaluations                          │
│              (evaluations-create.mts)                       │
│                                                             │
│  Validates scores (1-10 integers, 8 universal + KPIs)       │
│  Applies anti-gaming:                                       │
│    • auto-eval weight = 0.7                                 │
│    • self-eval weight = 0.8                                 │
│    • low-effort detection = 0.5 (uniform scores)            │
│    • extreme scores (9+/1-3) capped without justification   │
│  Calculates: Universal Avg, Role Avg, Overall               │
│  Applies Bayesian smoothing to agent's cumulative score     │
│  Updates agent trend (up/down/stable)                       │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              NEON POSTGRESQL                                 │
│                                                             │
│  evaluations table: individual scorecards with action items │
│  agents table: overall_score, eval_count, trend, confidence │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              WEBAPP (hirefire.dev)                           │
│                                                             │
│  /dashboard      — org overview, top/bottom agents          │
│  /browse         — agent directory with scores              │
│  /agent/:id      — detail page + evaluation history chart   │
│  /agent/:id/edit — action items (apply → edit persona)      │
│  /leaderboard    — rankings by department                   │
│  /evaluate       — manual evaluation form                   │
└─────────────────────────────────────────────────────────────┘
```

### Auto-Eval Pipeline (scripts/)

| File | Role | Model | When |
|------|------|-------|------|
| `scripts/auto-eval.sh` | Dispatcher | — | Every SubagentStop hook |
| `scripts/eval-fast.sh` | Fast eval | Haiku 4.5 | Default: transcript <500KB, agent score >=5 |
| `scripts/eval-deep.sh` | Deep eval | Sonnet (CLI) | Large transcripts or underperforming agents |
| `scripts/prompts/g-eval-system.txt` | G-Eval prompt | — | Shared by both eval scripts |

**Fast path** (~$0.005/eval): jq-based transcript compression (40:1 ratio) + G-Eval prompt with chain-of-thought reasoning and calibration anchors. Runs synchronously within 60s hook timeout.

**Deep path** (~$0.05-0.15/eval): Claude CLI agent with Sonnet reads the full transcript, agent persona file, and git diff. Runs async (`nohup`) to avoid blocking. Triggered when transcript >500KB or agent score <5.0.

**Recursion prevention**: 3 layers — `EVAL_IN_PROGRESS` env var, `stop_hook_active` hook flag, `--disallowed-tools` on CLI agent.

### Improvement Loop

```
Score drops → Action item generated → /apply-action-items → Persona edited → /deploy-agents → Agent improves → Score rises
```

1. **Auto-eval** scores every task automatically via SubagentStop hook
2. **Action items** surface on agent detail page (`/agent/:id/edit`) — one per evaluation
3. **Apply** action items → edits `agents/*.md` persona file → `/deploy-agents` syncs globally
4. **Track** trends at hirefire.dev — scores, confidence levels, department averages

## Infrastructure Notes

- **DNS**: Managed via Netlify DNS (NOT Porkbun — NS delegated). Use `netlify api` for DNS changes
- **Env vars**: Set in Netlify UI or `netlify env:set`
- **Netlify site ID**: `aaf526b6-de59-4e14-b736-3f6f9e8a9ccf`
- **Netlify DNS zone ID**: `698afb04daa6d6efb5ee1aeb`
- **CORS**: Whitelisted origins in `response.ts` (production + localhost:5173 + localhost:8888)

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

All 18 agents (12 Dizid + 6 Claude Code custom) are defined globally in `~/.claude/CLAUDE.md` and available in every project.

### Workflow
1. **Use agents naturally** — say "as @SEO, audit this page" or "route to @Growth"
2. **Auto-eval fires automatically** — every subagent task is scored via the SubagentStop hook (no manual action needed)
3. **Optional manual eval** — run `/rate @AgentName` for CEO-weighted scoring (weight 1.0 vs auto's 0.7)
4. **View trends** at https://hirefire.dev — scores update in real-time after each evaluation

### Where Things Live
| What | Where | Purpose |
|------|-------|---------|
| Agent persona files | `agents/*.md` | Single source of truth (18 files) |
| Global agent copies | `~/.claude/agents/*.md` | Synced via `/deploy-agents` |
| Global reference table | `~/.claude/CLAUDE.md` | Compact routing table (no inline defs) |
| Evaluation data | Neon PostgreSQL | Scores, trends, action items |
| Dashboard | hirefire.dev | Visual leaderboard and history |

### Improving Agents
1. Rate agents via `/rate` or the web UI at `/evaluate`
2. Check action items on the agent detail page
3. Edit persona in `agents/{name}.md` based on action items
4. Run `/deploy-agents` to sync changes globally

## Rules

- Read existing files before suggesting changes
- Keep it modular and maintainable
- One action item per evaluation scorecard (focus beats breadth)
- Action items must target domain skills, not meta-workflow behavior
- Action items must be specific, testable, and implementable as persona edits
- All API endpoints must scope queries to `org_id` (no cross-tenant data leaks)
