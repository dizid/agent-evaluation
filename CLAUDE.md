# Agent Evaluation & Improvement App

## What is this?

A standalone app for evaluating, scoring, and improving AI agent personas. Born from the Dizid virtual company (12 agents defined in CLAUDE-TEAM.md). The goal: systematically improve each agent through measured evaluation cycles.

## Context

Read `HANDOFF.md` first — it contains the full backstory, all design decisions, lessons learned, and architecture vision.

## Key Files

| File | Purpose |
|------|---------|
| `HANDOFF.md` | Complete project context and handoff from the crypto project |
| `framework/FRAMEWORK.md` | Evaluation criteria, KPIs, scoring formula, rating scale |
| `agents/CLAUDE-TEAM.md` | 12 agent definitions (the personas being evaluated) |
| `commands/rate.md` | Quick post-task evaluation command template |
| `commands/evaluate-agent.md` | Weekly deep evaluation command template |
| `scorecards/*.md` | Historical evaluation scorecards |

## Core Concepts

- **12 Agents** across 3 departments (Dev, Marketing, Ops) — all personas of the same LLM
- **8 Universal Criteria** scored 1-10 (Task Completion, Accuracy, Efficiency, Judgment, Communication, Domain Expertise, Autonomy, Safety)
- **3-4 Role KPIs** per agent scored 1-10 (e.g., @FullStack: Code Quality, First-Pass Success, Tool Usage, Debugging Speed)
- **Overall Score** = (Universal Avg x 0.6) + (Role KPI Avg x 0.4)
- **Improvement Loop**: Rate → Diagnose → Improve persona → Re-evaluate → Track

## Design Preferences

- Mobile-first (CEO uses phone primarily)
- Tailwind CSS 4 (`@theme {}` syntax)
- Dark mode default
- Glass morphism UI patterns
- Vue 3 (Options API) preferred, or whatever fits best for this app
- Simple solutions over clever ones
- Complete working code — no TODOs, mocks, or stubs

## Rules

- Act like a senior developer
- Read existing files before suggesting changes
- Keep it modular and maintainable
- One action item per evaluation scorecard (focus beats breadth)
- Action items must target domain skills, not meta-workflow behavior
- Action items must be specific, testable, and implementable as persona edits
