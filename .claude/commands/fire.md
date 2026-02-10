---
description: Fire an agent — remove from database and clean up files
allowed-tools: Read, Bash, Grep, Glob
---

Fire an underperforming agent from the Dizid staffing agency. Removes the agent from the database and cleans up files.

## Instructions

The user will specify the agent to fire, e.g., `/fire @Designer` or `/fire designer`.

### Step 1: Confirm the agent exists

Extract the agent ID from the user's input (strip @ prefix, lowercase).

Use the Neon MCP to look up the agent:
```
Use mcp__Neon__run_sql:
SELECT id, name, department, overall_score, eval_count, rating_label
FROM agents WHERE id = '[agent_id]'
```

If not found, tell the user and stop.

### Step 2: Show agent status and confirm

Display the agent's current stats:
```
## Firing: @[Name]
- Department: [department]
- Score: [overall_score]/10 ([rating_label])
- Evaluations: [eval_count]
```

Ask: "Confirm firing @[Name]? This will delete all their evaluations. (yes/no)"

**Wait for explicit confirmation before proceeding.**

### Step 3: Remove from database

Delete in order (foreign key constraints):

```
Use mcp__Neon__run_sql:
DELETE FROM evaluations WHERE agent_id = '[agent_id]';
```

```
Use mcp__Neon__run_sql:
DELETE FROM criteria WHERE '[agent_id]' = ANY(applies_to)
AND NOT EXISTS (
  SELECT 1 FROM unnest(applies_to) AS a WHERE a != '[agent_id]'
  AND EXISTS (SELECT 1 FROM agents WHERE id = a)
);
```

```
Use mcp__Neon__run_sql:
DELETE FROM agents WHERE id = '[agent_id]';
```

### Step 4: Clean up files

Remove the agent definition files:
```bash
rm -f /home/marc/DEV/claude/agent-evaluation/agents/[agent_id].md
rm -f /home/marc/.claude/agents/[agent_id].md
```

### Step 5: Auto-deploy to update global reference

Run the `/deploy-agents` skill to regenerate the CLAUDE.md reference table without this agent.

### Step 6: Confirm

Show:
- Agent removed from database
- [N] evaluations deleted
- Agent files removed (local + global)
- CLAUDE.md reference table updated
