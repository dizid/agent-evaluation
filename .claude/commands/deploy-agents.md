---
description: Sync agent files to ~/.claude/agents/ and regenerate the agent reference table in CLAUDE.md
allowed-tools: Bash, Read, Edit, Glob
---

Deploy all Dizid agent definitions from this project to the global `~/.claude/agents/` directory and update the agent reference table in `~/.claude/CLAUDE.md`.

## Instructions

### Step 1: Sync agent files

Copy all agent .md files to `~/.claude/agents/`:

```bash
for f in /home/marc/DEV/claude/agent-evaluation/agents/*.md; do
  cp "$f" "/home/marc/.claude/agents/$(basename "$f")"
done
```

### Step 2: Regenerate CLAUDE.md agent table

1. Read each agent file in `/home/marc/DEV/claude/agent-evaluation/agents/*.md`
2. Extract from each file:
   - Agent name (from the first heading like `# @Name — Role` or `# @Name`)
   - Department (from the heading text)
   - Role (from the heading text after the em dash)
3. Build a markdown reference table:

```markdown
## Agents

| Agent | Dept | Role |
|-------|------|------|
| @FullStack | Dev | Full-stack developer |
| @Product | Dev | Product designer + UX researcher |
...etc...

Full behavior rules and personas: `~/.claude/agents/[name].md`
When acting as an agent, read their file first for detailed instructions.
```

4. Read `~/.claude/CLAUDE.md`
5. Find the section that starts with `## Agents` or `## Development Department` (whichever comes first)
6. Replace everything from that heading up to the next major `##` section (like `## Coordination Protocols` or `## Company Context`) with the new compact table
7. Save the updated CLAUDE.md

**IMPORTANT**: Use the Read and Edit tools to update `~/.claude/CLAUDE.md` — do NOT generate a bash script for this step.

### Step 3: Report

Show:
- Count of agents synced to `~/.claude/agents/`
- The generated agent reference table
- Confirmation that `~/.claude/CLAUDE.md` was updated
- Reminder: agents are available in all projects immediately via the Task tool
