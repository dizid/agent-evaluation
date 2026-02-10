---
description: Apply unapplied action items from evaluations to agent .md files
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
---

Apply pending action items from evaluations to agent source `.md` files. This closes the evaluation-to-improvement loop: evaluate agent -> identify weakness -> generate action item -> apply to persona -> re-evaluate.

## Instructions

### Step 1: Fetch unapplied action items

Query the database for all pending action items:

```
Use mcp__Neon__run_sql:
SELECT e.id AS eval_id, e.agent_id, e.action_item, e.top_weakness, e.overall, e.created_at,
       a.name AS agent_name, a.source_path, a.source_type
FROM evaluations e
JOIN agents a ON a.id = e.agent_id
WHERE e.action_item IS NOT NULL
  AND (e.applied IS NULL OR e.applied = false)
  AND a.status = 'active'
ORDER BY e.agent_id, e.created_at ASC
```

If zero rows returned, report "No pending action items. All caught up!" and stop.

### Step 2: Show summary and confirm

Display what will be applied:

```
## Pending Action Items ([count] total)

| Agent | Action Item | Eval # | Score |
|-------|-------------|--------|-------|
| @Name | action text (truncated to 60 chars)... | #eval_id | X/10 |
```

Ask the user: **"Apply these [N] action items to agent files? (yes/no)"**

Wait for explicit confirmation before proceeding. If the user says no, stop.

### Step 3: Apply each action item

For each action item, grouped by agent:

1. **Determine the file path:**
   - All agents: `/home/marc/DEV/claude/agent-evaluation/agents/[agent_id].md`
   - If the file doesn't exist, skip this item and report: "Skipped: no source file for [agent_name]"

2. **Read** the agent's `.md` file

3. **Find** the `## Behavior Rules` section. If not found, look for `## Behavior rules` (lowercase). If neither exists, skip and report.

4. **Check for duplicates:** Search existing behavior rules for the action item text. If >70% of the words in the action item already appear in a single existing rule, skip insertion and report: "Skipped: similar rule already exists for [agent_name]"

5. **Insert** the new rule as the FIRST bullet point under `## Behavior Rules`:
   ```
   ## Behavior Rules

   - [action item text]
   - [existing rule 1]
   - [existing rule 2]
   ```

6. **Write** the modified file back using the Edit tool (preferred) or Write tool

### Step 4: Mark items as applied in database

For each successfully applied (or duplicate-skipped) action item, mark it in the database:

```
Use mcp__Neon__run_sql:
UPDATE evaluations SET applied = true, applied_at = NOW() WHERE id = [eval_id]
```

Run one UPDATE per item (Neon MCP only accepts single statements).

### Step 5: Auto-deploy

Run the `/deploy-agents` skill to sync updated agent files to `~/.claude/agents/` and regenerate the CLAUDE.md reference table.

### Step 6: Report results

Show a summary:

```
## Write-Back Complete

| Agent | Action Item | Eval # | Status |
|-------|-------------|--------|--------|
| @Name | text...     | #123   | Applied |
| @Name | text...     | #456   | Skipped (duplicate) |
| @Name | text...     | #789   | Skipped (no file) |

Applied: [N] | Skipped: [M]
Files updated: [list of filenames]
Deployed to: ~/.claude/agents/ + CLAUDE.md reference table updated
```

## Notes

- This command runs LOCALLY in Claude Code -- it has full filesystem access
- The Neon project ID is `calm-cherry-13678492`
- All agent files live in `agents/[id].md` (single source of truth)
- Always ask for confirmation before making changes
- Mark items as applied even if skipped as duplicate (prevents re-processing)
- The `applied` and `applied_at` columns are added by migration 009
