---
description: Sync agent files to ~/.claude/agents/ (makes them available globally)
allowed-tools: Bash, Read, Glob
---

Deploy all Dizid agent definitions from this project to the global `~/.claude/agents/` directory.

## Instructions

### Step 1: Sync agent files

Copy all agent .md files (excluding CLAUDE-TEAM.md) to `~/.claude/agents/`:

```bash
for f in /home/marc/DEV/claude/agent-evaluation/agents/*.md; do
  basename=$(basename "$f")
  if [ "$basename" != "CLAUDE-TEAM.md" ]; then
    cp "$f" "/home/marc/.claude/agents/$basename"
  fi
done
```

### Step 2: Report

List what was synced:

```bash
ls /home/marc/DEV/claude/agent-evaluation/agents/*.md | grep -v CLAUDE-TEAM | xargs -I {} basename {} .md | sort
```

Show:
- [N] agents synced to `~/.claude/agents/`
- Available in all projects immediately via the Task tool
