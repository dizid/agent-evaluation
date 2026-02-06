---
description: Weekly deep evaluation of an agent's performance
allowed-tools: Read, Grep, Glob, Bash, WebSearch
---

Comprehensive weekly evaluation of an agent. Analyzes all recent work and produces a detailed scorecard with trends and improvement actions.

## Instructions

The user will specify which agent, e.g., `/evaluate-agent @FullStack`.

### Step 1: Load framework
Read `docs/agent-evaluations/FRAMEWORK.md` for criteria and role-specific KPIs.

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
   - @QA: `tests/`, `*.test.*`
   - @Content/@Brand/@Growth: marketing materials, copy
   - @Integration: exchange adapters, webhook handlers
   - @Product: UI components, design specs

3. **Previous scorecards** (if any):
```
Read docs/agent-evaluations/scorecards/[agent]-*.md
```

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
1. [Specific change to CLAUDE-TEAM.md persona]
2. [Tool/workflow improvement]
3. [Training data or example to add]
```

### Step 5: Ask for CEO input
Present scorecard and ask: "Any scores you'd adjust? Should I apply the action items to CLAUDE-TEAM.md?"

### Step 6: Save and optionally apply
- Save scorecard to `docs/agent-evaluations/scorecards/[agent]-[date].md`
- If CEO approves, apply action items to `CLAUDE-TEAM.md` agent persona
