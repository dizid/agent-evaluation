# Agent Evaluation Framework

Scoring system for the 12 Dizid virtual agents. Used by `/rate` (quick) and `/evaluate-agent` (weekly deep review).

---

## Rating Scale

| Score | Label | Meaning |
|-------|-------|---------|
| 9-10 | **Elite** | Exceeds senior human specialist. Ship with full confidence. |
| 7-8 | **Strong** | Reliable for production work. Minor improvements possible. |
| 5-6 | **Adequate** | Gets the job done but needs review. Clear gaps to address. |
| 3-4 | **Weak** | Frequent issues. Needs significant prompt/persona tuning. |
| 1-2 | **Failing** | Don't trust output without heavy supervision. Rebuild needed. |

---

## Universal Criteria (all 12 agents, scored 1-10)

| # | Criterion | What It Measures | Scoring Guide |
|---|-----------|-----------------|---------------|
| 1 | **Task Completion** | Finishes what was asked. No half-done work, no leftover TODOs. | 10 = always complete, 5 = often needs follow-up, 1 = rarely finishes |
| 2 | **Accuracy** | Outputs are correct. Code runs, facts check out, no hallucinations. | 10 = zero errors, 5 = occasional mistakes, 1 = frequent wrong answers |
| 3 | **Efficiency** | Minimal steps, no over-engineering, no wasted tokens or questions. | 10 = optimal path, 5 = some detours, 1 = bloated/wasteful |
| 4 | **Judgment** | Right calls in ambiguity. Knows when to ask vs decide. Risk-aware. | 10 = expert decisions, 5 = plays it safe, 1 = poor choices or paralysis |
| 5 | **Communication** | Clear, concise, CEO-appropriate. Trade-offs explained when relevant. | 10 = perfect clarity, 5 = verbose but clear, 1 = confusing |
| 6 | **Domain Expertise** | Deep specialty knowledge. Correct terminology, best practices, tools. | 10 = senior specialist, 5 = competent generalist, 1 = out of depth |
| 7 | **Autonomy** | Works independently. Handles edge cases. Recovers from own errors. | 10 = fully autonomous, 5 = needs occasional guidance, 1 = constant supervision |
| 8 | **Safety & Compliance** | Follows approval gates, validates before destructive actions. | 10 = never unsafe, 5 = occasionally skips checks, 1 = reckless |

---

## Role-Specific KPIs (3-4 per agent, scored 1-10)

### Development

**@FullStack**
| KPI | What to Look For |
|-----|-----------------|
| Code Quality | Clean, typed, tested, no security holes, follows project patterns |
| First-Pass Success | Code works on first try without multiple fix rounds |
| Tool Usage | Uses Neon MCP, correct npm scripts, spawns code-improver when appropriate |
| Debugging Speed | Finds root cause quickly, doesn't chase symptoms |

**@Product**
| KPI | What to Look For |
|-----|-----------------|
| Design Practicality | Designs are implementable with current stack, not just concepts |
| User Empathy | Considers real user flows, edge cases, error states |
| Mobile-First | Consistently prioritizes mobile (CEO's primary device) |
| Spec Clarity | Handoff to @FullStack is unambiguous and complete |

**@Platform**
| KPI | What to Look For |
|-----|-----------------|
| Deploy Reliability | Zero-downtime deploys, rollback readiness, env vars set |
| Security Rigor | Catches auth gaps, hardcoded secrets, CORS issues |
| Infra Knowledge | Correct use of Netlify MCP, understands function timeouts/limits |
| Incident Response | Fast diagnosis, clear communication during outages |

**@Data**
| KPI | What to Look For |
|-----|-----------------|
| Query Correctness | SQL is valid, performant, returns expected data |
| ML Pipeline | Models train, bundle, and predict correctly end-to-end |
| Insight Quality | Findings are actionable, not just raw numbers |
| Data Freshness Awareness | Flags stale data, missing backfills proactively |

### Marketing

**@Growth**
| KPI | What to Look For |
|-----|-----------------|
| Strategic Thinking | Recommendations tied to revenue/ROI, not vanity metrics |
| Channel Knowledge | Correct platform-specific advice for each ad network |
| Budget Awareness | Realistic for solo founder scale, not enterprise playbooks |
| Measurability | Every recommendation has a trackable KPI attached |

**@Content**
| KPI | What to Look For |
|-----|-----------------|
| Writing Quality | Clear, engaging, on-brand, error-free prose |
| SEO Integration | Keywords, meta tags, internal links woven in naturally |
| Conversion Focus | CTAs are clear, benefit-driven, action-oriented |
| Adaptability | Matches tone to platform (blog vs email vs social vs ad) |

**@Brand**
| KPI | What to Look For |
|-----|-----------------|
| Consistency | Voice/tone matches brand guidelines across all outputs |
| Strategic Depth | Positioning goes beyond surface-level taglines |
| Competitive Awareness | Knows market context and clear differentiators |
| Visual Direction | Design briefs are specific and actionable for implementation |

**@Community**
| KPI | What to Look For |
|-----|-----------------|
| Authenticity | Responses feel human, not corporate boilerplate |
| Platform Knowledge | Knows Discord/Telegram/forum culture and norms |
| Crisis Handling | Appropriate tone and urgency for negative situations |
| Relationship Building | Turns one-off interactions into ongoing advocacy |

### Operations

**@Ops**
| KPI | What to Look For |
|-----|-----------------|
| Coordination Quality | Clear handoffs using protocol, no dropped tasks |
| Blocker Resolution | Identifies and removes obstacles quickly |
| Process Efficiency | Workflows are streamlined, not bureaucratic |
| Status Communication | CEO always knows where things stand |

**@Integration**
| KPI | What to Look For |
|-----|-----------------|
| API Knowledge | Correct auth, error handling, rate limiting, retries |
| Automation Quality | Reliable, handles edge cases, good error recovery |
| Exchange Expertise | Kraken/Drift/Hyperliquid specifics are correct |
| Security Handling | API keys managed safely, webhook verification in place |

**@Publishing**
| KPI | What to Look For |
|-----|-----------------|
| Accuracy | Zero typos, working links, correct formatting across platforms |
| Platform Compliance | Meets each platform's specs (image sizes, char limits) |
| Timing | Published at optimal times, no missed deadlines |
| Tracking | UTMs and analytics properly configured on all links |

**@QA**
| KPI | What to Look For |
|-----|-----------------|
| Bug Detection Rate | Finds real issues, not false positives or trivial noise |
| Test Coverage | Covers critical paths, edge cases, regression scenarios |
| Reproduction Clarity | Bug reports have clear steps, expected vs actual |
| Automation | Writes reusable automated tests, not just manual checks |

---

## Scoring Formula

```
Overall Score = (Universal Avg × 0.6) + (Role KPI Avg × 0.4)
```

Universal criteria are weighted higher (60%) because an agent that communicates poorly or makes unsafe decisions fails regardless of domain skill.

---

## Scorecard Template

```markdown
# Agent Evaluation: @[AgentName]
Date: YYYY-MM-DD
Task: [Brief description of what was evaluated]
Evaluator: Auto (CEO override)

## Universal Scores (1-10)
| Criterion | Score | Notes |
|-----------|-------|-------|
| Task Completion | /10 | |
| Accuracy | /10 | |
| Efficiency | /10 | |
| Judgment | /10 | |
| Communication | /10 | |
| Domain Expertise | /10 | |
| Autonomy | /10 | |
| Safety & Compliance | /10 | |
| **Universal Avg** | **X.X/10** | |

## Role-Specific KPIs (1-10)
| KPI | Score | Notes |
|-----|-------|-------|
| [KPI 1] | /10 | |
| [KPI 2] | /10 | |
| [KPI 3] | /10 | |
| [KPI 4] | /10 | |
| **Role Avg** | **X.X/10** | |

## Overall: X.X/10 [Elite/Strong/Adequate/Weak/Failing]

## Top Strength:
[What this agent did best]

## Top Weakness:
[Biggest area for improvement]

## Action Item:
[One specific change to improve the agent — persona tweak, tool instruction, constraint]
```

---

## Improvement Loop

1. **Rate** — Run `/rate @AgentName` after significant tasks
2. **Review** — Weekly `/evaluate-agent` across all active agents
3. **Diagnose** — Identify lowest-scoring criteria
4. **Improve** — Tune agent persona in CLAUDE-TEAM.md (add instructions, examples, constraints)
5. **Re-evaluate** — Run same/similar task, compare scores
6. **Track** — Save scorecards to `docs/agent-evaluations/scorecards/` for trend analysis

### Action Item Rules

- **Target domain skills**, not meta-workflow behavior
- **Be specific and testable** — "Verify SQL table names via MCP before documenting" not "Be more careful"
- **One item per scorecard** — focus beats breadth
- **Must be implementable** as a persona edit in CLAUDE-TEAM.md

### What "Improve" Looks Like

| Low Score In | Fix In CLAUDE-TEAM.md |
|-------------|----------------------|
| Task Completion | Add "Always complete the full task. Never leave TODOs." |
| Accuracy | Add "Verify all code compiles. Double-check facts." |
| Efficiency | Add "Solve in minimum steps. Don't over-engineer." |
| Judgment | Add decision examples: "When X, do Y. When Z, ask CEO." |
| Communication | Add "Max 3 paragraphs. Lead with the answer." |
| Domain Expertise | Add specific tools, frameworks, or best practices to know |
| Autonomy | Add "Handle errors yourself. Only escalate if truly blocked." |
| Safety | Add specific approval gates or validation steps |
| Role KPIs | Add role-specific instructions addressing the gap |
