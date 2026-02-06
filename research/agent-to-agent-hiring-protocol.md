# Agent-to-Agent Hiring Protocol: Deep Dive

**Author:** Marketplace Architect Agent
**Date:** 2026-02-06
**Status:** Design Document (Priority Deep-Dive)
**Context:** Builds on marketplace-architecture.md, Section 6

---

## Table of Contents

1. [Why This Is the Killer Feature](#1-why-this-is-the-killer-feature)
2. [The Full Hiring Lifecycle](#2-the-full-hiring-lifecycle)
3. [Value Proposition vs Raw GitHub Configs](#3-value-proposition-vs-raw-github-configs)
4. [Concrete Scenario: Building a Landing Page Team](#4-concrete-scenario-building-a-landing-page-team)
5. [API Contract (Complete)](#5-api-contract-complete)
6. [Integration with Claude Code Infrastructure](#6-integration-with-claude-code-infrastructure)
7. [MVP Scope for v1](#7-mvp-scope-for-v1)
8. [Post-MVP Roadmap](#8-post-mvp-roadmap)

---

## 1. Why This Is the Killer Feature

### The Market Gap

Today, there are three ways to get a specialized AI agent:

1. **Write your own CLAUDE.md** -- works, but you need to know what "good" looks like. No quality signal.
2. **Copy from GitHub** -- SkillsMP indexes 145K+ skills, awesome-claude-skills has curated lists. But these are skills/commands, not complete agent personas. No scoring. No guarantees.
3. **Use a Claude Code plugin** -- community marketplaces exist, but no quality gate, no trust layer, no way to know which plugin will actually perform well for your task.

None of these serve the case where one AI agent needs to **autonomously find and hire another AI agent**. That requires:
- Machine-readable capability descriptions (not just README prose)
- Quantified quality signals (not "100 GitHub stars")
- Programmatic installation (not "copy this folder")
- Feedback loops (not "hope it works")

This is the gap AgentEval fills.

### Why Agent-to-Agent Matters More Than Human-to-Agent

**The human installation flow** is a nice-to-have. Humans can browse, read READMEs, and make judgment calls. A Claude Code plugin marketplace serves them adequately.

**The agent-to-agent flow** is a must-have because:
1. **Multi-agent systems are the dominant architecture** -- Gartner reports 1,445% surge in multi-agent system inquiries. By 2026, 40% of enterprise apps will embed role-specific AI agents.
2. **Coordinator agents need to hire dynamically** -- A CEO/orchestrator agent that can only use pre-installed agents is limited. One that can discover and integrate specialists on the fly is powerful.
3. **The hiring decision needs data** -- When a coordinator picks between two agents, it needs scores, not vibes. Evaluation scorecards are the "resume + references" of the agent world.
4. **Network effects are machine-generated** -- Every agent hire is a data point. Machine-generated demand scales without human browsing.

### The Mental Model: AI Recruiting Agency

Think of AgentEval not as an app store, but as a **recruiting agency for AI agents**:

| Human Recruiting | AgentEval Equivalent |
|-----------------|---------------------|
| Job description | Task need (natural language) |
| Resume | Agent Card + scorecard |
| Interview | Benchmark run / evaluation |
| References | Historical evaluation scores + community ratings |
| Background check | Security audit of scripts/hooks |
| Hiring | Plugin installation |
| 90-day review | Usage report + re-evaluation |
| Recruiter fee | API access fee (future) |

---

## 2. The Full Hiring Lifecycle

Eight steps, from "I need help" to "that worked, let's do it again."

### Step 1: NEED RECOGNITION

The coordinator agent recognizes it needs a specialist it doesn't have.

**Trigger examples:**
- User asks: "Build me a landing page for the product launch"
- Coordinator's CLAUDE.md says: "For frontend work, hire a @FrontendDev agent"
- Task decomposition reveals a subtask outside the coordinator's expertise
- A previous attempt at a task scored poorly and the coordinator wants a specialist

**What happens internally:**
```
Coordinator's internal reasoning:
"The user wants a landing page. I need:
 1. UI/UX design (component layout, responsive design)
 2. Marketing copy (headlines, CTAs, value props)
 3. Visual direction (brand consistency, creative concept)

I can write code, but I'm weak at copy and design.
Let me find specialists."
```

At this point, the coordinator constructs a hiring request. The key insight: **the coordinator knows what it needs because it has decomposed the task**. It doesn't need to browse a marketplace homepage. It needs to query for specific capabilities.

### Step 2: DISCOVERY

The coordinator queries the AgentEval API to find candidates.

```http
POST /v1/agents/discover
Authorization: Bearer {token}
Content-Type: application/json

{
  "needs": [
    {
      "role": "frontend-developer",
      "description": "Build a responsive landing page with Vue 3 and Tailwind CSS. Mobile-first. Glass morphism style.",
      "required_capabilities": ["vue3", "tailwind", "responsive-design"],
      "preferred_capabilities": ["animation", "accessibility"],
      "min_score": 7.0
    },
    {
      "role": "copywriter",
      "description": "Write conversion-focused landing page copy. Headlines, subheads, CTAs, feature descriptions.",
      "required_capabilities": ["landing-page-copy", "cta-writing", "benefit-driven"],
      "preferred_capabilities": ["saas-copy", "ab-testing"],
      "min_score": 7.0
    },
    {
      "role": "designer",
      "description": "Provide visual direction and design specifications for the landing page. Brand-consistent creative concept.",
      "required_capabilities": ["visual-direction", "design-specs"],
      "preferred_capabilities": ["brand-guidelines", "component-design"],
      "min_score": 6.0
    }
  ],
  "context": {
    "platform": "claude-code",
    "project_stack": ["vue3", "tailwind-css-4", "netlify"],
    "project_type": "marketing-site"
  },
  "options": {
    "max_candidates_per_role": 3,
    "include_scorecards": true,
    "include_benchmark_results": true
  }
}
```

**Why this is better than copy-pasting from GitHub:**
- The coordinator doesn't need to know that `@Product` exists or what it's called
- It describes what it needs, and the API returns ranked matches
- Each result includes quantified quality scores, not just "this looks popular"

### Step 3: EVALUATION

The API returns ranked candidates. The coordinator (or a meta-agent) evaluates them.

```json
{
  "results": [
    {
      "role": "frontend-developer",
      "candidates": [
        {
          "agent_id": "product-001",
          "name": "Product Agent",
          "match_score": 0.92,
          "evaluation": {
            "overall_score": 7.8,
            "rating": "Strong",
            "evaluations_count": 31,
            "trend": "improving",
            "relevant_kpis": {
              "design_practicality": 8,
              "mobile_first": 9,
              "spec_clarity": 7,
              "user_empathy": 8
            },
            "scorecard_summary": "Strong on mobile-first design and practical implementation specs. Slightly weak on handoff clarity when working with developers.",
            "latest_action_item": "Include viewport breakpoints in all component specs."
          },
          "capabilities_match": {
            "required_met": ["vue3", "tailwind", "responsive-design"],
            "required_missing": [],
            "preferred_met": ["accessibility"],
            "preferred_missing": ["animation"]
          },
          "installation": {
            "marketplace": "agenteval",
            "plugin_name": "product-agent",
            "cli_command": "/plugin install product-agent@agenteval",
            "version": "1.4.0",
            "pinned_sha": "e7f8a9b0c1d2e3f4..."
          },
          "usage_stats": {
            "total_installs": 234,
            "active_installs_30d": 87,
            "avg_community_rating": 4.3,
            "success_rate": 0.89
          }
        },
        {
          "agent_id": "fullstack-001",
          "name": "FullStack Agent",
          "match_score": 0.78,
          "evaluation": {
            "overall_score": 8.1,
            "rating": "Strong",
            "evaluations_count": 47,
            "trend": "stable",
            "relevant_kpis": {
              "code_quality": 8,
              "first_pass_success": 8,
              "tool_usage": 9,
              "debugging_speed": 8
            },
            "scorecard_summary": "Excellent coder but primarily backend-focused. Can do frontend but not the strongest on design decisions.",
            "latest_action_item": "Verify SQL table names via MCP before documenting."
          },
          "capabilities_match": {
            "required_met": ["vue3", "tailwind", "responsive-design"],
            "required_missing": [],
            "preferred_met": [],
            "preferred_missing": ["animation", "accessibility"]
          },
          "installation": {
            "marketplace": "agenteval",
            "plugin_name": "fullstack-agent",
            "cli_command": "/plugin install fullstack-agent@agenteval",
            "version": "2.1.0",
            "pinned_sha": "a1b2c3d4e5f6a7b8..."
          },
          "usage_stats": {
            "total_installs": 567,
            "active_installs_30d": 203,
            "avg_community_rating": 4.6,
            "success_rate": 0.92
          }
        }
      ]
    },
    {
      "role": "copywriter",
      "candidates": [
        {
          "agent_id": "content-001",
          "name": "Content Agent",
          "match_score": 0.95,
          "evaluation": {
            "overall_score": 7.5,
            "rating": "Strong",
            "evaluations_count": 28,
            "trend": "improving",
            "relevant_kpis": {
              "writing_quality": 8,
              "seo_integration": 7,
              "conversion_focus": 9,
              "adaptability": 8
            },
            "scorecard_summary": "Excellent conversion-focused copy. Strong at CTAs and benefit-driven headlines. SEO integration improving.",
            "latest_action_item": "Always include 3 headline variations, not just one."
          },
          "capabilities_match": {
            "required_met": ["landing-page-copy", "cta-writing", "benefit-driven"],
            "required_missing": [],
            "preferred_met": ["saas-copy"],
            "preferred_missing": ["ab-testing"]
          },
          "installation": {
            "marketplace": "agenteval",
            "plugin_name": "content-agent",
            "cli_command": "/plugin install content-agent@agenteval",
            "version": "1.2.0",
            "pinned_sha": "f1a2b3c4d5e6f7a8..."
          },
          "usage_stats": {
            "total_installs": 189,
            "active_installs_30d": 72,
            "avg_community_rating": 4.4,
            "success_rate": 0.87
          }
        }
      ]
    },
    {
      "role": "designer",
      "candidates": [
        {
          "agent_id": "brand-001",
          "name": "Brand Agent",
          "match_score": 0.88,
          "evaluation": {
            "overall_score": 7.2,
            "rating": "Strong",
            "evaluations_count": 22,
            "trend": "stable",
            "relevant_kpis": {
              "consistency": 8,
              "strategic_depth": 7,
              "competitive_awareness": 7,
              "visual_direction": 8
            },
            "scorecard_summary": "Strong brand guardian with good visual direction. Ensures consistency across all outputs.",
            "latest_action_item": "Include competitor visual examples in design briefs."
          },
          "capabilities_match": {
            "required_met": ["visual-direction", "design-specs"],
            "required_missing": [],
            "preferred_met": ["brand-guidelines", "component-design"],
            "preferred_missing": []
          },
          "installation": {
            "marketplace": "agenteval",
            "plugin_name": "brand-agent",
            "cli_command": "/plugin install brand-agent@agenteval",
            "version": "1.1.0",
            "pinned_sha": "c3d4e5f6a7b8c9d0..."
          },
          "usage_stats": {
            "total_installs": 145,
            "active_installs_30d": 56,
            "avg_community_rating": 4.2,
            "success_rate": 0.84
          }
        }
      ]
    }
  ],
  "meta": {
    "total_candidates_evaluated": 12,
    "query_time_ms": 287,
    "scoring_model": "agenteval-match-v1"
  }
}
```

**What the coordinator does with this response:**

The coordinator compares candidates on multiple axes:
1. **Match score** (0.92 vs 0.78) -- how well capabilities align with the need
2. **Evaluation score** (7.8 vs 8.1) -- overall quality from AgentEval
3. **Relevant KPIs** -- specific scores for the task at hand (mobile_first: 9 beats code_quality: 8 for a landing page)
4. **Trend** -- is the agent improving or declining?
5. **Success rate** -- what % of previous hires succeeded?
6. **Action items** -- known weaknesses to compensate for

The coordinator picks @Product (0.92 match, mobile_first: 9) over @FullStack (0.78 match, no animation/accessibility) for frontend, even though @FullStack has a higher overall score (8.1 vs 7.8). **Task-relevant KPIs matter more than overall score.** This is something raw GitHub configs can never tell you.

### Step 4: SELECTION

The coordinator makes its hiring decisions and requests a team composition.

```http
POST /v1/teams/assemble
Authorization: Bearer {token}
Content-Type: application/json

{
  "team_name": "landing-page-team",
  "project_description": "Build a conversion-focused landing page for LaunchPilot.marketing",
  "members": [
    {
      "role": "frontend-developer",
      "agent_id": "product-001",
      "version": "1.4.0",
      "pin_sha": true
    },
    {
      "role": "copywriter",
      "agent_id": "content-001",
      "version": "1.2.0",
      "pin_sha": true
    },
    {
      "role": "designer",
      "agent_id": "brand-001",
      "version": "1.1.0",
      "pin_sha": true
    }
  ],
  "options": {
    "generate_install_script": true,
    "generate_team_skill": true,
    "check_compatibility": true
  }
}
```

Response:
```json
{
  "team": {
    "id": "team_lp_20260206",
    "name": "landing-page-team",
    "members": [
      {
        "role": "frontend-developer",
        "agent": "product-agent@agenteval",
        "version": "1.4.0",
        "sha": "e7f8a9b0c1d2e3f4...",
        "namespace": "product-agent",
        "available_skills": [
          "product-agent:design-specs",
          "product-agent:component-layout",
          "product-agent:responsive-audit"
        ]
      },
      {
        "role": "copywriter",
        "agent": "content-agent@agenteval",
        "version": "1.2.0",
        "sha": "f1a2b3c4d5e6f7a8...",
        "namespace": "content-agent",
        "available_skills": [
          "content-agent:landing-copy",
          "content-agent:headline-variants",
          "content-agent:cta-optimization"
        ]
      },
      {
        "role": "designer",
        "agent": "brand-agent@agenteval",
        "version": "1.1.0",
        "sha": "c3d4e5f6a7b8c9d0...",
        "namespace": "brand-agent",
        "available_skills": [
          "brand-agent:visual-direction",
          "brand-agent:design-brief",
          "brand-agent:brand-audit"
        ]
      }
    ],
    "compatibility": {
      "status": "compatible",
      "conflicts": [],
      "notes": "No MCP server conflicts. No overlapping skill names."
    },
    "install_script": "#!/bin/bash\n# Install landing-page-team\nclaude /plugin marketplace add agenteval/marketplace 2>/dev/null\nclaude /plugin install product-agent@agenteval\nclaude /plugin install content-agent@agenteval\nclaude /plugin install brand-agent@agenteval\necho 'Team installed. Available skills:'\necho '  /product-agent:design-specs'\necho '  /product-agent:component-layout'\necho '  /content-agent:landing-copy'\necho '  /content-agent:headline-variants'\necho '  /brand-agent:visual-direction'\necho '  /brand-agent:design-brief'",
    "team_skill": {
      "name": "landing-page-team",
      "description": "Coordinates product-agent, content-agent, and brand-agent to build a landing page. Delegates UI specs to product-agent, copy to content-agent, and visual direction to brand-agent.",
      "skill_md": "---\nname: landing-page-team\ndescription: Orchestrates a team of specialist agents to build a conversion-focused landing page.\ndisable-model-invocation: true\n---\n\n# Landing Page Team Orchestration\n\nYou are coordinating a team of three specialist agents:\n\n1. **@ProductAgent** (product-agent:*) -- UI/UX specs, component layout, responsive design\n2. **@ContentAgent** (content-agent:*) -- Headlines, copy, CTAs, feature descriptions\n3. **@BrandAgent** (brand-agent:*) -- Visual direction, brand consistency, design brief\n\n## Workflow\n\n1. First, use /brand-agent:visual-direction to establish the creative direction\n2. Then, use /content-agent:landing-copy to write the page copy\n3. Then, use /product-agent:design-specs to create component specifications\n4. Review all outputs for consistency\n5. Begin implementation using the specs and copy\n\n## Handoff Format\n\nWhen passing work between agents, provide:\n- What was completed\n- What is needed next\n- Any constraints or requirements"
    }
  }
}
```

The `team_skill` is the magic: the API generates a SKILL.md file that the coordinator can use to orchestrate the hired team. This is a plug-and-play workflow that didn't exist until the team was assembled.

### Step 5: INSTALLATION

The coordinator executes the installation. In Claude Code, this means running shell commands:

```bash
# The coordinator agent executes via Bash tool:
/plugin marketplace add agenteval/marketplace
/plugin install product-agent@agenteval
/plugin install content-agent@agenteval
/plugin install brand-agent@agenteval
```

After installation, the skills are immediately available:
- `/product-agent:design-specs`
- `/product-agent:component-layout`
- `/product-agent:responsive-audit`
- `/content-agent:landing-copy`
- `/content-agent:headline-variants`
- `/content-agent:cta-optimization`
- `/brand-agent:visual-direction`
- `/brand-agent:design-brief`
- `/brand-agent:brand-audit`

Each skill invocation loads the agent's persona from persona/CLAUDE.md, giving Claude the behavioral instructions, domain expertise, and voice of that specialist.

### Step 6: UTILIZATION

The coordinator uses the hired agents via Claude Code's native skill/subagent system. There are three integration patterns depending on the complexity:

#### Pattern A: Skill Invocation (Simplest)

The coordinator invokes agent skills directly. Each skill runs inline in the main conversation context with the agent's persona loaded.

```
/content-agent:landing-copy LaunchPilot.marketing - AI marketing automation platform.
Target audience: solo founders and small marketing teams.
Key benefits: automates 32 marketing tasks, saves 15 hours/week.
```

The Content Agent's persona loads, and Claude writes the copy in that agent's voice and style. Results appear in the main conversation.

#### Pattern B: Subagent Delegation (Isolated Context)

For larger tasks, the coordinator delegates to a subagent with the hired agent's skills preloaded. This keeps verbose output out of the main context.

```yaml
# .claude/agents/landing-page-writer.md (generated by coordinator)
---
name: landing-page-writer
description: Writes landing page copy using the Content Agent persona
skills:
  - content-agent:landing-copy
  - content-agent:headline-variants
  - content-agent:cta-optimization
model: sonnet
tools: Read, Grep, Glob, Write
---

You are coordinating copy creation for a landing page.
Use your preloaded Content Agent skills to write conversion-focused copy.
Deliver: 3 headline options, hero copy, 3 feature blocks, 2 CTA variants.
```

The coordinator delegates: "Use the landing-page-writer agent to create all copy for the landing page."

#### Pattern C: Agent Team (Full Parallel Orchestration)

For the full team scenario, the coordinator spawns an agent team with specialized teammates:

```
Create an agent team for the landing page project:

Teammate 1: "Visual Director" -- Use brand-agent skills to create the
creative direction and design brief for the page.

Teammate 2: "Copywriter" -- Use content-agent skills to write all page
copy: headlines, hero, features, CTAs, and social proof sections.

Teammate 3: "Frontend Spec" -- Use product-agent skills to create
component specifications and responsive layout specs.

Require plan approval before implementation.
Have teammates share their work with each other for consistency.
```

This uses Claude Code's experimental agent teams feature. Each teammate runs in its own context window, has the hired agent's skills preloaded, and can communicate with other teammates via the messaging system. The coordinator synthesizes results.

#### Pattern D: SDK Programmatic (For API Consumers)

For programmatic integration (e.g., a CI/CD pipeline or a SaaS product that embeds agent hiring):

```typescript
import { query, ClaudeAgentOptions, AgentDefinition } from '@anthropic-ai/claude-agent-sdk';

// Fetch agent definitions from AgentEval API
const team = await fetch('https://api.agenteval.dev/v1/teams/assemble', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({ /* team request */ })
}).then(r => r.json());

// Convert marketplace agents to SDK agent definitions
const agents = {};
for (const member of team.members) {
  agents[member.namespace] = {
    description: member.description,
    prompt: member.persona_content, // fetched from the agent package
    tools: member.tools,
    model: 'sonnet'
  };
}

// Run with the hired team
for await (const message of query({
  prompt: "Build a landing page for LaunchPilot.marketing",
  options: {
    allowedTools: ['Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob', 'Task'],
    agents
  }
})) {
  if ('result' in message) console.log(message.result);
}
```

### Step 7: FEEDBACK

After the task is complete, the coordinator reports outcomes to AgentEval.

```http
POST /v1/usage/report
Authorization: Bearer {token}
Content-Type: application/json

{
  "team_id": "team_lp_20260206",
  "reports": [
    {
      "agent_id": "product-001",
      "role": "frontend-developer",
      "skills_used": ["design-specs", "component-layout", "responsive-audit"],
      "outcome": "success",
      "quality_rating": 8,
      "task_description": "Created responsive landing page component specs with mobile-first breakpoints",
      "duration_seconds": 480,
      "notes": "Excellent mobile-first specs. Viewport breakpoints were included (action item addressed). Animation specs were basic.",
      "kpi_ratings": {
        "design_practicality": 9,
        "mobile_first": 9,
        "spec_clarity": 8,
        "user_empathy": 8
      }
    },
    {
      "agent_id": "content-001",
      "role": "copywriter",
      "skills_used": ["landing-copy", "headline-variants", "cta-optimization"],
      "outcome": "success",
      "quality_rating": 9,
      "task_description": "Wrote conversion-focused landing page copy with headline variants and CTAs",
      "duration_seconds": 320,
      "notes": "Delivered 3 headline variants as required. CTAs were strong. SEO keywords naturally integrated.",
      "kpi_ratings": {
        "writing_quality": 9,
        "conversion_focus": 9,
        "adaptability": 8,
        "seo_integration": 8
      }
    },
    {
      "agent_id": "brand-001",
      "role": "designer",
      "skills_used": ["visual-direction", "design-brief"],
      "outcome": "success",
      "quality_rating": 7,
      "task_description": "Provided visual direction and design brief for landing page",
      "duration_seconds": 240,
      "notes": "Good brand consistency. Design brief was actionable but lacked competitor visual examples.",
      "kpi_ratings": {
        "consistency": 8,
        "strategic_depth": 7,
        "visual_direction": 7,
        "competitive_awareness": 6
      }
    }
  ],
  "overall_team_rating": 8,
  "team_notes": "Team worked well together. Copy and design aligned. Frontend specs matched the visual direction."
}
```

### Step 8: LEARNING

The feedback closes the loop. AgentEval processes the usage report:

1. **Community rating updated** -- Each agent's running average adjusts based on the quality_rating
2. **KPI trends tracked** -- The per-KPI ratings feed into the agent's evaluation history
3. **Action items validated** -- @Product's action item was "Include viewport breakpoints" -- the coordinator confirmed this was addressed (mobile_first went from 9 to 9). Success.
4. **Listing rank recalculated** -- Agents with more positive usage reports rise in search rankings
5. **Recommendation engine learns** -- "Users who hired @Product + @Content + @Brand together rated the team 8/10" feeds into team composition recommendations

The next time ANY coordinator asks for a landing page team, AgentEval can recommend this exact combination based on proven success data.

---

## 3. Value Proposition vs Raw GitHub Configs

### Why a Boss Agent Would PREFER This Marketplace

| Decision Factor | Raw GitHub Config | AgentEval Marketplace |
|----------------|-------------------|----------------------|
| **Finding agents** | Manual search, read READMEs, guess quality | Natural language query: "I need a frontend dev for Vue 3" |
| **Quality signal** | GitHub stars (popularity != quality) | 8 universal criteria + role-specific KPIs, scored 1-10 |
| **Task fitness** | Read CLAUDE.md, hope it matches | Match score based on capability overlap + relevant KPIs |
| **Risk assessment** | None | Trend arrows (improving/declining), success rate, known weaknesses |
| **Installation** | Manual copy, hope for no conflicts | One CLI command, namespaced, compatibility checked |
| **Team assembly** | Manual, no compatibility checking | API assembles team, checks conflicts, generates orchestration skill |
| **Version control** | git clone at HEAD | Semantic versioning + SHA pinning for reproducibility |
| **Feedback loop** | None | Usage reports feed back into scores and recommendations |
| **Accountability** | None -- if agent underperforms, who knows? | Score drops, action items generated, author notified |

### The Core Value Props (in order of importance)

**1. Quantified Trust**

A coordinator agent choosing between `awesome-claude-skills/frontend-dev` (200 stars) and `agenteval/product-agent` (score: 7.8, mobile_first KPI: 9/10, 31 evaluations, trend: improving) will always prefer the latter. Stars tell you popularity. Scores tell you quality. KPIs tell you quality *at the specific thing you need*.

**2. Task-Relevant Matching**

The coordinator doesn't need to know agent names or browse categories. It describes the need, and the API returns ranked candidates scored on *relevance to this specific task*. A @FullStack agent with overall 8.1 loses to a @Product agent with overall 7.8 when the task is "mobile-first responsive design" because the KPIs that matter (mobile_first: 9 vs not-scored) favor @Product.

**3. Team Composition Intelligence**

Hiring one agent is useful. Hiring a *team* that works well together is powerful. The API tracks which agent combinations produce the best outcomes and recommends proven teams. This is something no GitHub README can ever provide.

**4. Reproducibility**

SHA-pinned versions mean a coordinator that hired @Product v1.4.0 with SHA `e7f8a9b0...` gets the exact same persona, skills, and scripts every time. No "it worked yesterday but the author pushed a breaking change" surprises.

**5. Accountability Loop**

Every hire generates a usage report. Poor-performing agents see their scores drop. High-performing agents rise. Authors receive feedback and can improve their agents. This creates evolutionary pressure toward quality that community marketplaces lack entirely.

---

## 4. Concrete Scenario: Building a Landing Page Team

Let's walk through the entire flow from the user's perspective, showing every message, API call, and agent interaction.

### Setup

- **User**: Marc (CEO of Dizid)
- **Project**: LaunchPilot.marketing landing page
- **Current session**: Claude Code with a coordinator agent (the main Claude Code instance)
- **Installed**: AgentEval marketplace plugin, AgentEval API token configured

### The Conversation

```
Marc: Build a landing page for LaunchPilot.marketing. It's an AI marketing
automation platform that handles 32 marketing tasks for solo founders.
Mobile-first, dark mode, glass morphism style. Make it convert.
```

**Coordinator's internal reasoning:**
```
Task decomposition:
1. Visual direction / brand creative brief
2. Landing page copy (headlines, hero, features, CTAs, testimonials)
3. Component specifications (responsive layout, animations)
4. Implementation (Vue 3 + Tailwind CSS 4)
5. QA (mobile testing, link verification)

I can handle #4 (implementation) and #5 (QA) myself.
I need specialists for #1, #2, and #3.

Querying AgentEval for specialists...
```

**API Call 1: Discovery**
```http
POST https://api.agenteval.dev/v1/agents/discover
{
  "needs": [
    {
      "role": "visual-director",
      "description": "Creative direction for a SaaS landing page. Dark mode, glass morphism, mobile-first.",
      "required_capabilities": ["visual-direction", "design-specs"],
      "min_score": 6.5
    },
    {
      "role": "copywriter",
      "description": "Conversion-focused SaaS landing page copy. Solo founder target audience.",
      "required_capabilities": ["landing-page-copy", "saas-copy", "cta-writing"],
      "min_score": 7.0
    },
    {
      "role": "ux-specialist",
      "description": "Component layout and responsive specs for a marketing landing page.",
      "required_capabilities": ["responsive-design", "mobile-first", "component-design"],
      "min_score": 7.0
    }
  ],
  "context": {
    "platform": "claude-code",
    "project_stack": ["vue3", "tailwind-css-4", "netlify"]
  }
}
```

**API Response: Candidates returned** (abbreviated)
- Visual director: @Brand (7.2, match 0.88) -- best available for creative direction
- Copywriter: @Content (7.5, match 0.95) -- excellent conversion_focus KPI (9/10)
- UX specialist: @Product (7.8, match 0.92) -- mobile_first KPI 9/10

**API Call 2: Team Assembly**
```http
POST https://api.agenteval.dev/v1/teams/assemble
{
  "team_name": "launchpilot-landing-page",
  "members": [
    { "role": "visual-director", "agent_id": "brand-001", "pin_sha": true },
    { "role": "copywriter", "agent_id": "content-001", "pin_sha": true },
    { "role": "ux-specialist", "agent_id": "product-001", "pin_sha": true }
  ],
  "options": { "generate_install_script": true, "generate_team_skill": true }
}
```

**Coordinator installs the team:**
```bash
/plugin install product-agent@agenteval
/plugin install content-agent@agenteval
/plugin install brand-agent@agenteval
```

**Coordinator responds to Marc:**
```
I've assembled a specialist team for the landing page:

- @BrandAgent (7.2/10 Strong) -- visual direction and creative brief
- @ContentAgent (7.5/10 Strong, conversion_focus: 9/10) -- page copy
- @ProductAgent (7.8/10 Strong, mobile_first: 9/10) -- component specs

Starting with visual direction, then copy, then component specs,
then I'll implement in Vue 3 + Tailwind CSS 4.
```

**Phase 1: Visual Direction**
```
Coordinator invokes: /brand-agent:visual-direction

  LaunchPilot.marketing landing page. AI marketing automation for solo
  founders. Dark mode default, glass morphism UI, mobile-first.
  Existing brand: modern, clean, professional.
```

The Brand Agent's persona loads. Claude produces a creative brief with color palette, typography, glass morphism specs, imagery direction, and component style guide.

**Phase 2: Landing Page Copy**
```
Coordinator invokes: /content-agent:landing-copy

  LaunchPilot.marketing. AI marketing automation platform.
  Target: solo founders and small marketing teams.
  Key benefit: automates 32 marketing tasks, saves 15 hours/week.
  Tone: confident, benefit-driven, action-oriented.
  Need: 3 headline options, hero section, 3 feature blocks,
  social proof section, 2 CTA variants, footer copy.

  Creative direction from @BrandAgent: [attached brief]
```

The Content Agent's persona loads. Claude produces conversion-focused copy with multiple headline variants, following the brand voice from the creative brief.

**Phase 3: Component Specs**
```
Coordinator invokes: /product-agent:design-specs

  Landing page component specifications.
  Stack: Vue 3 + Tailwind CSS 4.
  Style: [creative brief from @BrandAgent]
  Copy: [copy from @ContentAgent]

  Need: component hierarchy, responsive breakpoints (mobile-first),
  animation specs, accessibility requirements.
```

The Product Agent's persona loads. Claude produces detailed component specs with viewport breakpoints, component hierarchy, and accessibility requirements.

**Phase 4: Implementation (Coordinator does this itself)**

The coordinator now has everything it needs:
- Creative brief (from @BrandAgent)
- Copy (from @ContentAgent)
- Component specs (from @ProductAgent)

It implements the landing page in Vue 3 + Tailwind CSS 4, following the specs.

**Phase 5: Feedback**

After the page is built and reviewed:

```http
POST https://api.agenteval.dev/v1/usage/report
{
  "team_id": "team_launchpilot_20260206",
  "reports": [
    { "agent_id": "brand-001", "outcome": "success", "quality_rating": 7, ... },
    { "agent_id": "content-001", "outcome": "success", "quality_rating": 9, ... },
    { "agent_id": "product-001", "outcome": "success", "quality_rating": 8, ... }
  ],
  "overall_team_rating": 8
}
```

**Marc sees the result:** A fully built, conversion-focused landing page that was designed by a brand specialist, written by a copywriter, and specced by a UX designer -- all hired and coordinated automatically.

---

## 5. API Contract (Complete)

### Base URL and Authentication

```
Base URL: https://api.agenteval.dev/v1
Authentication: Bearer token in Authorization header
Rate Limits: 100 requests/minute (standard), 1000/minute (enterprise)
```

### Endpoints

#### 5.1 POST /v1/agents/discover

Find agents matching described needs.

**Request:**
```json
{
  "needs": [
    {
      "role": "string (user-defined label)",
      "description": "string (natural language, max 500 chars)",
      "required_capabilities": ["string"],
      "preferred_capabilities": ["string"],
      "min_score": "float (1.0-10.0, default 5.0)"
    }
  ],
  "context": {
    "platform": "string (claude-code|codex-cli|cursor)",
    "project_stack": ["string"],
    "project_type": "string (optional)"
  },
  "options": {
    "max_candidates_per_role": "int (1-10, default 3)",
    "include_scorecards": "bool (default false)",
    "include_benchmark_results": "bool (default false)"
  }
}
```

**Response:** See Step 3 in Section 2 for full schema.

#### 5.2 POST /v1/teams/assemble

Assemble a team from selected agents.

**Request:**
```json
{
  "team_name": "string (kebab-case)",
  "project_description": "string (optional, max 500 chars)",
  "members": [
    {
      "role": "string",
      "agent_id": "string",
      "version": "string (semver, optional -- defaults to latest)",
      "pin_sha": "bool (default true)"
    }
  ],
  "options": {
    "generate_install_script": "bool (default true)",
    "generate_team_skill": "bool (default false)",
    "check_compatibility": "bool (default true)"
  }
}
```

**Response:** See Step 4 in Section 2 for full schema.

#### 5.3 GET /v1/agents/{agent_id}

Get full agent details.

**Response:**
```json
{
  "agent_id": "string",
  "name": "string",
  "description": "string",
  "version": "string",
  "category": "string",
  "department": "string",
  "keywords": ["string"],
  "evaluation": {
    "overall_score": "float",
    "rating": "string",
    "evaluations_count": "int",
    "trend": "string (improving|stable|declining)",
    "universal_scores": {
      "task_completion": "int",
      "accuracy": "int",
      "efficiency": "int",
      "judgment": "int",
      "communication": "int",
      "domain_expertise": "int",
      "autonomy": "int",
      "safety": "int"
    },
    "role_kpis": { "string": "int" },
    "latest_scorecard_date": "string (ISO 8601)",
    "latest_action_item": "string"
  },
  "capabilities": ["string"],
  "skills": [
    {
      "name": "string",
      "description": "string",
      "tags": ["string"]
    }
  ],
  "installation": {
    "marketplace": "string",
    "plugin_name": "string",
    "cli_command": "string",
    "version": "string",
    "sha": "string"
  },
  "usage_stats": {
    "total_installs": "int",
    "active_installs_30d": "int",
    "avg_community_rating": "float",
    "success_rate": "float",
    "total_usage_reports": "int"
  },
  "agent_card": { /* A2A-compatible Agent Card (see marketplace-architecture.md) */ }
}
```

#### 5.4 GET /v1/agents/{agent_id}/card

Returns A2A-compatible Agent Card JSON. Useful for third-party A2A clients.

#### 5.5 GET /v1/agents/{agent_id}/scorecards

Returns evaluation history.

**Query params:** `?limit=10&offset=0&since=2026-01-01`

**Response:**
```json
{
  "scorecards": [
    {
      "date": "2026-02-06",
      "evaluator": "auto",
      "task": "Built responsive dashboard component",
      "overall_score": 8.1,
      "rating": "Strong",
      "universal_scores": { ... },
      "role_kpis": { ... },
      "top_strength": "Autonomy -- drove complex session with minimal guidance",
      "top_weakness": "Accuracy -- SQL table names not verified",
      "action_item": "Verify SQL table/column names via MCP before including them",
      "trend_vs_previous": { "overall": "+0.3", "accuracy": "-0.5", "autonomy": "+1.0" }
    }
  ],
  "meta": {
    "total": 47,
    "average_score": 7.9,
    "score_trend": "improving"
  }
}
```

#### 5.6 POST /v1/usage/report

Report usage outcomes. See Step 7 in Section 2 for full schema.

#### 5.7 GET /v1/agents/{agent_id}/benchmarks

Returns benchmark suite and results.

**Response:**
```json
{
  "benchmark_suite": {
    "tasks": [
      {
        "id": "bench-001",
        "name": "Build responsive card component",
        "description": "Create a Vue 3 card component with title, description, image, and CTA. Must be responsive.",
        "difficulty": "medium",
        "expected_time_seconds": 300,
        "evaluation_criteria": ["code_quality", "responsive", "accessibility", "first_pass_success"]
      }
    ]
  },
  "latest_results": {
    "run_date": "2026-02-01",
    "agent_version": "1.4.0",
    "results": [
      {
        "task_id": "bench-001",
        "passed": true,
        "score": 8.5,
        "time_seconds": 270,
        "notes": "Clean component, all breakpoints handled, ARIA labels present"
      }
    ],
    "overall_pass_rate": 0.92
  }
}
```

#### 5.8 GET /v1/recommendations/teams

Get recommended team compositions.

**Request (query params):**
```
?project_type=landing-page&stack=vue3,tailwind&min_score=7.0
```

**Response:**
```json
{
  "recommended_teams": [
    {
      "name": "Landing Page Team (Proven)",
      "avg_score": 7.5,
      "times_assembled": 23,
      "avg_team_rating": 8.1,
      "members": [
        { "role": "ux-specialist", "agent_id": "product-001", "score": 7.8 },
        { "role": "copywriter", "agent_id": "content-001", "score": 7.5 },
        { "role": "visual-director", "agent_id": "brand-001", "score": 7.2 }
      ],
      "install_command": "/plugin install product-agent content-agent brand-agent@agenteval"
    }
  ]
}
```

---

## 6. Integration with Claude Code Infrastructure

### How the Marketplace API Connects to Existing Systems

```
┌─────────────────────────────────────────────────────────┐
│                   Claude Code Session                    │
│                                                          │
│  ┌──────────────────┐  ┌─────────────────────────────┐  │
│  │   Coordinator    │  │  Installed Agent Plugins     │  │
│  │   (Main Agent)   │  │  ┌────────────────────────┐  │  │
│  │                  │  │  │ product-agent@agenteval │  │  │
│  │  Uses:           │  │  │ - persona/CLAUDE.md    │  │  │
│  │  - Bash tool     │  │  │ - skills/design-specs/ │  │  │
│  │  - Skill tool    │  │  │ - skills/responsive/   │  │  │
│  │  - Task tool     │  │  └────────────────────────┘  │  │
│  │  - SendMessage   │  │  ┌────────────────────────┐  │  │
│  │                  │  │  │ content-agent@agenteval │  │  │
│  └────────┬─────────┘  │  │ - persona/CLAUDE.md    │  │  │
│           │             │  │ - skills/landing-copy/ │  │  │
│           │             │  └────────────────────────┘  │  │
│           │             └─────────────────────────────┘  │
│           │                                              │
│  ┌────────▼─────────────────────────────────────────┐   │
│  │  Integration Layer (MCP Server or Skill)          │   │
│  │                                                    │   │
│  │  agenteval-marketplace MCP server                  │   │
│  │  OR                                                │   │
│  │  .claude/skills/hire-agent/SKILL.md               │   │
│  │                                                    │   │
│  │  Provides:                                         │   │
│  │  - discover_agents(needs, context)                 │   │
│  │  - assemble_team(members)                         │   │
│  │  - report_usage(outcomes)                         │   │
│  │  - get_agent_details(agent_id)                    │   │
│  └────────┬──────────────────────────────────────────┘   │
│           │                                              │
└───────────┼──────────────────────────────────────────────┘
            │
            │ HTTPS
            ▼
┌──────────────────────────┐
│   AgentEval API Server   │
│   api.agenteval.dev      │
│                          │
│   /v1/agents/discover    │
│   /v1/teams/assemble     │
│   /v1/usage/report       │
│   /v1/agents/{id}/card   │
│                          │
│   Backend:               │
│   - Agent registry (DB)  │
│   - Evaluation engine    │
│   - Matching engine      │
│   - Recommendation engine│
│   - Marketplace.json gen │
└──────────────────────────┘
```

### Two Integration Options for v1

**Primary: MCP Server (`@agenteval/mcp-server`)**

The team lead has confirmed MCP server as the integration approach. This is the natural fit: boss agents add AgentEval as an MCP server, and the hiring tools appear alongside their other MCP tools.

```json
// .mcp.json or claude_desktop_config.json
{
  "mcpServers": {
    "agenteval": {
      "command": "npx",
      "args": ["@agenteval/mcp-server"],
      "env": {
        "AGENTEVAL_API_KEY": "${AGENTEVAL_API_KEY}"
      }
    }
  }
}
```

**MCP Tools exposed:**

| Tool | Description | Input Schema |
|------|------------|-------------|
| `search_agents` | Find agents by need, score, tags, platform | `{need: string, min_score?: number, tags?: string[], platform?: string}` |
| `get_agent_detail` | Full agent info + scorecard + eval history | `{agent_id: string}` |
| `get_agent_package` | Download installable config (persona + skills) | `{agent_id: string, version?: string}` |
| `compose_team` | Assemble optimal agent team for a project | `{project: string, roles: string[], min_score?: number}` |
| `report_usage` | Report outcome after using an agent | `{agent_id: string, outcome: string, rating: number, notes?: string}` |
| `rate_agent` | Submit evaluation scores for an agent | `{agent_id: string, scores: object, task: string}` |

**Why MCP over REST API + curl:**

1. **Native integration** -- the coordinator calls `mcp__agenteval__search_agents` like any other tool. No shell escaping, no HTTP wrangling, no JSON parsing.
2. **Type safety** -- MCP tool schemas define exact input/output shapes. The coordinator can't malform a request.
3. **Permission model** -- MCP tools go through Claude Code's permission system. Users can approve/deny hiring operations.
4. **Discovery** -- When a project has AgentEval in .mcp.json, the hiring tools are automatically available. The coordinator doesn't need to be told to use curl.
5. **Ecosystem fit** -- MCP is the universal integration standard for Claude Code. This is how Neon, Netlify, Supabase, Stripe, and every other service integrates. AgentEval should too.

**Example boss agent conversation (using MCP natively):**

```
Boss: "I need a frontend developer for a Vue 3 landing page"

Claude internally:
  → MCP tool call: mcp__agenteval__search_agents({
      need: "frontend developer vue3 responsive landing page",
      min_score: 7.0,
      platform: "claude-code"
    })
  → Returns: [@Product (7.8, match 0.92), @FullStack (8.1, match 0.78)]

Claude: "Found 2 matching agents:
  1. @ProductAgent (7.8/10, mobile-first KPI: 9/10) - best match for landing page design
  2. @FullStackAgent (8.1/10, code quality: 8/10) - stronger coder, weaker on design

  @ProductAgent is the better fit for UI/UX work. Install?"

Boss: "Yes, install @ProductAgent"

  → MCP tool call: mcp__agenteval__get_agent_package({agent_id: "product-001"})
  → Bash: /plugin install product-agent@agenteval

Claude: "Installed. Available skills:
  /product-agent:design-specs
  /product-agent:component-layout
  /product-agent:responsive-audit

  Starting with /product-agent:design-specs for your landing page."
```

The entire flow feels like a natural conversation. No API documentation needed. No curl commands. The boss agent just asks for what it needs and the MCP tools handle the rest.

**Fallback: `/hire-agent` Skill (for users without MCP)**

For simpler setups where users don't want to configure an MCP server, provide a skill that wraps the same API:

```yaml
---
name: hire-agent
description: Find and install specialist agents from the AgentEval marketplace.
disable-model-invocation: true
---

# Hire Agent from AgentEval

Find and install the best specialist agent for your need.

## Steps
1. Parse the user's need into capabilities
2. Call the discovery API via curl
3. Present candidates with evaluation scores
4. Install the selected agent
5. Report usage after task completion
```

This is less elegant but provides an entry point for users who just want to try the marketplace without configuring MCP.

---

## 7. MVP Scope for v1

### The Absolute Minimum That Delivers Agent-to-Agent Value

#### What Ships

**1. Agent Registry API (3 endpoints)**

```
GET  /v1/agents                    -- List all agents with scores
GET  /v1/agents/{id}               -- Get agent details + scorecard
GET  /v1/agents/{id}/card          -- A2A-compatible Agent Card
```

This is a read-only API that serves our 12 evaluated agents. No write endpoints. No user accounts. Just a JSON API backed by a static data file (our existing scorecards + CLAUDE-TEAM.md parsed into structured data).

**2. Discovery Endpoint (1 endpoint)**

```
POST /v1/agents/discover           -- Semantic search
```

Takes `{ "needs": [{ "description": "...", "min_score": 7.0 }] }` and returns ranked agents. The matching logic can start simple:
- Parse keywords from the description
- Match against agent keywords/capabilities
- Sort by evaluation score
- No LLM required for v1; keyword matching + score sorting is sufficient

**3. Our 12 Agents as Claude Code Plugins (12 packages)**

Package each of the 12 agents from CLAUDE-TEAM.md as a Claude Code plugin:
- `@fullstack` -> `fullstack-agent` plugin with persona + skills
- `@product` -> `product-agent` plugin with persona + skills
- `@content` -> `content-agent` plugin with persona + skills
- ... etc.

Published in a GitHub marketplace repo: `agenteval/marketplace`

**4. MCP Server: `@agenteval/mcp-server` (the primary integration)**

An npm-packaged MCP server that exposes hiring tools natively in Claude Code:

```json
{
  "mcpServers": {
    "agenteval": {
      "command": "npx",
      "args": ["@agenteval/mcp-server"],
      "env": { "AGENTEVAL_API_KEY": "${AGENTEVAL_API_KEY}" }
    }
  }
}
```

MVP tools:
- `search_agents` -- find agents by need + min_score
- `get_agent_detail` -- full agent card + scorecard
- `report_usage` -- report outcome after use

The MCP server calls the same backend API endpoints but provides a native tool experience. No curl, no shell escaping, no JSON parsing. Coordinators just call `mcp__agenteval__search_agents` like any other tool.

**5. Fallback: `/hire-agent` Skill (1 skill)**

For users who don't configure MCP, a skill that wraps the API via curl. Lower priority than the MCP server.

**6. Usage Reporting (built into MCP server)**

The `report_usage` MCP tool is the feedback mechanism. Even in v1, we collect usage data. This is the flywheel -- every hire that gets reported makes future recommendations better.

#### What Doesn't Ship in v1

| Feature | Why Not v1 | When |
|---------|-----------|------|
| `/v1/teams/assemble` | Complex; single-agent hiring is sufficient for MVP | v2 |
| `generate_team_skill` | Requires dynamic SKILL.md generation | v2 |
| Semantic matching (LLM) | Keyword matching is sufficient to start | v2 |
| Recommendation engine | Need usage data first | v2 |
| Benchmark automation | Manual evaluations are fine initially | v3 |
| MCP server integration | Skill + curl is simpler for v1 | v2 |
| Enterprise API / rate limiting | No enterprise customers yet | v3 |
| Cross-platform (Codex CLI, Cursor) | Claude Code first | v3 |

#### v1 Architecture

```
GitHub Repo: agenteval/marketplace
  .claude-plugin/marketplace.json     -- Claude Code marketplace
  plugins/
    fullstack-agent/                  -- 12 agent plugins
    product-agent/
    content-agent/
    brand-agent/
    ...

Netlify Function (or similar):
  /v1/agents              GET        -- returns agents.json (static)
  /v1/agents/:id          GET        -- returns single agent
  /v1/agents/:id/card     GET        -- returns A2A card
  /v1/agents/discover     POST       -- keyword search + score sort
  /v1/usage/report        POST       -- stores to database

Data:
  agents.json                         -- Generated from CLAUDE-TEAM.md
                                         + FRAMEWORK.md + scorecards/
  usage_reports table                  -- Neon PostgreSQL
```

#### v1 User Flow (Complete)

```
1. User adds marketplace:
   /plugin marketplace add agenteval/marketplace

2. User (or coordinator agent) needs a specialist:
   /hire-agent I need someone to write conversion-focused landing page copy

3. The skill calls the API:
   curl https://api.agenteval.dev/v1/agents/discover \
     -d '{"needs":[{"description":"conversion-focused landing page copy","min_score":7.0}]}'

4. Shows results:
   Found 2 matching agents:

   1. @ContentAgent (7.5/10 Strong, conversion_focus: 9/10)
      "Copywriter + content strategist + SEO expert. Conversion-focused."
      Install: /plugin install content-agent@agenteval

   2. @BrandAgent (7.2/10 Strong, writing: 7/10)
      "Brand guardian + creative director. Ensures consistency."
      Install: /plugin install brand-agent@agenteval

5. User installs:
   /plugin install content-agent@agenteval

6. Agent skills become available:
   /content-agent:landing-copy
   /content-agent:headline-variants
   /content-agent:cta-optimization

7. User (or coordinator) uses the hired agent:
   /content-agent:landing-copy LaunchPilot.marketing, AI marketing automation...

8. After task completion, report usage:
   curl -X POST https://api.agenteval.dev/v1/usage/report \
     -d '{"agent_id":"content-001","outcome":"success","quality_rating":9}'
```

That's the MVP. Five API endpoints. Twelve plugin packages. One skill. One marketplace repo. Ships in a focused sprint.

#### Effort Estimate (Rough)

| Component | Effort |
|-----------|--------|
| Package 12 agents as Claude Code plugins | 1-2 days |
| Create marketplace.json | 0.5 day |
| Build agents.json from existing scorecards/FRAMEWORK.md | 0.5 day |
| API: 3 GET endpoints (static data) | 0.5 day |
| API: discover endpoint (keyword match + sort) | 1 day |
| API: usage/report endpoint (write to DB) | 0.5 day |
| MCP server (`@agenteval/mcp-server` npm package) | 1.5-2 days |
| `/hire-agent` skill (fallback) | 0.5 day |
| Testing + documentation | 1 day |
| **Total** | **~7-8 days** |

The MCP server adds ~2 days but is the core differentiation. Without it, we're just another plugin marketplace. With it, boss agents can hire specialists as naturally as they query a database.

---

## 8. Post-MVP Roadmap

### v2: Team Assembly + Smart Matching

- `/v1/teams/assemble` endpoint with compatibility checking
- `generate_team_skill` -- dynamic SKILL.md generation for team orchestration
- Semantic matching using LLM (move beyond keyword search)
- MCP server for cleaner integration (replaces curl-in-skill approach)
- Recommendation engine (based on v1 usage data)

### v3: Benchmarks + Cross-Platform

- Automated benchmark suite execution
- Benchmark-driven scoring (complement manual evaluations)
- Codex CLI and Cursor distribution (Agent Skills standard)
- Enterprise API with rate limits and usage tiers
- A2A full server (not just Agent Cards)

### v4: Marketplace Economics

- Evaluation-as-a-Service (charge for premium evaluations)
- Certification program (paid badge)
- White-label evaluation framework
- Agent versioning + A/B testing
- Community submissions at scale

---

*End of document. This is the deep-dive on the killer feature.*
