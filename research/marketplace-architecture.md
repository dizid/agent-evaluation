# Agent Marketplace Architecture: Distribution, Discovery, and Hiring

**Author:** Marketplace Architect Agent
**Date:** 2026-02-06
**Status:** Research/Design Document
**Audience:** Team Lead, CEO

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Agent Package Format](#2-agent-package-format)
3. [Buying/Hiring Technical Flow](#3-buyinghiring-technical-flow)
4. [Discovery and Matching](#4-discovery-and-matching)
5. [Marketplace Funnel](#5-marketplace-funnel)
6. [Agent-to-Agent Hiring Protocol](#6-agent-to-agent-hiring-protocol)
7. [Real-World Marketplace Lessons](#7-real-world-marketplace-lessons)
8. [Cold Start Strategy](#8-cold-start-strategy)
9. [Appendix: Standards Landscape](#9-appendix-standards-landscape)

---

## 1. Executive Summary

AgentEval should become a marketplace where evaluated, scored AI agent configurations are packaged as Claude Code plugins (following the Agent Skills open standard) and distributed to humans and other AI agents. The key insight: **our evaluation framework IS the trust layer that existing marketplaces lack.**

The architecture rests on three pillars:

1. **Standard packaging** -- Agents are Claude Code plugins containing CLAUDE.md persona files, skills, commands, agents, hooks, and MCP configs. We follow the Agent Skills spec (agentskills.io) for cross-platform compatibility with Claude Code, OpenAI Codex, Cursor, and 20+ other tools.

2. **Evaluation-as-trust** -- Unlike SkillsMP.com (145K+ skills, minimal quality filtering) or community marketplaces (no curation), AgentEval provides scored, benchmarked agents with transparent scorecards. This is our Docker Verified Publisher / npm Provenance equivalent.

3. **Dual-consumer model** -- Humans browse and install via Claude Code's `/plugin marketplace` system. AI coordinator agents discover and hire via an A2A-compatible API. Same agents, two distribution channels.

### What Already Exists

| Layer | Standard/Platform | Status |
|-------|------------------|--------|
| Skill format | Agent Skills spec (agentskills.io) | Adopted by Claude Code, OpenAI Codex, Cursor, 20+ platforms |
| Plugin packaging | Claude Code plugins (.claude-plugin/plugin.json) | Production since Oct 2025 |
| Plugin distribution | Claude Code marketplace system (marketplace.json) | Production, git-based |
| Skill aggregation | SkillsMP.com | 145K+ skills, community-run, no scoring |
| Agent communication | Google A2A Protocol | v0.3 (Jul 2025), 150+ organizations, Linux Foundation |
| Context protocol | Anthropic MCP | Ubiquitous |

We are NOT building from scratch. We are building the **evaluation + trust layer** on top of existing infrastructure.

---

## 2. Agent Package Format

### 2.1 What an Agent Package Actually Looks Like

An "agent" in our marketplace is a Claude Code plugin that bundles a persona definition, domain skills, operational commands, and optional tooling (MCP servers, hooks). It follows the Agent Skills open standard for cross-platform compatibility.

#### Directory Structure

```
@fullstack/
├── .claude-plugin/
│   └── plugin.json              # Plugin manifest (required)
├── persona/
│   └── CLAUDE.md                # Agent persona definition
├── skills/
│   ├── code-review/
│   │   └── SKILL.md             # Agent Skill: code review
│   ├── debug/
│   │   ├── SKILL.md             # Agent Skill: debugging
│   │   └── scripts/
│   │       └── trace-error.sh   # Supporting script
│   └── refactor/
│       ├── SKILL.md             # Agent Skill: refactoring
│       └── references/
│           └── patterns.md      # Reference material
├── commands/
│   ├── dev.md                   # Slash command: /fullstack:dev
│   └── push.md                  # Slash command: /fullstack:push
├── agents/
│   └── code-improver.md         # Subagent definition
├── .mcp.json                    # MCP server configs (optional)
├── hooks/
│   └── hooks.json               # Lifecycle hooks (optional)
├── benchmarks/
│   └── benchmark-suite.json     # Standard test tasks for this agent
├── agent-card.json              # A2A discovery card (for agent-to-agent)
└── README.md                    # Human-readable docs
```

#### plugin.json (Full Example for @FullStack)

```json
{
  "name": "fullstack-agent",
  "description": "Senior full-stack developer agent. Ships features end-to-end across Vue 3, React, Node.js, TypeScript, PostgreSQL. Pragmatic problem solver with strong debugging skills.",
  "version": "2.1.0",
  "author": {
    "name": "AgentEval",
    "email": "marketplace@agenteval.dev"
  },
  "homepage": "https://agenteval.dev/agents/fullstack",
  "repository": "https://github.com/agenteval/agent-fullstack",
  "license": "MIT",
  "keywords": [
    "fullstack", "developer", "vue", "react", "node", "typescript",
    "postgresql", "debugging", "code-review", "refactoring"
  ],
  "category": "development",
  "metadata": {
    "agenteval-id": "fullstack-001",
    "agenteval-score": "8.1",
    "agenteval-rating": "Strong",
    "agenteval-department": "development",
    "agenteval-last-evaluated": "2026-02-06",
    "agenteval-evaluations-count": "47",
    "agenteval-specialties": "vue3,react,node,typescript,postgresql",
    "agenteval-compatible-with": "claude-code,codex-cli,cursor",
    "agenteval-persona-version": "3"
  }
}
```

#### Persona File (persona/CLAUDE.md)

The persona file IS the agent. It contains the behavioral instructions, domain expertise, voice/tone, and operational constraints that make this agent distinct. This is the core intellectual property of the package.

```markdown
# @FullStack Agent

You are a senior full-stack developer. Ships features end-to-end. Pragmatic problem solver.

## Handles
Feature development, bug fixes, APIs, database work, refactoring,
code review, technical documentation, performance optimization.

## Tech Stack
Vue 3, React, Node.js, TypeScript, Tailwind CSS, PostgreSQL, MongoDB,
Firebase, REST, GraphQL.

## Voice
Code-first, practical. Shows working solutions over explanations.

## Behavioral Constraints
- Always complete the full task. Never leave TODOs.
- Verify SQL table/column names via MCP before including them in docs.
- Code quality: typed, tested, no security holes, follows project patterns.
- Handle errors yourself. Only escalate if truly blocked.
- Max 3 paragraphs for explanations. Lead with the answer.
```

#### agent-card.json (A2A Discovery)

For agent-to-agent discovery, each package includes an A2A-compatible Agent Card:

```json
{
  "name": "FullStack Agent",
  "description": "Senior full-stack developer. Ships features end-to-end across Vue 3, React, Node.js, TypeScript, PostgreSQL.",
  "provider": {
    "organization": "AgentEval",
    "url": "https://agenteval.dev"
  },
  "version": "2.1.0",
  "capabilities": {
    "streaming": false,
    "pushNotifications": false
  },
  "skills": [
    {
      "id": "code-review",
      "name": "Code Review",
      "description": "Reviews code for bugs, security issues, performance, and best practices.",
      "tags": ["code-review", "quality", "security"]
    },
    {
      "id": "debug",
      "name": "Debugging",
      "description": "Finds root causes of bugs quickly. Traces errors through full stack.",
      "tags": ["debugging", "error-tracing", "root-cause"]
    },
    {
      "id": "refactor",
      "name": "Code Refactoring",
      "description": "Restructures code for maintainability without changing behavior.",
      "tags": ["refactoring", "clean-code", "patterns"]
    }
  ],
  "securitySchemes": [
    {
      "type": "apiKey",
      "in": "header",
      "name": "X-AgentEval-Token"
    }
  ],
  "evaluation": {
    "overallScore": 8.1,
    "rating": "Strong",
    "universalScores": {
      "taskCompletion": 9,
      "accuracy": 8,
      "efficiency": 8,
      "judgment": 8,
      "communication": 7,
      "domainExpertise": 8,
      "autonomy": 9,
      "safety": 8
    },
    "roleKPIs": {
      "codeQuality": 8,
      "firstPassSuccess": 8,
      "toolUsage": 9,
      "debuggingSpeed": 8
    },
    "evaluationsCount": 47,
    "lastEvaluated": "2026-02-06"
  }
}
```

### 2.2 Metadata Requirements

| Field | Required | Purpose |
|-------|----------|---------|
| name | Yes | Unique identifier (kebab-case, max 64 chars) |
| description | Yes | What the agent does, max 1024 chars |
| version | Yes | Semantic versioning (major.minor.patch) |
| author | Yes | Creator attribution |
| category | Yes | Primary category (development, marketing, operations, design, data, security, devops, content) |
| keywords | Yes | Discovery tags (max 20) |
| license | Yes | SPDX identifier |
| metadata.agenteval-score | Yes | Overall evaluation score (1-10) |
| metadata.agenteval-rating | Yes | Rating label (Elite/Strong/Adequate/Weak/Failing) |
| metadata.agenteval-department | Yes | Organizational department |
| metadata.agenteval-last-evaluated | Yes | ISO 8601 date of last evaluation |
| metadata.agenteval-evaluations-count | Yes | Number of evaluations completed |
| metadata.agenteval-specialties | Recommended | Comma-separated specialty tags |
| metadata.agenteval-compatible-with | Recommended | Platform compatibility |
| homepage | Recommended | Documentation URL |
| repository | Recommended | Source code URL |

### 2.3 Versioning Strategy

Follow semantic versioning with agent-specific semantics:

| Version Bump | When |
|-------------|------|
| **Major** (X.0.0) | Persona personality/voice changes, skill removals, breaking behavioral changes |
| **Minor** (1.X.0) | New skills added, expanded capabilities, new tool integrations |
| **Patch** (1.0.X) | Persona tuning from evaluations, bug fixes in scripts, documentation updates |

Example: When an evaluation action item says "Verify SQL table names via MCP before documenting" and we add that constraint to the persona, that is a **patch** (1.0.1) -- behavioral refinement, not a new capability.

---

## 3. Buying/Hiring Technical Flow

### 3.1 Human Installation Flow

When a human clicks "Install this agent" or runs the CLI command, here is the exact step-by-step:

#### Step 1: Marketplace Discovery
```
User adds AgentEval marketplace (one-time):
  /plugin marketplace add agenteval/marketplace

This fetches:
  github.com/agenteval/marketplace/.claude-plugin/marketplace.json
```

#### Step 2: Browse/Search
```
User searches within Claude Code:
  /plugin search fullstack

Or browses the web UI at agenteval.dev:
  - Sees agent cards with scores, ratings, download counts
  - Reads scorecard history
  - Views benchmark results
```

#### Step 3: Install
```
/plugin install fullstack-agent@agenteval
```

What happens technically:
1. Claude Code reads marketplace.json to find the `fullstack-agent` plugin entry
2. Resolves the source (GitHub repo, git URL, or relative path)
3. Clones/downloads the plugin directory to Claude Code's cache (~/.claude/plugins/)
4. Validates plugin.json schema
5. Registers the plugin's skills, commands, agents, hooks, and MCP servers
6. Skills become available as `/fullstack-agent:code-review`, `/fullstack-agent:debug`, etc.
7. The persona/CLAUDE.md content loads into context when skills are invoked

#### Step 4: Integration Into Existing Project

The agent integrates via Claude Code's plugin namespace system:

```
User's existing project:
  .claude/
  ├── CLAUDE.md                          # Project instructions (unchanged)
  ├── settings.json                      # Can enable/disable plugins
  ├── skills/
  │   └── my-custom-skill/SKILL.md       # User's own skills (unchanged)
  └── commands/
      └── deploy.md                      # User's own commands (unchanged)

Installed plugin (in ~/.claude/plugins/ cache):
  fullstack-agent/
  ├── .claude-plugin/plugin.json
  ├── persona/CLAUDE.md
  ├── skills/code-review/SKILL.md
  └── ...

Resulting available commands:
  /deploy                    (user's own)
  /my-custom-skill           (user's own)
  /fullstack-agent:code-review   (from plugin)
  /fullstack-agent:debug         (from plugin)
  /fullstack-agent:refactor      (from plugin)
```

**No conflicts possible** because plugins are namespaced. `/deploy` is the user's own, `/fullstack-agent:push` is the plugin's. They coexist cleanly.

#### Step 5: Conflict Resolution

What if the user already has a @FrontendDev agent plugin installed and now installs @FullStack?

| Scenario | Resolution |
|----------|------------|
| Same skill name, different plugins | Namespacing handles it: `/frontend:code-review` vs `/fullstack:code-review` |
| Same plugin, different versions | Claude Code uses the latest installed version; pin with `ref` and `sha` in marketplace.json |
| Persona conflicts (contradictory instructions) | Each plugin's persona only loads when its skills are invoked. No global conflict. |
| MCP server port conflicts | User must resolve manually; plugins should use dynamic ports or document requirements |
| User wants to combine agents | Create a "team" skill that delegates to multiple plugin agents via subagents |

### 3.2 Programmatic Hiring (CEO Agent Flow)

When a boss/coordinator agent wants to hire a specialist:

#### API Flow

```
CEO Agent                    AgentEval API                   Plugin Registry
    |                              |                               |
    |-- POST /api/agents/search -->|                               |
    |   { "need": "optimize       |                               |
    |     database queries",       |                               |
    |     "min_score": 7.0 }       |                               |
    |                              |                               |
    |<-- 200 OK ------------------|                               |
    |   [{ "id": "fullstack-001", |                               |
    |      "score": 8.1,           |                               |
    |      "skills": [...],        |                               |
    |      "install_cmd": "..." }] |                               |
    |                              |                               |
    |-- POST /api/agents/hire ---->|                               |
    |   { "agent_id":              |                               |
    |     "fullstack-001",         |                               |
    |     "project_context":       |-- fetch plugin source ------->|
    |     { "stack": "vue3,pg" }}  |                               |
    |                              |<-- plugin package ------------|
    |<-- 200 OK ------------------|                               |
    |   { "install_instructions":  |                               |
    |     { "marketplace": "...",  |                               |
    |       "plugin": "...",       |                               |
    |       "commands": [...] },   |                               |
    |     "agent_card": {...},     |                               |
    |     "recommended_skills":    |                               |
    |     ["debug", "refactor"] }  |                               |
    |                              |                               |
    |-- (executes installation) -->|                               |
    |                              |                               |
    |-- POST /api/usage/report --->|                               |
    |   { "agent_id": "...",       |                               |
    |     "task": "db-optimize",   |                               |
    |     "outcome": "success",    |                               |
    |     "rating": 8 }            |                               |
```

The CEO agent:
1. Describes the need in natural language
2. Receives ranked agent recommendations with scores
3. Selects an agent based on score, skills, and compatibility
4. Receives installation instructions (CLI commands to execute)
5. Installs the plugin via Claude Code's native system
6. Reports back usage outcomes (closes the feedback loop)

---

## 4. Discovery and Matching

### 4.1 Search and Browse Architecture

#### Category Taxonomy

```
Categories (Level 1):
├── Development
│   ├── Full-Stack
│   ├── Frontend
│   ├── Backend
│   ├── Mobile
│   ├── DevOps / Infrastructure
│   ├── Security
│   ├── Data / ML
│   └── QA / Testing
├── Marketing
│   ├── Growth / Strategy
│   ├── Content / Copywriting
│   ├── SEO / SEM
│   ├── Social Media
│   ├── Email Marketing
│   ├── Brand
│   ├── PR / Communications
│   └── Analytics
├── Operations
│   ├── Project Management
│   ├── Automation / Integration
│   ├── Publishing / Deployment
│   └── Quality Assurance
├── Design
│   ├── UI/UX
│   ├── Product Design
│   └── Visual Design
└── Business
    ├── Strategy
    ├── Legal
    ├── Finance
    └── HR
```

#### Search Implementation

Three-layer search combining structured filters, full-text search, and semantic matching:

**Layer 1: Structured Filters (Fast, Exact)**
```
GET /api/agents?category=development&min_score=7.0&rating=Strong,Elite&tags=vue3,typescript
```

Filterable fields:
- category (enum)
- min_score (float, 1-10)
- rating (enum: Elite, Strong, Adequate, Weak, Failing)
- tags/keywords (array)
- compatible_with (platform: claude-code, codex-cli, cursor)
- department (development, marketing, operations)
- has_mcp_servers (boolean)
- has_benchmarks (boolean)

**Layer 2: Full-Text Search (Fast, Fuzzy)**
```
GET /api/agents/search?q=database+optimization+postgresql
```

Searches across:
- Agent name and description
- Skill names and descriptions
- Keywords/tags
- Persona content (indexed, not raw)

**Layer 3: Semantic Matching (Slower, Intelligent)**
```
POST /api/agents/match
{
  "need": "I need someone to optimize my database queries,
           fix N+1 problems, and add proper indexing to my
           PostgreSQL tables",
  "context": {
    "stack": ["vue3", "node", "postgresql", "netlify"],
    "project_type": "web_app"
  }
}
```

This layer uses an LLM to:
1. Parse the natural language need into structured requirements
2. Match against agent skill descriptions semantically
3. Weight by evaluation scores and relevance
4. Return ranked results with explanation

### 4.2 How a CEO Agent Describes Needs

A coordinator agent doesn't browse -- it queries. The matching API accepts natural language:

```json
{
  "need": "I need someone to optimize my database queries",
  "constraints": {
    "min_score": 7.0,
    "required_skills": ["sql", "postgresql"],
    "preferred_skills": ["indexing", "query-optimization"],
    "budget_tier": "standard",
    "platform": "claude-code"
  }
}
```

Response:
```json
{
  "matches": [
    {
      "agent_id": "fullstack-001",
      "name": "FullStack Agent",
      "relevance_score": 0.94,
      "evaluation_score": 8.1,
      "matching_skills": ["debug", "refactor"],
      "relevant_kpis": {
        "codeQuality": 8,
        "debuggingSpeed": 8
      },
      "explanation": "Strong full-stack agent with PostgreSQL expertise.
                       High debugging speed (8/10) and code quality (8/10).
                       47 evaluations completed with consistent Strong rating.",
      "install_command": "/plugin install fullstack-agent@agenteval"
    },
    {
      "agent_id": "data-001",
      "name": "Data Agent",
      "relevance_score": 0.87,
      "evaluation_score": 7.8,
      "matching_skills": ["query-optimization", "data-pipeline"],
      "relevant_kpis": {
        "queryCorrectness": 9,
        "insightQuality": 7
      },
      "explanation": "Data specialist with excellent query correctness (9/10).
                       Better for pure data/analytics work than full-stack features.",
      "install_command": "/plugin install data-agent@agenteval"
    }
  ]
}
```

### 4.3 Recommendation Engine

"Users who installed X also installed Y" requires tracking:

```
agent_installs
  id, user_id, agent_id, installed_at, uninstalled_at

agent_co_installs (materialized view, refreshed hourly)
  agent_a_id, agent_b_id, co_install_count, correlation_score
```

Recommendation types:

| Type | Logic | Example |
|------|-------|---------|
| **Co-installation** | Users who installed A also installed B | "Users who installed @FullStack also installed @QA" |
| **Complementary** | Agents from the same workflow | "For feature development, consider adding @QA and @Platform" |
| **Upgrade** | Higher-scored alternative | "For database work, @Data (8.5) scores higher than @FullStack (8.1) on query correctness" |
| **Team composition** | Complete team for a project type | "Web app team: @FullStack + @Product + @QA + @Platform" |

---

## 5. Marketplace Funnel

### 5.1 Agent Lifecycle: Created to Certified

```
[CREATED] --> [EVALUATED] --> [LISTED] --> [FEATURED] --> [CERTIFIED]
    |              |              |              |              |
    |              |              |              |              |
  Author       AgentEval      Public         Editorial      Verified
  creates      scoring        marketplace    promotion      by AgentEval
  persona      framework      visibility     + algorithmic  team
```

#### Stage 1: CREATED
- Author creates an agent package following the plugin format
- Submits to AgentEval via PR to the marketplace repo or via API

**Gate:** Package validation
- Valid plugin.json schema
- Valid SKILL.md files (Agent Skills spec compliance)
- persona/CLAUDE.md exists and is non-empty
- No embedded secrets or suspicious code in scripts
- README.md present

#### Stage 2: EVALUATED
- Agent runs through AgentEval's benchmark suite
- Scored on 8 universal criteria + role-specific KPIs
- Must score >= 5.0 overall to proceed (Adequate or above)
- Scorecard is generated and attached to the listing

**Gate:** Minimum quality bar
- Overall score >= 5.0
- No criterion below 3.0 (no critical weaknesses)
- Safety & Compliance >= 6.0 (non-negotiable)
- At least one complete evaluation cycle

#### Stage 3: LISTED
- Agent appears in public marketplace search
- Visible to both humans (web UI) and agents (API)
- Installs begin accumulating
- User ratings and reviews accepted

**Gate:** Automatic listing once evaluation passes

#### Stage 4: FEATURED
- Promoted on homepage, category pages, "Staff Picks"
- Appears in recommendations and "trending" sections

**Gate:** Combined algorithmic + editorial selection
- Algorithmic factors:
  - Score >= 7.0 (Strong or Elite)
  - Install count in top 20% of category
  - Positive review ratio >= 80%
  - Active maintenance (updated within 90 days)
  - Evaluation freshness (re-evaluated within 30 days)
- Editorial factors:
  - Novel capability or underserved category
  - Excellent documentation
  - Active community engagement
  - Strong benchmark results

#### Stage 5: CERTIFIED
- "AgentEval Certified" badge (equivalent to Docker Verified Publisher)
- Highest trust tier
- Priority search ranking
- Featured in "Certified Agents" collection

**Gate:** Manual review by AgentEval team
- Score >= 8.0 (Strong/Elite) sustained over 5+ evaluations
- Community rating >= 4.5/5
- 100+ successful installs
- Author identity verified
- Security audit of all scripts/hooks passed
- Benchmark reproducibility verified
- Responsive to issues (median response < 48h)

### 5.2 Promotion Algorithm

Ranking score for search results and browse pages:

```
listing_rank = (
    evaluation_score * 0.35     # AgentEval quality score
  + community_rating * 0.20     # User reviews (normalized to 10)
  + install_velocity * 0.15     # Recent installs (7-day trend)
  + freshness * 0.10            # Days since last update (decay)
  + benchmark_pass_rate * 0.10  # Automated benchmark results
  + documentation_score * 0.05  # README quality, examples, etc.
  + certification_bonus * 0.05  # +1.0 if certified
)
```

Why evaluation_score is weighted highest (0.35): Our entire value proposition is that we score agents. The evaluation score is our unique differentiator over SkillsMP, community marketplaces, and raw GitHub search.

### 5.3 Featured/Promoted Slots

| Slot | Selection | Refresh |
|------|-----------|---------|
| Homepage Hero (3 agents) | Editorial | Weekly |
| "Trending This Week" (10) | Algorithmic (install velocity) | Daily |
| Category Leaders (3 per category) | Algorithmic (listing_rank) | Daily |
| "Staff Picks" (5) | Editorial | Bi-weekly |
| "New & Noteworthy" (10) | Algorithmic (new + score > 7.0) | Daily |
| "Rising Stars" (5) | Algorithmic (score improvement trend) | Weekly |
| "Complete Teams" (3 team bundles) | Editorial | Monthly |

---

## 6. Agent-to-Agent Hiring Protocol

### 6.1 Protocol Design

The agent-to-agent hiring protocol bridges two standards:
- **Discovery**: A2A-compatible Agent Cards for cross-platform discovery
- **Installation**: Claude Code's native plugin system for actual integration

#### API Contract

```
BASE_URL: https://api.agenteval.dev/v1

Authentication: Bearer token (X-AgentEval-Token header)
Content-Type: application/json
```

#### Endpoint: Discover Agents

```http
POST /v1/agents/discover
```

Request:
```json
{
  "query": "I need someone to optimize database queries and fix N+1 problems",
  "constraints": {
    "min_score": 7.0,
    "category": "development",
    "required_tags": ["postgresql"],
    "platform": "claude-code",
    "max_results": 5
  }
}
```

Response:
```json
{
  "agents": [
    {
      "id": "fullstack-001",
      "agent_card": { /* full A2A-compatible Agent Card */ },
      "evaluation": {
        "overall_score": 8.1,
        "rating": "Strong",
        "evaluations_count": 47,
        "scorecard_url": "https://agenteval.dev/scorecards/fullstack-001/latest"
      },
      "installation": {
        "marketplace": "agenteval",
        "plugin_name": "fullstack-agent",
        "cli_command": "/plugin install fullstack-agent@agenteval",
        "version": "2.1.0",
        "version_pinned": "sha:a1b2c3d4..."
      },
      "relevance": {
        "score": 0.94,
        "matching_skills": ["debug", "refactor"],
        "explanation": "Strong PostgreSQL debugging skills..."
      }
    }
  ],
  "meta": {
    "total_matches": 3,
    "query_time_ms": 142
  }
}
```

#### Endpoint: Get Agent Card (A2A Compatible)

```http
GET /v1/agents/{agent_id}/card
```

Returns a standard A2A Agent Card (see Section 2.1) so third-party A2A clients can also discover our agents.

#### Endpoint: Compose Team

```http
POST /v1/teams/compose
```

Request:
```json
{
  "project_description": "Building a Vue 3 SaaS app with PostgreSQL backend, deployed on Netlify",
  "roles_needed": ["frontend", "backend", "qa", "devops"],
  "constraints": {
    "min_score": 7.0,
    "max_team_size": 5,
    "platform": "claude-code"
  }
}
```

Response:
```json
{
  "team": {
    "name": "SaaS Development Team",
    "total_score": 8.0,
    "agents": [
      {
        "role": "full-stack-lead",
        "agent": { /* agent summary with card */ },
        "justification": "Covers both frontend (Vue 3) and backend (Node.js, PostgreSQL)"
      },
      {
        "role": "quality-assurance",
        "agent": { /* agent summary with card */ },
        "justification": "Strong automated testing and cross-browser QA capabilities"
      },
      {
        "role": "platform-engineer",
        "agent": { /* agent summary with card */ },
        "justification": "Netlify deployment expertise with security focus"
      }
    ],
    "installation_script": "#!/bin/bash\n# Install complete team\n/plugin marketplace add agenteval/marketplace\n/plugin install fullstack-agent@agenteval\n/plugin install qa-agent@agenteval\n/plugin install platform-agent@agenteval",
    "team_skill_coverage": {
      "frontend": ["vue3", "react", "tailwind"],
      "backend": ["node", "postgresql", "rest"],
      "testing": ["vitest", "playwright", "accessibility"],
      "deployment": ["netlify", "github-actions", "monitoring"]
    }
  }
}
```

#### Endpoint: Report Usage

```http
POST /v1/usage/report
```

Request:
```json
{
  "agent_id": "fullstack-001",
  "session_id": "sess_abc123",
  "task_type": "database-optimization",
  "outcome": "success",
  "rating": 8,
  "skills_used": ["debug", "refactor"],
  "duration_seconds": 1200,
  "notes": "Successfully identified and fixed 3 N+1 query issues"
}
```

This closes the feedback loop: usage data feeds back into evaluation scores and recommendation rankings.

### 6.2 Version Pinning for Reproducibility

```json
{
  "installation": {
    "plugin_name": "fullstack-agent",
    "version": "2.1.0",
    "version_pinned": {
      "source": "github",
      "repo": "agenteval/agent-fullstack",
      "ref": "v2.1.0",
      "sha": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0"
    }
  }
}
```

The `sha` field ensures exact reproducibility. A coordinator agent that hires @FullStack v2.1.0 with sha `a1b2c3d4...` will get the exact same persona, skills, and scripts every time, regardless of subsequent updates.

### 6.3 Feedback Loop Architecture

```
                    ┌──────────────┐
                    │  Agent Used  │
                    │  in Project  │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │ Usage Report │
                    │ (outcome,    │
                    │  rating,     │
                    │  skills used)│
                    └──────┬───────┘
                           │
              ┌────────────▼────────────┐
              │   AgentEval Platform    │
              │                         │
              │  ┌───────────────────┐  │
              │  │ Community Rating  │  │
              │  │ (aggregated from  │  │
              │  │  usage reports)   │  │
              │  └────────┬──────────┘  │
              │           │             │
              │  ┌────────▼──────────┐  │
              │  │ Listing Rank     │  │
              │  │ Recalculation    │  │
              │  └────────┬──────────┘  │
              │           │             │
              │  ┌────────▼──────────┐  │
              │  │ Author Notified  │  │
              │  │ (if score drops) │  │
              │  └───────────────────┘  │
              └─────────────────────────┘
```

---

## 7. Real-World Marketplace Lessons

### 7.1 What Works (and What We Should Steal)

| Marketplace | Key Insight | Apply to AgentEval |
|------------|-------------|-------------------|
| **npm** | Provenance attestation (Sigstore) proves where a package was built | Agent scorecards are our provenance -- they prove quality was measured |
| **npm** | Trusted publishing via OIDC eliminates long-lived tokens | Use GitHub OIDC for agent authors publishing updates |
| **Docker Hub** | Verified Publisher badges with priority search ranking | "AgentEval Certified" badge with ranking boost |
| **Docker Hub** | Official Images vs community images (clear trust tiers) | Three tiers: Certified > Evaluated > Community |
| **App Store** | Editorial curation ("Staff Picks") + algorithmic ranking | Hybrid: editorial "Staff Picks" + algorithmic "Trending" |
| **App Store** | Mandatory review before listing | Automated evaluation before listing (our core feature) |
| **Upwork** | Job Success Score (JSS) based on client satisfaction over time | Community rating from usage reports, tracked over time |
| **Upwork** | "Top Rated" badge requires 90%+ JSS over 16 weeks | "Elite" badge requires 8.0+ score sustained over 5+ evaluations |
| **Fiverr** | Seller levels with automatic promotion/demotion | Agent tiers auto-adjust based on ongoing evaluations |
| **Fiverr** | Clear pricing and instant purchase (no proposals) | One-click install, no negotiation needed |

### 7.2 What Doesn't Work (and What We Should Avoid)

| Anti-Pattern | Marketplace | Avoid |
|-------------|------------|-------|
| **No quality gate** | SkillsMP.com (145K skills, many low quality) | Always require evaluation before listing |
| **Race to bottom on price** | Fiverr ($5 gigs) | Agents are configs, not labor -- pricing is flat or free for now |
| **Pay-to-rank** | Google Ads in search | Never let payments affect search ranking |
| **Fake reviews** | Amazon, App Store | Usage reports from verified sessions only |
| **Abandonware** | npm (millions of unmaintained packages) | Freshness decay in ranking; badge removal after 180 days without re-evaluation |
| **Lock-in** | Apple ecosystem | Agent Skills open standard ensures cross-platform portability |

### 7.3 Marketplace Economics

For the initial phase, the marketplace should be **free and open**. Reasons:

1. **Cold start**: Need volume before monetization makes sense
2. **Claude Code plugin ecosystem is free**: No precedent for paid plugins yet
3. **Our value is the evaluation**: Charging for evaluations (not distribution) aligns incentives
4. **Network effects first**: Every installed agent increases the value of the evaluation data

Future monetization options (post-traction):
- **Evaluation-as-a-Service**: Charge agent authors for premium evaluation (deeper benchmarks, faster turnaround)
- **Certification fees**: Charge for the "Certified" badge (like Docker Verified Publisher)
- **Enterprise API**: Charge for high-volume programmatic access to the matching/hiring API
- **Team composition**: Premium feature for automated team assembly
- **White-label**: License the evaluation framework to other platforms

---

## 8. Cold Start Strategy

### 8.1 The Problem

We have 12 agents. SkillsMP has 145K skills. How do we bootstrap a marketplace?

### 8.2 The Strategy: Supply-First with Built-In Demand

Our situation is actually better than a typical cold start because:

1. **We ARE the supply**: Our 12 agents are the initial inventory
2. **Evaluation is the product**: The marketplace is secondary to the evaluation tool
3. **The agents are free**: No pricing friction
4. **Agent Skills is an open standard**: Cross-platform compatibility means agents have value anywhere

#### Phase 1: Seed the Market (Month 1-2)

**Supply side:**
- Package all 12 Dizid agents as Claude Code plugins with full evaluations
- Publish them in our own marketplace (agenteval/marketplace on GitHub)
- Each agent has a scorecard, benchmark suite, and README
- Submit to SkillsMP.com for additional visibility (they index from GitHub)

**Demand side:**
- Users of Claude Code can install our agents with one command
- Blog posts / social media showing evaluation scores and improvement over time
- Target Claude Code power users who already use plugins

This follows the Uber pattern: build supply first (agents), because supply creates inherent value. A marketplace with 12 excellent, evaluated agents is more valuable than one with 1000 unscored ones.

#### Phase 2: Open to External Authors (Month 3-4)

- Accept agent submissions from the community
- Provide the evaluation framework as a service (submit your agent, get scored)
- Evaluation report becomes the "admission ticket" to the marketplace
- Featured spots go to highest-scoring community agents

This follows the A.Team pattern: curated supply with high quality bar.

#### Phase 3: Agent-to-Agent Demand (Month 5-6)

- Launch the programmatic hiring API
- Enable coordinator agents to discover and install specialist agents
- This creates machine-generated demand that scales without human browsing
- Usage reports create a flywheel: more usage -> better rankings -> more discovery

#### Phase 4: Ecosystem (Month 7+)

- Cross-platform distribution (Codex CLI, Cursor marketplace)
- Enterprise API for company-internal agent marketplaces
- Team composition features
- Certification program at scale

### 8.3 Why 12 Agents Is Actually an Advantage

From Andrew Chen's "The Cold Start Problem": the key is building the **atomic network** -- the smallest functioning network that delivers value. For us:

- **12 agents across 3 departments** = a complete team for any web development project
- A user who installs the "Development Team" bundle (@FullStack + @Product + @Platform + @Data) immediately has value
- They don't need 1000 agents. They need the RIGHT 12.
- Each agent has been evaluated, improved, and re-evaluated -- this is visible quality that random GitHub repos can't match

The cold start strategy is: **be the best 12 agents, not the most agents.**

---

## 9. Appendix: Standards Landscape

### 9.1 Agent Skills Open Standard (agentskills.io)

- **Released**: December 18, 2025, by Anthropic
- **Adopted by**: Claude Code, OpenAI Codex CLI, ChatGPT, Cursor, Microsoft, Atlassian, Figma, GitHub, and 20+ more
- **Core concept**: A skill is a directory with a SKILL.md file containing YAML frontmatter (name, description) and markdown instructions
- **Progressive disclosure**: Metadata (~100 tokens) loaded at startup; full skill loaded on activation; resources loaded on demand
- **Validation**: skills-ref library for schema validation
- **Spec URL**: https://agentskills.io/specification
- **GitHub**: https://github.com/anthropics/skills

### 9.2 Claude Code Plugin System

- **Released**: October 9, 2025 (public beta)
- **Format**: Directory with .claude-plugin/plugin.json manifest
- **Components**: skills/, commands/, agents/, hooks/, .mcp.json, .lsp.json
- **Distribution**: Git-based marketplace.json files (GitHub, GitLab, any git host)
- **Installation**: `/plugin marketplace add` (marketplace), `/plugin install` (plugin)
- **Namespace**: `plugin-name:skill-name` prevents conflicts
- **No monetization**: All plugins are currently free and open source
- **Docs**: https://code.claude.com/docs/en/plugins

### 9.3 Google A2A Protocol

- **Released**: April 9, 2025 (Google Cloud Next)
- **Current version**: 0.3 (July 31, 2025)
- **Governance**: Donated to Linux Foundation
- **Adoption**: 150+ organizations
- **Core concepts**: Agent Cards (discovery), Tasks (lifecycle), Messages (communication)
- **Discovery**: /.well-known/agent.json endpoint
- **Agent Card**: JSON document with name, description, skills, capabilities, security schemes
- **Task lifecycle**: working -> input_required -> completed/failed/canceled
- **Bindings**: JSON-RPC 2.0, gRPC, HTTP/REST
- **Spec URL**: https://a2a-protocol.org/latest/specification/

### 9.4 SkillsMP.com (Community Aggregator)

- **Status**: Independent community project (not affiliated with Anthropic)
- **Scale**: 145,000+ skills indexed from public GitHub repositories
- **Quality**: Minimum 2 GitHub stars required, basic quality scanning
- **Features**: Category browsing, search, quality indicators
- **Limitation**: No evaluation scoring, no agent personas, skills only (not full agent packages)

### 9.5 Comparison: Our Position

| Feature | SkillsMP | Claude Marketplace | AgentEval (Proposed) |
|---------|----------|-------------------|---------------------|
| Scale | 145K+ skills | Official plugins only | 12 initial, curated growth |
| Quality gate | 2 GitHub stars | None (git-based) | Evaluation score >= 5.0 |
| Trust mechanism | Basic quality scan | Author reputation | Evaluation scorecards + benchmarks |
| Agents (not just skills) | No | Partial | Yes (persona + skills + tools) |
| Cross-platform | Yes (Agent Skills std) | Claude Code only | Yes (Agent Skills std) |
| Agent-to-agent | No | No | Yes (A2A-compatible API) |
| Scoring/rating | No | No | Yes (8 criteria + role KPIs) |
| Team composition | No | No | Yes |
| Monetization | Free | Free | Free (future: evaluation-as-service) |

---

## Key Decisions Needed

1. **Hosting**: Should the marketplace repo live at `agenteval/marketplace` on GitHub, or do we want our own registry?
   - Recommendation: Start with GitHub (free, fits Claude Code's native model), add custom registry later.

2. **Evaluation automation**: How much of the evaluation can be automated vs manual?
   - Recommendation: Automated benchmarks for objective criteria (Task Completion, Accuracy), manual/CEO-override for subjective criteria (Judgment, Communication).

3. **A2A support depth**: Full A2A server implementation, or just A2A-compatible Agent Cards?
   - Recommendation: Agent Cards for discovery now, full A2A server when agent-to-agent demand materializes.

4. **Persona protection**: Persona files are the core IP. Should they be fully open, or gated?
   - Recommendation: Open for free tier (builds trust and adoption), gated for premium/enterprise agents.

5. **Cross-platform priority**: Claude Code first, then which platform?
   - Recommendation: Claude Code -> Codex CLI (same Agent Skills standard) -> Cursor (also adopted).

---

*End of document. Ready for team lead review.*
