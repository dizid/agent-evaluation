# AgentEval — System Architecture

Multi-tenant SaaS for evaluating, scoring, and managing AI agents. Organizations create workspaces, install agent templates from a public marketplace, and track performance with structured evaluations. Think of it as "HR for AI agents" — you hire them, score them, improve them, or fire them.

**Stack:** Vue 3 + Tailwind 4 + Vite + Netlify Functions + Neon PostgreSQL + Clerk auth
**Domain:** hirefire.dev

---

## Database (10 tables, 3 groups)

### Core — The evaluation engine

**agents** — Your roster. Each agent has an ID, persona, department, KPIs, and a running `overall_score` that updates after every evaluation.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | e.g. 'fullstack' |
| org_id | UUID FK | Scopes to organization |
| name | TEXT | Display name |
| department | TEXT | Legacy slug for leaderboard grouping |
| department_id | UUID FK | Links to departments table |
| role | TEXT | Job title |
| persona | TEXT | Full persona text |
| kpi_definitions | JSONB | Array of KPI names: `["code_quality", "first_pass_success", ...]` |
| overall_score | NUMERIC(3,1) | Bayesian-smoothed score |
| rating_label | TEXT | Elite/Strong/Adequate/Weak/Failing |
| eval_count | INTEGER | Running count |
| confidence | TEXT | New/Early/Established |
| trend | TEXT | up/down/stable (string, not numeric) |
| status | TEXT | active/archived/fired (soft-delete) |
| source_type | TEXT | dizid/claude-agent/template/manual |
| source_path | TEXT | e.g. 'agents/fullstack.md' |
| template_id | TEXT FK | If installed from marketplace |
| model | TEXT | e.g. 'claude-sonnet-4-5-20250929' |

**evaluations** — Individual scorecards. 8 universal criteria + 3-4 role KPIs, each scored 1-10.

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| agent_id | TEXT FK | |
| org_id | UUID FK | |
| evaluator_user_id | UUID FK | Who submitted |
| evaluator_type | TEXT | self/auto/manual/community |
| scores | JSONB | `{ task_completion: 9, accuracy: 8, ... }` |
| universal_avg | NUMERIC(3,1) | Average of 8 universal criteria |
| role_avg | NUMERIC(3,1) | Average of role KPIs |
| overall | NUMERIC(3,1) | Weighted combined score |
| weight | NUMERIC(3,2) | Anti-gaming: 0.5–1.0 |
| is_self_eval | BOOLEAN | |
| action_item | TEXT | Improvement recommendation |
| applied | BOOLEAN | Whether action item was applied to persona |
| applied_at | TIMESTAMPTZ | |
| task_description | TEXT | What was being evaluated |
| project | TEXT | Optional per-project tracking |

**criteria** — Definitions of what's being scored.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | e.g. 'task_completion' |
| name | TEXT | e.g. 'Task Completion' |
| category | TEXT | 'universal' or 'role_kpi' |
| applies_to | TEXT[] | Which agents this KPI applies to |
| org_id | UUID | NULL = global/platform criteria |

### Auth & Tenancy — Who owns what

**users** — Synced from Clerk via webhook.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | Internal ID |
| clerk_user_id | TEXT UNIQUE | Clerk's user ID |
| email | TEXT | |
| full_name | TEXT | |
| onboarding_completed | BOOLEAN | |

**organizations** — Workspaces.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| name | TEXT | |
| slug | TEXT UNIQUE | URL-safe, e.g. 'dizid' |
| owner_id | UUID FK | |
| plan_tier | TEXT | free/pro/enterprise |
| agent_limit | INTEGER | Free=5, Pro=20, Enterprise=unlimited |
| member_limit | INTEGER | Free=3, Pro=10, Enterprise=unlimited |

**org_members** — Team membership + RBAC.

| Column | Type | Notes |
|--------|------|-------|
| org_id | UUID | Composite PK |
| user_id | UUID | Composite PK |
| role | TEXT | owner/admin/evaluator/viewer |

Role hierarchy: `viewer (0) < evaluator (1) < admin (2) < owner (3)`

**departments** — Custom per-org groupings.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | |
| org_id | UUID FK | |
| name | TEXT | |
| slug | TEXT | Unique within org |
| color | TEXT | |
| sort_order | INTEGER | |

### Marketplace — The template store

**agent_templates** — Public agent configurations.

| Column | Type | Notes |
|--------|------|-------|
| id | TEXT PK | e.g. 'fullstack-developer' |
| name | TEXT | |
| category | TEXT | development/marketing/operations/tools/trading |
| role | TEXT | |
| persona | TEXT | |
| kpi_definitions | JSONB | |
| is_official | BOOLEAN | Dizid-authored |
| is_public | BOOLEAN | Visible in marketplace |
| install_count | INTEGER | |
| avg_rating | NUMERIC(3,1) | Auto-recalculated on new review |
| tags | TEXT[] | |

**template_ratings** — Reviews (one per user per template).

| Column | Type | Notes |
|--------|------|-------|
| template_id | TEXT | Composite PK |
| user_id | UUID | Composite PK |
| rating | INTEGER | 1-5 |
| review_text | TEXT | |

**agent_installs** — Tracks marketplace installs.

| Column | Type | Notes |
|--------|------|-------|
| id | SERIAL PK | |
| template_id | TEXT FK | |
| org_id | UUID FK | |
| agent_id | TEXT | The resulting agent.id |
| installed_by | UUID FK | |

---

## Agent Lifecycle

```
Hire → Evaluate → Improve → (repeat) → Fire/Archive
```

### Hiring (Creation)

Three ways to create an agent:

1. **`/hire` command** — Create persona file (`agents/[id].md`) + DB row + KPI criteria. Sets `source_type = 'dizid'`.
2. **API: `POST /api/agents`** — Admin+ role required. Creates agent scoped to caller's org.
3. **Marketplace install** — `POST /api/marketplace/:id?action=install`. Copies template into your org with `source_type = 'template'`.

### Evaluation (Scoring)

**API: `POST /api/evaluations`** — Requires evaluator+ role.

Scoring pipeline:

1. **Input:** 8 universal scores + 3-4 role KPI scores (each 1-10)
2. **Anti-gaming:**
   - All scores within 1 point → "low effort" → weight = 0.5
   - Extreme scores (9-10 or 1-3) without justification → capped to 8 or 4
   - Self-eval weight = 0.8, auto-eval = 0.7, manual = 1.0
3. **Calculate averages:**
   - `universalAvg` = average of 8 universal criteria
   - `roleAvg` = average of agent's KPI scores
4. **Overall score:** `(universalAvg × 0.6) + (roleAvg × 0.4)`
5. **Bayesian smoothing:** `(v/(v+m)) × R + (m/(v+m)) × 6.0` where m=5
   - New agents pulled toward 6.0 until they have enough evals
   - 1 eval at 9.0 → smoothed to 6.5
   - 10 evals averaging 8.0 → smoothed to 7.33
6. **Update agent:** overall_score, rating_label, eval_count, confidence, trend

**Rating labels:** Elite (9+), Strong (7+), Adequate (5+), Weak (3+), Failing (<3)
**Confidence:** Established (≥10 evals), Early (≥3), New (≥1)
**Trend:** up (Δ ≥ 0.5), down (Δ ≤ -0.5), stable

### Improvement (Action Items)

Each evaluation can include one `action_item` — a specific, testable improvement recommendation.

1. Evaluator submits scorecard with action item: "Improve test coverage on new code"
2. Item stored in `evaluations.action_item` with `applied = false`
3. Shows on agent edit page as pending
4. Click "Apply" → edit agent persona file → mark `applied = true`
5. `/deploy-agents` syncs updated persona to `~/.claude/agents/`
6. Re-evaluate on similar task → compare scores

### Firing (Soft-Delete)

`PATCH /api/agents/:id` with `status: 'fired'` or `status: 'archived'`.

- Agent disappears from Browse, Leaderboard, and category stats
- All evaluation history preserved for audit
- Can reactivate by setting `status: 'active'`

---

## Marketplace Flow

```
Browse (public) → Detail (public) → Install (auth required) → Agent in your org
```

### Browse

`GET /api/marketplace` — No auth required.

Query params: `category`, `search`, `sort` (installs/rating/recent), `limit`, `offset`.

Returns templates from `agent_templates` where `is_public = true`. 14 official templates seeded from Dizid's roster.

### Detail

`GET /api/marketplace/:id` — No auth required.

Returns template info + aggregate rating (AVG + COUNT from `template_ratings`). Cached 60s.

### Install

`POST /api/marketplace/:id?action=install` — Auth required.

1. Verify template exists and is public
2. Validate agent_id format (2-50 chars, lowercase alphanumeric + hyphens)
3. Check no duplicate agent_id in org
4. Resolve department from `department_id` (UUID) or `department_slug` (string), fallback to first dept
5. Insert into `agents` with `source_type = 'template'`, setting both `department` (string) and `department_id` (UUID)
6. Record in `agent_installs`, increment `install_count`
7. Agent appears in org's Browse page immediately

Customizable fields: agent_id, name, persona, department.

### Review

`POST /api/marketplace/:id?action=review` — Auth required.

UPSERT (one review per user per template). Rating 1-5 + optional text. Auto-recalculates `avg_rating` on `agent_templates`.

---

## Auth & Multitenancy

### Authentication Flow

1. User signs up/in via Clerk (email or social)
2. Clerk issues JWT, stored by `@clerk/vue` in frontend
3. Every API call includes `Authorization: Bearer <jwt>` + `X-Org-Slug: <slug>`
4. Backend `authenticate(req)` verifies JWT, resolves user + org, returns `AuthContext`

```typescript
interface AuthContext {
  userId: string      // Internal UUID
  clerkUserId: string // Clerk's user ID
  orgId: string       // Current org UUID
  orgSlug: string     // Org slug
  userRole: 'owner' | 'admin' | 'evaluator' | 'viewer'
}
```

### Organization Resolution

1. Check `X-Org-Slug` header → look up org + verify membership
2. If no header → default to user's first org (by join date)
3. Return 403 if user has no org membership

**All queries scoped by `org_id`** — no cross-tenant data leaks.

### RBAC

`authorize(ctx, 'admin')` checks if user's role meets the minimum.

| Action | Minimum Role |
|--------|-------------|
| View agents/evaluations | viewer |
| Submit evaluations | evaluator |
| Create/update agents | admin |
| Org settings/team management | owner |

### Special Auth Modes

- **`optionalAuth(req)`** — Returns `null` instead of 401. Used for public marketplace endpoints.
- **Service key** — `X-Service-Key` header for machine-to-machine calls (e.g., auto-eval hook). Maps to Dizid org with admin role.

### Clerk Webhook

`POST /api/webhooks/clerk` — Verified with Svix signing secret.

Handles `user.created`, `user.updated`, `user.deleted` events to keep `users` table in sync.

Dev fallback: if webhook hasn't fired yet, `authenticate()` auto-creates the user row.

---

## Persona System

### File Architecture

| Layer | Location | Purpose |
|-------|----------|---------|
| Source of truth | `agents/*.md` (18 files) | Agent behavior definitions, git-tracked |
| Global copy | `~/.claude/agents/*.md` | Synced via `/deploy-agents`, available in all projects |
| Global reference | `~/.claude/CLAUDE.md` | Compact 18-row routing table |
| DB runtime | Neon `agents` table | Scores, status, metadata |

### Persona File Structure

```markdown
# @FullStack — Senior Full-Stack Developer

**Who:** Senior full-stack developer. Ships features end-to-end.
**Handles:** Feature development, bug fixes, APIs, database work...
**Tech:** Vue 3, Node.js, TypeScript, Tailwind CSS, PostgreSQL...
**Voice:** Code-first, practical. Shows working solutions.

## Behavior Rules
- Always implement try/catch with meaningful error messages
- Use TypeScript strict mode
- Write complete, working code — no TODOs

## Toolbox
| Type | Tools |
|------|-------|
| MCP | mcp__Neon__run_sql, ... |
| Commands | /dev, /push |
```

### Improvement Loop

```
Evaluate → Action Item → Edit Persona → Deploy → Re-evaluate
```

The persona files define how each agent behaves when invoked in Claude Code. The evaluation system scores that behavior, generates action items, and those items get written back into the persona files. Closed loop.

---

## API Endpoints

### Agents
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/agents` | yes | List org agents |
| POST | `/api/agents` | admin+ | Create agent |
| GET | `/api/agents/:id` | yes | Agent detail + latest eval |
| PUT | `/api/agents/:id` | admin+ | Update agent fields |
| PATCH | `/api/agents/:id` | admin+ | Update status (fire/archive) |
| GET | `/api/agents/:id?include=action_items` | yes | Action items |
| GET | `/api/agents/:id/evaluations` | yes | Evaluation history |

### Evaluations
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/evaluations` | evaluator+ | Submit evaluation |

### Analytics
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/leaderboard` | yes | Rankings by dept |
| GET | `/api/criteria` | yes | Scoring criteria |
| GET | `/api/categories` | yes | Department stats |
| GET | `/api/dashboard` | yes | Org overview |

### Organizations
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET/POST | `/api/organizations` | yes | List/create orgs |
| GET/POST/PUT/DELETE | `/api/departments` | yes | Department CRUD |
| GET/PUT/DELETE | `/api/departments/:id` | admin+ | Department detail |
| GET/PUT | `/api/users/me` | yes | User profile |

### Marketplace
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/marketplace` | **no** | Browse templates |
| GET | `/api/marketplace/:id` | **no** | Template detail |
| POST | `/api/marketplace/:id?action=install` | yes | Install template |
| POST | `/api/marketplace/:id?action=review` | yes | Submit review |

### System
| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/webhooks/clerk` | svix | User sync |
| GET | `/api/health` | **no** | Health check |

---

## Frontend Routes

### Public
| Path | View | Purpose |
|------|------|---------|
| `/` | Landing | Homepage |
| `/pricing` | Pricing | Plan comparison |
| `/sign-in` | SignIn | Clerk sign-in |
| `/sign-up` | SignUp | Clerk sign-up |
| `/marketplace` | MarketplaceBrowse | Browse templates |
| `/marketplace/:id` | MarketplaceDetail | Template detail |

### Authenticated
| Path | View | Purpose |
|------|------|---------|
| `/onboarding` | Onboarding | New user org creation |
| `/dashboard` | Dashboard | Org overview |
| `/browse` | Browse | Agent directory |
| `/agent/:id` | AgentDetail | Agent profile + eval history |
| `/agent/:id/edit` | AgentEdit | Edit agent + action items |
| `/evaluate` | Evaluate | Submit evaluations |
| `/leaderboard` | Leaderboard | Rankings by dept |
| `/manage` | AgentManage | Fire/archive agents |
| `/marketplace/:id/install` | MarketplaceInstall | Install template |
| `/settings` | OrgSettings | Org settings |
| `/settings/team` | TeamManage | Manage members |
| `/settings/departments` | DepartmentManage | Manage departments |
| `/profile` | UserProfile | User profile |

---

## Current Roster (18 agents, 5 departments)

| Dept | Agents |
|------|--------|
| Development (5) | @FullStack, @Product, @Platform, @Data, @AI |
| Marketing (5) | @Content, @Growth, @Brand, @SEO, @Sales |
| Operations (2) | @Ops, @Email |
| Tools (2) | @CodeImprover, @SecurityReviewer |
| Trading (4) | @BacktestQuant, @RiskQuant, @RegimeDetector, @EdgeMonitor |

---

## Key Gotchas

- `evaluations` table column is `overall`, `agents` table column is `overall_score`
- `overall_score` comes back as string from Neon — use `Number()` in frontend
- KPI definitions are JSONB arrays of **strings**, not objects
- Trend is string comparison (`== 'up'`), not numeric
- Criteria lookup by `c.id` (e.g. 'task_completion'), not `c.name`
- Netlify Functions: new files may not be discovered by git deploys — use `netlify deploy --prod`
- Netlify Functions: array paths in `config.path` don't work — use query params for sub-resources
- `authenticate()` returns `AuthContext | Response` — check with `instanceof Response`
- Departments have both `department` (string slug) and `department_id` (UUID FK) on agents — both must be set
