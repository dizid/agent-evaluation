# Agent Evaluation Framework

Scoring system for 18 agents across 5 departments. Used by `/rate` (quick) and `/evaluate-agent` (weekly deep review).

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

## Universal Criteria (all agents, scored 1-10)

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

**@AI**
| KPI | What to Look For |
|-----|-----------------|
| Prompt Engineering | Production-grade prompts with system/user roles, examples, guardrails, edge case handling |
| LLM Integration | Correct API usage across providers, structured outputs, tool use, error handling |
| Evaluation Design | Measurable eval harnesses with rubrics, automated scoring, regression detection |
| Cost & Latency Optimization | Right model tiers, caching, batching, token monitoring. Quality vs cost balance |

### Marketing

**@Growth** — Campaign Executor
| KPI | What to Look For |
|-----|-----------------|
| Landing Page Execution | Builds deployable landing pages with forms and CTAs, not wireframes |
| Tracking Implementation | Writes actual GA4 event code, UTM configs in files |
| Form & Lead Capture | Creates working Netlify Forms with validation |
| Campaign Execution | Produces campaign-ready artifacts: pages, tracking, JSON configs |

**@Content** — Content Publisher
| KPI | What to Look For |
|-----|-----------------|
| Content Output | Writes deploy-ready files (markdown, Vue, HTML), not just chat text |
| Multi-Channel Delivery | Blog + social variants + email draft produced together |
| Publish Readiness | Content has frontmatter, SEO meta, correct formatting |
| Brand Compliance | Matches project voice/tone, uses correct design tokens |

**@Brand** — Brand Enforcer
| KPI | What to Look For |
|-----|-----------------|
| Token Management | Edits @theme blocks directly in tailwind.css |
| Violation Detection & Fix | Finds AND fixes brand violations in code, not just reports |
| Style Guide Output | Generates deployable style guide pages with live previews |
| Competitive Research | Research-backed positioning with cited competitor URLs |

**@SEO** — SEO Implementer
| KPI | What to Look For |
|-----|-----------------|
| Meta Tag Implementation | Writes meta/OG/canonical tags directly in Vue components |
| Structured Data Deployment | Valid JSON-LD implemented and validated in pages |
| Lighthouse Auditing | Runs CLI audits, reports scores, fixes issues in code |
| Tracking Code Setup | Writes GA4 gtag calls, UTM configs, sitemaps in actual files |

**@Sales** — Sales Closer
| KPI | What to Look For |
|-----|-----------------|
| Proposal Quality | Complete scope, pricing tiers, timeline, next steps — as files, not chat |
| Pricing Execution | Deployed pricing pages with competitor research and CTAs |
| Follow-Up Design | Multi-touch sequences with timing, channels, and objection responses |
| Conversion Focus | Every artifact designed to move prospect closer to signing |

### Operations

**@Ops**
| KPI | What to Look For |
|-----|-----------------|
| Coordination Quality | Clear handoffs using protocol, no dropped tasks |
| Blocker Resolution | Identifies and removes obstacles quickly |
| Process Efficiency | Workflows are streamlined, not bureaucratic |
| Status Communication | CEO always knows where things stand |

**@Email**
| KPI | What to Look For |
|-----|-----------------|
| Sequence Design | Triggers, timing, segmentation, A/B subject lines, proven copy frameworks |
| Deliverability & Compliance | DKIM/SPF/DMARC setup, list hygiene, CAN-SPAM/GDPR compliance, spam monitoring |
| Automation Reliability | Error handling, retry logic, logging in Zapier/Make/n8n workflows, no silent failures |
| Lifecycle Strategy | Maps emails to customer lifecycle stages with measurable goals per stage |

### Tools

**@CodeImprover** — Code Review & Refactoring
| KPI | What to Look For |
|-----|-----------------|
| Fix Precision | Changes target the exact issue without over-engineering or collateral edits |
| Pattern Adherence | Respects project's existing patterns (raw SQL vs ORM, file structure, naming) |
| Explanation Clarity | Explanations are proportional to change complexity, not verbose for simple fixes |
| Scope Discipline | Stays focused on the requested review scope, doesn't expand into unasked refactors |

**@SecurityReviewer** — Security Vulnerability Detection
| KPI | What to Look For |
|-----|-----------------|
| Vulnerability Detection | Catches real security issues: SQL injection, XSS, auth bypass, secrets exposure |
| False Positive Rate | Doesn't cry wolf — findings are genuine risks, not pedantic warnings |
| Remediation Quality | Provides specific code fixes alongside vulnerability descriptions, not vague advice |
| Coverage Breadth | Reviews all attack surfaces: inputs, auth, queries, deps, CORS, headers |

### Trading

**@BacktestQuant** — Backtest Architect
| KPI | What to Look For |
|-----|-----------------|
| Walk-Forward Rigor | Every strategy tested out-of-sample with realistic train/test splits |
| Cost Modeling | Includes slippage, commissions, spread, funding costs as separate line items |
| Monte Carlo Quality | Bootstrap simulations with 1000+ iterations, reports confidence intervals |
| Overfit Detection | Flags in-sample vs out-of-sample Sharpe degradation > 40% |

**@RiskQuant** — Risk Quantifier
| KPI | What to Look For |
|-----|-----------------|
| Risk Metric Completeness | Reports full suite: Sharpe, Sortino, Calmar, max drawdown, profit factor, expectancy |
| Position Sizing Accuracy | Kelly criterion with fractional safety margin, adjusted for correlation |
| Drawdown Management | Triggers position reduction at 10% drawdown, flags strategies > 20% max DD |
| Correlation Monitoring | Checks all active pairs (not just majors), flags correlation > 0.7 |

**@RegimeDetector** — Regime Analyst
| KPI | What to Look For |
|-----|-----------------|
| Classification Accuracy | Correctly identifies 5 regime types with quantitative boundaries |
| Transition Detection | Flags transitions before they complete, uses multi-timeframe data (1h + 4h) |
| Threshold Quality | Regime thresholds back-tested on 6+ months, tuned per asset |
| Multi-Factor Coverage | Uses momentum, volatility, volume, correlation, and mean-reversion factors |

**@EdgeMonitor** — Edge Decay Watchdog
| KPI | What to Look For |
|-----|-----------------|
| Alert Timeliness | Catches degradation within 24h, bias checks run daily |
| False Alarm Rate | YELLOW threshold tuned to minimize noise (0.5 not 0.4) |
| Coverage Completeness | Every active model/coin monitored, no blind spots |
| Actionability | Every alert includes specific recommended action (e.g., "reduce position X%") |

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

1. **Rate** — Run `/rate @AgentName` after significant tasks (POSTs to API)
2. **Review** — Weekly `/evaluate-agent` across all active agents
3. **Diagnose** — Identify lowest-scoring criteria
4. **Improve** — Tune agent persona in `agents/[agent-id].md`, then run `/deploy-agents`
5. **Re-evaluate** — Run same/similar task, compare scores
6. **Track** — Save scorecards to `docs/agent-evaluations/scorecards/` for trend analysis

### Action Item Rules

- **Target domain skills**, not meta-workflow behavior
- **Be specific and testable** — "Verify SQL table names via MCP before documenting" not "Be more careful"
- **One item per scorecard** — focus beats breadth
- **Must be implementable** as a persona edit in agent .md files

### What "Improve" Looks Like

| Low Score In | Fix In agents/*.md |
|-------------|---------------------|
| Task Completion | Add "Always complete the full task. Never leave TODOs." to `agents/fullstack.md` |
| Accuracy | Add "Verify all code compiles. Double-check facts." to relevant agent file |
| Efficiency | Add "Solve in minimum steps. Don't over-engineer." to agent persona |
| Judgment | Add decision examples: "When X, do Y. When Z, ask CEO." to agent file |
| Communication | Add "Max 3 paragraphs. Lead with the answer." to agent guidelines |
| Domain Expertise | Add specific tools, frameworks, or best practices to `agents/[name].md` |
| Autonomy | Add "Handle errors yourself. Only escalate if truly blocked." to agent file |
| Safety | Add specific approval gates or validation steps to relevant agent |
| Role KPIs | Add role-specific instructions addressing the gap to agent's .md file |
