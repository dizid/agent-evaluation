---
description: Quick agent evaluation - auto-score after a task
allowed-tools: Read, Grep, Glob, WebFetch, Bash, mcp__Neon__run_sql
---

Rate an agent's performance in the current conversation and POST the evaluation to the AgentEval dashboard.

## Instructions

The user will specify which agent to rate, e.g., `/rate @FullStack` or `/rate @Platform`.

### Step 1: Load the evaluation framework

Read `/home/marc/DEV/claude/agent-evaluation/framework/FRAMEWORK.md` to get the criteria and role-specific KPIs for this agent.

### Step 2: Review this conversation

Analyze the current conversation for work done by the specified agent persona. Look at:
- What was the task?
- Was it completed fully?
- Were there errors or corrections needed?
- How many steps/messages did it take?
- Were the right tools used?
- Was communication clear and concise?
- Were any risky actions taken without checks?

### Step 3: Auto-score

Score each criterion 1-10 with a brief justification (max 10 words per note).

### Step 4: Present the scorecard

Output format:

```
## @[AgentName] Rating — [date]
Task: [brief description]

### Universal (1-10)
| Criterion | Score | Note |
|-----------|-------|------|
| Task Completion | X | [brief] |
| Accuracy | X | [brief] |
| Efficiency | X | [brief] |
| Judgment | X | [brief] |
| Communication | X | [brief] |
| Domain Expertise | X | [brief] |
| Autonomy | X | [brief] |
| Safety & Compliance | X | [brief] |
| **Avg** | **X.X** | |

### Role KPIs (1-10)
| KPI | Score | Note |
|-----|-------|------|
| [KPI 1] | X | [brief] |
| [KPI 2] | X | [brief] |
| [KPI 3] | X | [brief] |
| [KPI 4] | X | [brief] |
| **Avg** | **X.X** | |

### Overall: X.X/10 — [Elite/Strong/Adequate/Weak/Failing]

**Top Strength:** [one line]
**Top Weakness:** [one line]
**Action Item:** [one specific improvement]
```

Formula: Overall = (Universal Avg × 0.6) + (Role Avg × 0.4)

### Step 5: Ask for overrides

After presenting, ask: "Any scores you'd adjust?"

If CEO provides overrides, recalculate and present final score.

### Step 6: Submit to dashboard

Once CEO approves (or says "looks good" / "submit" / "ok"), POST the evaluation to the AgentEval API.

Detect the project name from git:
```bash
basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown"
```

Build the scores object using the criterion IDs as keys:
- task_completion, accuracy, efficiency, judgment, communication, domain_expertise, autonomy, safety_compliance
- Plus the agent's role-specific KPI IDs (e.g., code_quality, first_pass_success, etc.)

Submit via curl:
```bash
curl -s "https://hirefire.dev/api/evaluations" \
  -H "content-type: application/json" \
  -H "X-Service-Key: $SERVICE_KEY" \
  -d '{
    "agent_id": "[agent_id]",
    "scores": { ... },
    "evaluator_type": "manual",
    "task_description": "[task summary]",
    "top_strength": "[strength]",
    "top_weakness": "[weakness]",
    "action_item": "[action]",
    "project": "[project_name]"
  }'
```

Show the response and link: `https://hirefire.dev/agent/[agent_id]`
