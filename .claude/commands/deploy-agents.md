---
description: Sync agent files to ~/.claude/agents/ and regenerate the agent reference table in CLAUDE.md with live scores
allowed-tools: Bash, Read, Edit, Glob, Write
---

Deploy all Dizid agent definitions from this project to the global `~/.claude/agents/` directory, embed live performance scores, and update the agent reference table in `~/.claude/CLAUDE.md`.

## Instructions

### Step 1: Fetch live scores from API

Fetch all agent scores from the production API:

```bash
SERVICE_KEY=$(grep '^SERVICE_KEY=' /home/marc/DEV/claude/agent-evaluation/.env | cut -d= -f2)
curl -s "https://hirefire.dev/api/agents?status=all" \
  -H "X-Service-Key: $SERVICE_KEY" \
  -H "X-Org-Slug: dizid"
```

Parse the JSON response. The response shape is `{ agents: [...], total: N }`. Each agent has:
- `id` (matches filename without .md)
- `overall_score` (number or null, comes as string — use Number())
- `rating_label` (Elite/Strong/Adequate/Weak/Failing or null)
- `confidence` (Established/Early/New or null)
- `trend` (up/down/stable or null)
- `eval_count` (number)

Also fetch the latest action item for each agent that has evaluations:
```bash
# For each agent with eval_count > 0:
curl -s "https://hirefire.dev/api/agents/${AGENT_ID}?include=action_items" \
  -H "X-Service-Key: $SERVICE_KEY" \
  -H "X-Org-Slug: dizid"
```

The response has `{ action_items: [...] }`. Take the first unapplied item (where `applied` is false), or the most recent applied item if all are applied. Use its `action_item` text.

Store all this data to use in subsequent steps.

### Step 2: Embed scores in agent persona files

For each agent file in `/home/marc/DEV/claude/agent-evaluation/agents/*.md`:

1. Match the file to API data using the filename (e.g. `fullstack.md` → agent id `fullstack`)
2. Look for an existing `## Current Performance` section. If found, replace it entirely. If not found, insert it right after the first `# @Name` heading line.
3. Format the section based on whether the agent has scores:

**If the agent has evaluations (overall_score is not null):**

```markdown
## Current Performance
- **Score:** {score}/10 ({rating_label}) — {confidence} ({eval_count} evals)
- **Trend:** {trend_arrow} {trend_label}
- **Action Item:** {latest_action_item_text}
- *Updated: {YYYY-MM-DD} via /deploy-agents*
```

Where:
- `{trend_arrow}` = ↑ for up, ↓ for down, — for stable/null
- `{trend_label}` = Up, Down, Stable
- Omit the Action Item line if there is no action item

**If the agent has no evaluations:**

```markdown
## Current Performance
- **Score:** Unrated — no evaluations yet
- *Updated: {YYYY-MM-DD} via /deploy-agents*
```

**IMPORTANT**: The `## Current Performance` section must go between the `# @Name — Role` heading and the next `##` section (typically `**Who:**` paragraph or `## Behavior Rules`). Insert a blank line before and after it.

### Step 3: Sync agent files

Copy all agent .md files (now with embedded scores) to `~/.claude/agents/`:

```bash
for f in /home/marc/DEV/claude/agent-evaluation/agents/*.md; do
  cp "$f" "/home/marc/.claude/agents/$(basename "$f")"
done
```

### Step 4: Regenerate CLAUDE.md agent table with scores

1. Read each agent file in `/home/marc/DEV/claude/agent-evaluation/agents/*.md`
2. Extract from each file:
   - Agent name (from the first heading like `# @Name — Role`)
   - Department (from heading text or frontmatter)
   - Role (from the heading text after the em dash)
3. Combine with the score data fetched in Step 1
4. Build a markdown reference table with Score and Trend columns:

```markdown
## Agents (18)

| Agent | Dept | Role | Score | Trend |
|-------|------|------|-------|-------|
| @FullStack | Dev | Full-stack developer | 7.6 Strong | ↑ |
| @Product | Dev | Product designer + UX researcher | 7.0 Strong | — |
| @Content | Marketing | Content publisher + strategist | 8.0 Elite | — |
| @Data | Dev | Analytics + ML engineer | 5.6 Adequate | ↓ |
...etc (all 18 agents, sorted by department then name)...

Full behavior rules and personas: `~/.claude/agents/[name].md`
When acting as an agent, read their file first for detailed instructions.
```

For agents with no score, show `—` in the Score column and `—` for Trend.

5. Read `~/.claude/CLAUDE.md`
6. Find the section that starts with `## Agents`
7. Replace everything from that heading up to the next major `##` section (like `## Coordination Protocols` or `## Company Context`) with the new table
8. Save the updated CLAUDE.md

**IMPORTANT**: Use the Read and Edit tools to update `~/.claude/CLAUDE.md` — do NOT generate a bash script for this step.

### Step 5: Report

Show:
- Count of agents synced to `~/.claude/agents/`
- The generated agent reference table (with scores)
- Count of agents with scores vs unrated
- Confirmation that `~/.claude/CLAUDE.md` was updated
- Reminder: agents are available in all projects immediately via the Task tool, now with live performance data
