---
description: Weekly deep evaluation of an agent's performance
allowed-tools: Read, Grep, Glob, Bash, WebSearch, mcp__Neon__run_sql
---

Comprehensive weekly evaluation of an agent. Analyzes all recent work and produces a detailed scorecard with trends and improvement actions.

## Instructions

The user will specify which agent, e.g., `/evaluate-agent @FullStack`.

### Step 1: Load framework
Read `/home/marc/DEV/claude/agent-evaluation/framework/FRAMEWORK.md` for criteria and role-specific KPIs.

### Step 2: Gather evidence
Analyze the agent's recent work:

1. **Git history** (last 7 days):
```bash
git log --oneline --since="7 days ago" --all
```

2. **Files modified** relevant to this agent's domain:
   - @FullStack: `netlify/functions/`, `src/`
   - @Platform: `netlify.toml`, `.env`, deploy configs
   - @Data: `scripts/train-*.mjs`, `scripts/backfill-*`, ML files
   - @Content/@Brand/@Growth/@SEO/@Sales: `content/`, `brand/`, `marketing/`
   - @CodeImprover/@SecurityReviewer: code review tasks (no specific files)
   - @BacktestQuant/@RiskQuant/@RegimeDetector/@EdgeMonitor: `scripts/`, ML models
   - @Ops/@Email: coordination, automation
   - @Product: UI components, design specs
   - @AI: prompts, LLM integrations

3. **Previous scorecards** (from database):
Query the API or database for the agent's evaluation history.

### Step 3: Deep evaluation
For each criterion, provide:
- Score (1-10)
- Evidence (specific file, commit, or conversation reference)
- Comparison to previous score (if available): improved / stable / declined

### Step 4: Present full scorecard

```
## Weekly Evaluation: @[AgentName]
Period: [start date] — [end date]
Tasks completed: [count]

### Universal Scores (1-10)
| Criterion | Score | Prev | Trend | Evidence |
|-----------|-------|------|-------|----------|
| Task Completion | X | X | ↑↓→ | [reference] |
| Accuracy | X | X | ↑↓→ | [reference] |
| Efficiency | X | X | ↑↓→ | [reference] |
| Judgment | X | X | ↑↓→ | [reference] |
| Communication | X | X | ↑↓→ | [reference] |
| Domain Expertise | X | X | ↑↓→ | [reference] |
| Autonomy | X | X | ↑↓→ | [reference] |
| Safety & Compliance | X | X | ↑↓→ | [reference] |
| **Avg** | **X.X** | **X.X** | | |

### Role KPIs (1-10)
| KPI | Score | Prev | Trend | Evidence |
|-----|-------|------|-------|----------|
| [KPI 1] | X | X | ↑↓→ | [reference] |
| [KPI 2] | X | X | ↑↓→ | [reference] |
| [KPI 3] | X | X | ↑↓→ | [reference] |
| [KPI 4] | X | X | ↑↓→ | [reference] |
| **Avg** | **X.X** | **X.X** | | |

### Overall: X.X/10 — [Elite/Strong/Adequate/Weak/Failing]
Previous: X.X/10 | Change: +/-X.X

### Highlights
- **Best work this week:** [specific task/commit]
- **Biggest improvement:** [criterion that improved most]
- **Needs attention:** [criterion that declined or is lowest]

### Action Items (max 3)
1. [Specific change to agents/[agent-id].md file]
2. [Tool/workflow improvement]
3. [Training data or example to add]
```

### Step 5: Ask for CEO input
Present scorecard and ask: "Any scores you'd adjust? Should I run /apply-action-items to write improvements into agent files?"

### Step 6: Submit evaluation

#### 6a: Prepare payload
Build the evaluation payload with:
- `agent_id`: The agent's ID (e.g., "fullstack", "platform")
- `scores`: Object with all criterion IDs and scores (1-10)
- `evaluator_type`: "manual"
- `task_description`: Brief summary of the week's work
- `top_strength`: The highest-scoring criterion or most impressive work
- `top_weakness`: The lowest-scoring criterion or area needing improvement
- `action_item`: The primary action item (first one from the list above)
- `project`: The project name (e.g., "agent-evaluation")

#### 6b: Submit to API
```bash
curl -s "https://hirefire.dev/api/evaluations" \
  -H "content-type: application/json" \
  -H "X-Service-Key: $SERVICE_KEY" \
  -d '{
    "agent_id": "[agent_id]",
    "scores": {
      "task_completion": X,
      "accuracy": X,
      "efficiency": X,
      "judgment": X,
      "communication": X,
      "domain_expertise": X,
      "autonomy": X,
      "safety": X,
      "[kpi_1_id]": X,
      "[kpi_2_id]": X,
      "[kpi_3_id]": X,
      "[kpi_4_id]": X
    },
    "evaluator_type": "manual",
    "task_description": "[task summary]",
    "top_strength": "[strength]",
    "top_weakness": "[weakness]",
    "action_item": "[primary action item]",
    "project": "[project_name]"
  }'
```

#### 6c: Apply improvements (if CEO approves)
If the CEO approves the action items, run `/apply-action-items` to write improvements into the agent's persona file and sync globally.
