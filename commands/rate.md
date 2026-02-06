---
description: Quick agent evaluation - auto-score after a task
allowed-tools: Read, Grep, Glob
---

Rate an agent's performance in the current conversation. Auto-scores all criteria, CEO can override.

## Instructions

The user will specify which agent to rate, e.g., `/rate @FullStack` or `/rate @Platform`.

### Step 1: Load the evaluation framework
Read `docs/agent-evaluations/FRAMEWORK.md` to get the criteria and role-specific KPIs for this agent.

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
**Action Item:** [one specific improvement for CLAUDE-TEAM.md]
```

Formula: Overall = (Universal Avg × 0.6) + (Role Avg × 0.4)

### Step 5: Ask for overrides
After presenting, ask: "Any scores you'd adjust?"

If CEO provides overrides, recalculate and present final score.

### Step 6: Save (if CEO approves)
Save the scorecard to `docs/agent-evaluations/scorecards/[agent]-[date].md`
