---
description: Hire a new agent — create agent file + add to database
allowed-tools: Read, Write, Bash, Grep, Glob
---

Hire a new agent into the Dizid staffing agency. Creates the agent definition file and adds the agent to the evaluation database.

## Instructions

The user will specify the agent to hire, e.g., `/hire @Designer` or `/hire`.

### Step 1: Gather agent details

If not already specified, ask the user for:
1. **Agent ID** (lowercase, single word): e.g., `designer`, `qa`, `copywriter`
2. **Display name**: e.g., `@Designer`
3. **Department**: `development`, `marketing`, or `operations`
4. **Role**: Short title, e.g., "UI/UX Designer"
5. **Persona**: 2-3 sentences describing who this agent is, their voice, and what they handle
6. **4 KPIs**: Role-specific performance indicators (use snake_case IDs)

### Step 2: Create the agent file

Write the agent definition to `/home/marc/DEV/claude/agent-evaluation/agents/[agent_id].md`:

```yaml
---
name: [agent_id]
description: "[short description of when to use this agent]"
model: sonnet
color: [pick a color: blue, red, green, yellow, purple, cyan, orange, pink, teal, magenta, gray]
---

# @[DisplayName] — [Role]

**Who:** [persona summary]

**Handles:** [list of responsibilities]

**Voice:** [communication style]

## Behavior Rules

- [3-5 specific, testable rules for this agent]

## Toolbox

| Type | Tools |
|------|-------|
| [relevant tools for this agent's work] |
```

### Step 3: Add to database

Use the Neon MCP to insert the agent and its KPI criteria.

First, check the agent doesn't already exist:
```
Use mcp__Neon__run_sql: SELECT id FROM agents WHERE id = '[agent_id]'
```

Then insert the agent:
```
Use mcp__Neon__run_sql:
INSERT INTO agents (id, name, department, role, persona, kpi_definitions)
VALUES ('[agent_id]', '@[DisplayName]', '[department]', '[Role]', '[persona]', '["kpi1", "kpi2", "kpi3", "kpi4"]'::jsonb);
```

Then insert the KPI criteria:
```
Use mcp__Neon__run_sql:
INSERT INTO criteria (id, name, description, category, applies_to, sort_order) VALUES
('[kpi1_id]', '[KPI 1 Name]', '[description]', 'role_kpi', ARRAY['[agent_id]'], 1),
('[kpi2_id]', '[KPI 2 Name]', '[description]', 'role_kpi', ARRAY['[agent_id]'], 2),
('[kpi3_id]', '[KPI 3 Name]', '[description]', 'role_kpi', ARRAY['[agent_id]'], 3),
('[kpi4_id]', '[KPI 4 Name]', '[description]', 'role_kpi', ARRAY['[agent_id]'], 4);
```

### Step 4: Update CLAUDE-TEAM.md

Add the new agent's section to `/home/marc/DEV/claude/agent-evaluation/agents/CLAUDE-TEAM.md` in the appropriate department section, following the existing format.

Update the routing table at the top if applicable.

### Step 5: Confirm

Show:
- Agent file created at: `agents/[agent_id].md`
- Database entry created with 4 KPIs
- Dashboard link: `https://dizid-agenteval.netlify.app/agent/[agent_id]`
- Remind: run `scripts/install-hooks.sh /path/to/project [agent_id]` to deploy to a project
