# Agent Evaluation & Improvement System — Handoff Document

**From:** crypto.tnxz.nl project (Claude Code session, Feb 6, 2026)
**To:** /home/marc/DEV/claude/agent-evaluation (new standalone project)
**Purpose:** Build a full-featured agent evaluation & improvement app

---

## What We Built

### 1. Agent Definitions (CLAUDE-TEAM.md)

Rebuilt the AI workforce from 30 generic agents to **12 specialized agents** across 3 departments:

| Department | Agents |
|-----------|--------|
| **Development** | @FullStack, @Product, @Platform, @Data |
| **Marketing** | @Growth, @Content, @Brand, @Community |
| **Operations** | @Ops, @Integration, @Publishing, @QA |

Key design decisions:
- **Merged redundant roles** (e.g., @FrontendDev + @BackendDev + @SeniorFullStack → @FullStack)
- **Removed template bloat** — LLMs already know press release formats, bug report templates, etc.
- **Added coordination protocols** — handoff format, escalation paths, approval gates, error handling, state markers
- **Added toolbox mapping** — each agent knows which MCP servers, commands, scripts, and skills it can use
- **Added debugging shortcuts** — quick-reference commands for common problems
- **Added environment variables** — mapped to the agents that use them

File: `agents/CLAUDE-TEAM.md` (457 lines, was 829)

### 2. Evaluation Framework (FRAMEWORK.md)

Complete scoring system with:

**8 Universal Criteria** (all agents, 60% weight):
1. Task Completion — finishes what was asked
2. Accuracy — outputs are correct
3. Efficiency — minimal steps, no over-engineering
4. Judgment — right calls in ambiguity
5. Communication — clear, concise, CEO-appropriate
6. Domain Expertise — deep specialty knowledge
7. Autonomy — works independently
8. Safety & Compliance — follows approval gates

**Role-Specific KPIs** (3-4 per agent, 40% weight):
- Each agent has tailored KPIs (e.g., @FullStack: Code Quality, First-Pass Success, Tool Usage, Debugging Speed)
- See `framework/FRAMEWORK.md` for full list

**Scoring:**
```
Overall = (Universal Avg x 0.6) + (Role KPI Avg x 0.4)
```

**Rating Scale:**
| Score | Label | Meaning |
|-------|-------|---------|
| 9-10 | Elite | Exceeds senior human specialist |
| 7-8 | Strong | Reliable for production work |
| 5-6 | Adequate | Gets the job done but needs review |
| 3-4 | Weak | Frequent issues, needs tuning |
| 1-2 | Failing | Don't trust without supervision |

File: `framework/FRAMEWORK.md` (223 lines)

### 3. Slash Commands

Two evaluation commands:

**`/rate` — Quick post-task rating**
- Reviews current conversation
- Auto-scores all criteria 1-10
- Presents scorecard with top strength, weakness, action item
- CEO can override any score
- Saves to scorecards directory

**`/evaluate-agent` — Weekly deep evaluation**
- Analyzes git history (7 days)
- Reviews files modified in agent's domain
- Compares to previous scorecards (trend arrows ↑↓→)
- Produces comprehensive report with up to 3 action items

Plus 4 agent-specific operational commands:
- `/db-status` — Database health check via Neon MCP
- `/trade-status` — Trading system overview via Neon MCP
- `/retrain` — ML model retraining pipeline
- `/security-check` — Quick security audit (auth, secrets, CORS, deps)

Files: `commands/*.md` (6 files)

### 4. First Scorecard

Evaluated @FullStack on the session that built all of this:

**Result: 8.1/10 — Strong**
- Top strength: Autonomy (9/10) — drove complex multi-phase session with minimal hand-holding
- Top weakness: Accuracy (8/10) — SQL table/column names in docs were not verified against live schema
- Action item: "Verify SQL table/column names via `mcp__Neon__get_database_tables` before including them."

File: `scorecards/fullstack-2026-02-06.md`

---

## Key Lessons Learned

### About Agent Design
1. **Fewer is better** — 12 focused agents outperform 30 generic ones. Less routing confusion, clearer ownership.
2. **Templates are waste** — LLMs already know standard formats. Don't put press release or bug report templates in agent personas.
3. **Toolbox mapping is critical** — Agents perform better when they know exactly which MCP servers, scripts, and commands they can use.
4. **Coordination protocols prevent chaos** — Handoff format, escalation paths, and approval gates are essential for multi-agent work.

### About Evaluation
5. **Action items must target domain skills, not meta-workflow** — "Consolidate plan cycles" is useless. "Verify SQL table names via MCP" is actionable.
6. **One action item per scorecard** — Focus beats breadth. Persona edits should be surgical.
7. **Auto-score + CEO override is the right balance** — Full manual scoring is too slow, full auto misses context.
8. **Universal criteria weighted higher (60%)** — An agent that communicates poorly or makes unsafe decisions fails regardless of domain skill.
9. **Trend tracking catches regression** — Weekly scorecards with ↑↓→ arrows show whether changes helped or hurt.

### About the Improvement Loop
10. **Rate → Diagnose → Improve → Re-evaluate → Track** — This is the core loop. Every evaluation should produce one concrete persona edit.
11. **Action items become CLAUDE-TEAM.md edits** — The mapping table in FRAMEWORK.md shows exactly how to fix low scores.
12. **Scorecards are the training data** — Over time, they reveal patterns: which agents consistently score low on what, which improvements worked.

---

## Architecture Vision for the Full App

This is what the new project could become:

### Core Features
1. **Agent Registry** — CRUD for agent definitions (name, role, department, persona, tools, KPIs)
2. **Evaluation Engine** — Score agents against criteria, auto-score from conversation analysis
3. **Scorecard Dashboard** — View/compare scores over time, trend charts per agent and per criterion
4. **Improvement Tracker** — Action items from evaluations → applied/pending/rejected status
5. **Persona Editor** — Edit agent personas with version history, diff view
6. **Benchmark Suite** — Standard tasks to test agents against (regression testing for personas)

### Data Model (conceptual)
```
agents
  id, name, department, role, persona_text, tools_json, created_at, updated_at

criteria
  id, name, description, category (universal|role), weight, applies_to_agent_id (null=universal)

evaluations
  id, agent_id, evaluator (auto|ceo), date, task_description, conversation_ref

scores
  id, evaluation_id, criterion_id, score (1-10), notes, auto_score, override_score

action_items
  id, evaluation_id, description, status (pending|applied|rejected), applied_at, persona_diff

scorecards (materialized view)
  agent_id, date, universal_avg, role_avg, overall, rating_label, trend_vs_previous
```

### Tech Stack Suggestions
- **Frontend**: Vue 3 + Tailwind CSS 4 (matches CEO's existing stack)
- **Backend**: Netlify Functions or Node.js API
- **Database**: Neon PostgreSQL (already in use) or SQLite for simplicity
- **Charts**: Chart.js or D3 for trend visualization
- **Auth**: Simple bearer token (single user)

### Stretch Goals
- **LLM-as-judge integration** — Feed conversation transcripts to Claude, get auto-scores with reasoning
- **A/B persona testing** — Run same task with two persona variants, compare scores
- **Slack/Telegram notifications** — Alert when an agent scores below threshold
- **Export** — Generate CLAUDE-TEAM.md from the app (source of truth moves to the app)
- **Prompt library** — Standard test prompts per role for benchmarking

---

## File Inventory

```
agent-evaluation/
├── HANDOFF.md                              # This file — full context for continuing
├── CLAUDE.md                               # Project instructions for Claude Code
├── dev.txt                                 # GitHub repo reference
│
├── framework/
│   └── FRAMEWORK.md                        # Full evaluation criteria, KPIs, scoring formula
│
├── agents/
│   └── CLAUDE-TEAM.md                      # 12 agent definitions (production version)
│
├── commands/
│   ├── rate.md                             # /rate slash command (quick evaluation)
│   ├── evaluate-agent.md                   # /evaluate-agent slash command (weekly deep)
│   ├── security-check.md                   # /security-check slash command
│   ├── db-status.md                        # /db-status slash command
│   ├── trade-status.md                     # /trade-status slash command
│   └── retrain.md                          # /retrain slash command
│
├── scorecards/
│   └── fullstack-2026-02-06.md             # First evaluation scorecard
│
└── research/                               # Empty — for future research notes
```

---

## What's NOT Included (and why)

| File | Why excluded |
|------|-------------|
| Crypto project code | Not relevant to the evaluation app |
| `.env` files | Secrets — never copy |
| `node_modules` | Generated, not source |
| Other slash commands (`/dev`, `/push`, `/wrap`) | Project-specific, not evaluation-related |
| CLAUDE.md from crypto project | Will create a fresh one for this project |

---

## How to Continue

1. Open `/home/marc/DEV/claude/agent-evaluation` in Claude Code
2. Read `HANDOFF.md` (this file) for full context
3. Read `CLAUDE.md` for project instructions
4. Decide on tech stack and scope for v1
5. Build the app

The framework, criteria, scorecard format, and improvement loop are all designed and tested. The new project turns these markdown files into a real application.
