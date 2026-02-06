# AgentEval Rating System Architecture

**Author:** Rating System Architect
**Date:** 2026-02-06
**Status:** Research Complete — Ready for Implementation Decisions

---

## Table of Contents

1. [What Exactly Gets Rated](#1-what-exactly-gets-rated)
2. [How to Objectively Measure Agent Quality](#2-how-to-objectively-measure-agent-quality)
3. [The Scoring Pipeline in Detail](#3-the-scoring-pipeline-in-detail)
4. [Rating Types and Their Weight](#4-rating-types-and-their-weight)
5. [Concrete Scoring Examples](#5-concrete-scoring-examples)
6. [Recommendations for AgentEval v1](#6-recommendations-for-agenteval-v1)

---

## 1. What Exactly Gets Rated

### 1.1 The Agent as a Composite Artifact

An agent is not just a persona paragraph. It is the combination of:

| Component | What It Is | How It Affects Quality |
|-----------|-----------|----------------------|
| **CLAUDE.md persona** | Role description, voice, expertise claims | Sets the agent's identity, constraints, and behavioral guardrails |
| **Skills** | Packaged instruction sets the agent can load dynamically | Determines what specialized workflows the agent can perform |
| **Commands** | Slash commands (e.g., `/rate`, `/deploy`) | Defines structured, repeatable operations |
| **MCP config** | Which MCP servers the agent can access | Controls tool access — the difference between an agent that can query databases and one that cannot |
| **Toolbox mapping** | Explicit tool-to-agent assignment | Prevents tool confusion and ensures the right agent uses the right tools |
| **Coordination protocols** | Handoff format, escalation paths, approval gates | Governs multi-agent interactions and safety |

**Key insight:** Two @FullStack agents with identical persona text but different MCP configs and toolbox mappings will perform dramatically differently. The persona is necessary but not sufficient — the full configuration envelope matters.

### 1.2 Dimensions That Make One Agent Config Better Than Another

Beyond the existing 8 universal criteria (Task Completion, Accuracy, Efficiency, Judgment, Communication, Domain Expertise, Autonomy, Safety), there are deeper dimensions that determine real-world agent quality:

#### Configuration Quality Dimensions

| Dimension | What It Measures | Why It Matters |
|-----------|-----------------|----------------|
| **Specificity** | How precisely the persona constrains behavior | Vague personas produce inconsistent outputs. "Write good code" vs "Write TypeScript with strict mode, no any types, parameterized queries for all SQL" |
| **Tool Awareness** | Whether the agent knows what tools it has and when to use them | An agent that tries to `cat` a file instead of using the Read tool wastes tokens and may fail |
| **Error Recovery Instructions** | Whether the persona includes failure-mode guidance | "If build fails, run `npx tsc --noEmit` first" prevents the agent from spinning |
| **Scope Clarity** | Whether the agent knows what it owns and what it does not | Prevents an @FrontendDev from attempting database migrations |
| **Context Efficiency** | How much of the context window the config consumes | A 2000-line CLAUDE.md wastes tokens on every call; a 200-line one with the same effectiveness is strictly better |
| **Composability** | How well the agent works with others in multi-agent workflows | Handoff protocols, state markers, and clear boundaries |

#### Behavioral Quality Dimensions

| Dimension | What It Measures | Example |
|-----------|-----------------|---------|
| **First-pass success rate** | How often output works without corrections | Agent A's code runs on first try 80% of the time; Agent B needs 2-3 rounds |
| **Tool selection accuracy** | Whether the agent picks the right tool for the job | Using Grep instead of `grep` in Bash; using MCP instead of manual API calls |
| **Judgment calibration** | Does the agent ask when it should, and decide when it should? | Over-asking is as bad as under-asking |
| **Recovery speed** | When something fails, how quickly does the agent get back on track? | Does it diagnose the root cause or chase symptoms? |
| **Output consistency** | Given the same task twice, how similar are the results? | High variance = unreliable persona |
| **Appropriate verbosity** | Does output length match the task? | A bug fix should not produce 3 paragraphs of explanation |

### 1.3 What ACTUALLY Makes a @FrontendDev Agent Produce Better Code

Looking at this concretely — two @FrontendDev agents, same underlying LLM (Claude), different configs:

**Agent A (weak):**
```
You are a frontend developer. Build UI components. Use React.
```

**Agent B (strong):**
```
You are a senior frontend developer specializing in Vue 3 + Tailwind CSS 4.
- Use Composition API with <script setup> syntax
- Tailwind CSS 4 @theme {} syntax, not tailwind.config.js
- Mobile-first: design for 375px width, then scale up
- Accessibility: aria-labels, keyboard navigation, color contrast
- Component structure: single-responsibility, props for data, emits for events
- When styling: use glass morphism patterns (backdrop-blur, bg-opacity)
- When unsure about a design choice, present 2 options with tradeoffs
- Never use px for font-size — use rem
- Test: verify all interactive elements work on mobile Safari
```

Agent B will produce dramatically better output because:
1. **Stack specificity** eliminates framework guessing
2. **Design constraints** prevent common mistakes (px font sizes, missing a11y)
3. **Decision protocols** ("present 2 options") prevent paralysis
4. **Testing instructions** catch platform-specific bugs
5. **Pattern references** (glass morphism) establish visual consistency

This is what we are scoring — the delta between a vague config and a precise one, measured by output quality.

---

## 2. How to Objectively Measure Agent Quality

### 2.1 The Three Measurement Approaches

There are fundamentally three ways to measure agent quality, each with different tradeoffs:

| Approach | Objectivity | Scalability | Cost | Signal Quality |
|----------|------------|-------------|------|---------------|
| **Automated benchmarks** (standardized tasks + test suites) | High | High | Low | Good for correctness, weak for style/judgment |
| **LLM-as-judge** (another LLM evaluates outputs) | Medium | High | Medium | Good for nuance, needs calibration |
| **Human evaluation** (expert or community review) | Highest | Low | High | Gold standard, but slow and expensive |

The right answer is a composite — all three, weighted appropriately. More on weights in Section 4.

### 2.2 Automated Benchmarks

#### What a Benchmark Task Looks Like

A benchmark task has four components:

```
BENCHMARK TASK
├── Task Description     (what the agent is asked to do)
├── Input Context        (files, data, constraints provided)
├── Expected Outputs     (what success looks like — can be exact or fuzzy)
└── Evaluation Script    (automated check: tests pass, output matches, etc.)
```

Inspired by SWE-bench's methodology: the agent gets a task and context, produces output, and that output is validated by running tests or checking against expected results. The agent never sees the evaluation criteria — preventing gaming.

#### Example Benchmark Tasks: Fullstack Dev Agent

**Task 1: "Fix the broken API endpoint"**
```
Description: The /api/users endpoint returns 500 when called with a
valid user ID. Fix it.

Input Context:
- A minimal Express.js project with 3 files
- The bug: a typo in the SQL query (SELCT instead of SELECT)
- A test file with 4 tests (2 passing, 2 failing)

Expected Output:
- The 2 failing tests now pass
- The 2 passing tests still pass (no regression)
- Only the file with the bug is modified

Evaluation:
- Run `npm test` — all 4 tests must pass
- Check git diff — only the expected file changed
- Bonus: solution took < 3 tool calls
```

**Task 2: "Add pagination to the products list"**
```
Description: The /api/products endpoint returns all 10,000 products.
Add cursor-based pagination with a default page size of 20.

Input Context:
- Express.js API with PostgreSQL (Neon)
- Existing endpoint returns SELECT * FROM products
- Frontend Vue component that displays products

Expected Output:
- API accepts ?cursor=X&limit=Y parameters
- Response includes { data: [...], nextCursor: "..." }
- Frontend loads first page and has "Load More" button
- SQL uses WHERE id > cursor ORDER BY id LIMIT $limit

Evaluation:
- API tests: correct pagination, edge cases (empty page, first page, last page)
- SQL injection test: cursor parameter is parameterized
- Performance: EXPLAIN shows index scan, not sequential scan
- Frontend: component renders, Load More works
```

**Task 3: "Diagnose the slow dashboard"**
```
Description: The admin dashboard takes 12 seconds to load.
Identify the root cause and fix it.

Input Context:
- Vue 3 dashboard component making 6 API calls on mount
- One API call hits a SQL query with no WHERE clause on a 1M row table
- Missing index on the filtered column

Expected Output:
- Root cause identified (missing index + unfiltered query)
- Database index added via migration
- Query optimized with appropriate WHERE clause
- Dashboard loads in < 2 seconds

Evaluation:
- Migration file created and valid
- EXPLAIN shows index usage
- Component load time measured (simulated)
- No regressions in other tests
```

#### Example Benchmark Tasks: Content Writer Agent

**Task 1: "Write a product launch email"**
```
Description: Write a launch announcement email for LaunchPilot's
new AI content scheduling feature.

Input Context:
- Product brief: AI analyzes engagement data, suggests optimal
  posting times, auto-schedules across 5 platforms
- Brand voice guide: "Clear, confident, never corporate.
  Speak like a smart friend who happens to know marketing."
- Target audience: Solo founders and small marketing teams
- CTA: Start free trial

Expected Output:
- Subject line (< 50 chars)
- Preview text (< 100 chars)
- Email body (150-250 words)
- Clear CTA button text

Evaluation (LLM-as-judge + rubric):
- Subject line: Does it create curiosity? Score 1-10
- Voice match: Does it sound like the brand guide? Score 1-10
- Benefit focus: Features framed as benefits? Score 1-10
- CTA clarity: Is the action obvious? Score 1-10
- Length compliance: Within word count? Binary pass/fail
- Spam trigger words: None present? Binary pass/fail
```

**Task 2: "Write SEO blog intro"**
```
Description: Write the introduction (150-200 words) for a blog post
titled "5 Marketing Automation Mistakes Solo Founders Make"

Input Context:
- Target keyword: "marketing automation mistakes"
- Search intent: informational
- Audience: solo founders, non-technical
- Tone: empathetic, practical

Expected Output:
- Opening hook (problem or question)
- Keyword appears naturally in first 2 sentences
- Preview of what the article covers
- 150-200 words

Evaluation:
- Keyword placement: natural, within first 2 sentences? Binary
- Word count: within range? Binary
- Readability: Flesch-Kincaid grade 6-8? Automated check
- Hook quality: LLM-as-judge, 1-10
- Tone match: LLM-as-judge, 1-10
```

### 2.3 LLM-as-Judge: How It Works Here

The LLM-as-judge approach uses a separate LLM (ideally a stronger or equal model) to evaluate outputs against a rubric. The key challenge is making this consistent and fair.

#### The G-Eval Approach (Recommended)

Based on the G-Eval framework, the most reliable LLM-as-judge structure is:

```
EVALUATION PROMPT STRUCTURE

1. TASK INTRODUCTION
   "You are evaluating the output of an AI agent that was asked to [task].
    The agent's role is [agent type]. Evaluate against the following criteria."

2. EVALUATION CRITERIA (per criterion)
   "Criterion: [Name]
    Definition: [What it measures]
    Scale: 1-10 where 1 = [worst] and 10 = [best]"

3. CHAIN-OF-THOUGHT STEPS (auto-generated or manual)
   "To evaluate [criterion], follow these steps:
    Step 1: [First thing to check]
    Step 2: [Second thing to check]
    Step 3: [Synthesize into a score]"

4. AGENT OUTPUT
   [The actual output being evaluated]

5. SCORING INSTRUCTION
   "For each criterion, provide:
    - Your reasoning (2-3 sentences)
    - Your score (integer 1-10)
    Format: { criterion: string, reasoning: string, score: number }"
```

#### Bias Mitigation

LLM judges have known biases:

| Bias | Description | Mitigation |
|------|-------------|------------|
| **Position bias** | In pairwise comparison, prefers the first or second response | Evaluate both orderings (A,B) and (B,A); only count consistent results |
| **Verbosity bias** | Prefers longer responses regardless of quality | Include explicit instruction: "Length does not indicate quality. Score based on substance." |
| **Self-enhancement bias** | LLM may rate its own outputs higher | Use a different model as judge than the one being evaluated |
| **Anchoring** | First criterion scored influences subsequent scores | Randomize criterion order across evaluations |

#### Ensuring Consistency

- **Use the same judge model** for all evaluations of a given agent type
- **Pin the judge model version** (e.g., claude-sonnet-4-5-20250929, not "latest")
- **Include 2-3 calibration examples** in the prompt showing what a 3, 6, and 9 look like
- **Run each evaluation 3 times** and take the median (reduces noise for ~3x cost)
- **Log all judge reasoning** for auditability

### 2.4 Real-World Performance Tracking

The most valuable signal comes from actual usage. This is harder to capture but highest in validity.

**What can be tracked automatically:**
- Task completion rate (did the agent finish what was asked?)
- Number of tool calls per task (proxy for efficiency)
- Number of correction rounds (how many "no, fix this" messages?)
- Time to completion (wall clock)
- Error rate (build failures, test failures, 500 errors)
- Git diff size (proxy for change scope / over-engineering)

**What requires human input:**
- "Was this output good?" (thumbs up/down after each agent task)
- CEO override scores (the existing `/rate` system)
- Bug reports traced back to agent output

**Proposed tracking flow:**
```
Agent completes task
    → Auto-capture: tool calls, time, errors, diff size
    → Prompt user: "Rate this output 1-5" (optional, low friction)
    → Store as evaluation datapoint
    → Aggregate over time → rolling score
```

---

## 3. The Scoring Pipeline in Detail

### 3.1 End-to-End Flow: Agent Submitted to Public Score

```
PHASE 1: SUBMISSION
─────────────────
Agent config submitted (CLAUDE.md + skills + commands + MCP config)
    → Validation: required fields present, no dangerous instructions
    → Metadata extracted: role type, claimed capabilities, tools used
    → Agent registered in database with status: "pending_evaluation"

PHASE 2: AUTOMATED BENCHMARK
─────────────────────────────
System selects benchmark suite for agent's role type
    → Run 5-10 standardized tasks in isolated environment
    → Each task produces: output, tool call log, timing, pass/fail
    → Automated scoring: test pass rate, efficiency metrics
    → LLM-as-judge scoring: quality rubric per task
    → Result: Benchmark Score (0-10)

PHASE 3: SELF-EVALUATION (Optional)
────────────────────────────────────
Creator runs the agent on their own tasks
    → Creator rates using /rate command
    → Stored as self-evaluation (flagged for lower weight)
    → Result: Self Score (0-10)

PHASE 4: COMMUNITY EVALUATION (Over Time)
──────────────────────────────────────────
Other users install and use the agent
    → After each use, optional 1-5 star rating
    → Optionally, structured feedback on criteria
    → Result: Community Score (0-10), builds over time

PHASE 5: SCORE AGGREGATION
──────────────────────────
Composite Score = weighted average of all signal types
    → Confidence indicator based on evaluation count
    → Score published only when minimum threshold met
    → Re-evaluated periodically (weekly or on config change)

PHASE 6: PUBLIC DISPLAY
────────────────────────
Agent page shows:
    → Composite score with confidence badge
    → Breakdown by category (universal + role KPIs)
    → Score history chart (trend over time)
    → Badge: "Verified" if benchmark suite passed
    → Comparison to category average
```

### 3.2 How Many Evaluations Before a Score Is Reliable?

Drawing from chess Elo (30 games for convergence), npm scoring (combines multiple signals over time), and statistical sampling theory:

| Evaluation Count | Confidence Level | Display |
|-----------------|-----------------|---------|
| 0 | None | "Not yet rated" |
| 1-2 | Very Low | "Preliminary" — show score but with wide confidence interval |
| 3-4 | Low | "Early" — score + disclaimer "based on limited evaluations" |
| 5-9 | Medium | "Developing" — score displayed normally |
| 10-19 | Good | "Established" — score considered reliable |
| 20+ | High | "Mature" — high confidence, trend data meaningful |

**For automated benchmarks:** A single benchmark run of 5-10 tasks provides a reasonable automated score, since tasks are standardized and deterministic evaluation reduces variance.

**For community ratings:** Follow the Bayesian approach — start with a prior (the benchmark score) and update as community ratings come in. This prevents a single 1-star rating from tanking a well-benchmarked agent.

### 3.3 Handling Score Variance

When different evaluators give different scores, you need a strategy:

**Strategy 1: Median over Mean**
- Mean is sensitive to outliers (one 1-star tanks the average)
- Median is robust: the middle value of all ratings
- Use median for display, store mean internally for monitoring

**Strategy 2: Bayesian Averaging (Recommended)**
Inspired by IMDB's weighted rating formula:

```
Weighted Score = (v / (v + m)) * R + (m / (v + m)) * C

Where:
  v = number of evaluations for this agent
  m = minimum evaluations needed for full weight (e.g., 10)
  R = this agent's average raw score
  C = the average score across ALL agents in this category
```

This pulls agents with few ratings toward the category average, preventing small-sample extremes. As evaluations accumulate, the agent's own score dominates.

**Strategy 3: Inter-Rater Reliability Monitoring**
Track Cohen's Kappa between different evaluator types:
- If LLM-judge and human scores have Kappa < 0.4 (fair agreement), flag the rubric for revision
- If two human evaluators have Kappa > 0.6 (substantial agreement), the rubric is working
- Target: Kappa > 0.6 between LLM-judge and human evaluators for each criterion

### 3.4 Statistical Confidence: When Is a Score "Real" vs Noise?

**Wilson Score Interval** is the right tool here. For a 1-10 scale normalized to 0-1:

```
Lower bound = (p + z²/2n - z * sqrt(p(1-p)/n + z²/4n²)) / (1 + z²/n)

Where:
  p = observed proportion (score / 10)
  n = number of evaluations
  z = 1.96 (for 95% confidence)
```

**Practical application:**
- Agent with score 8.0 from 3 evaluations: 95% CI = [5.2, 9.8] — huge range, low confidence
- Agent with score 8.0 from 30 evaluations: 95% CI = [7.4, 8.5] — narrow range, high confidence

**Display recommendation:** Show the score as "8.0 (7.4-8.5)" when the CI is narrow, or just "~8" with a "low confidence" badge when the CI is wide (range > 2 points).

---

## 4. Rating Types and Their Weight

### 4.1 Five Signal Types

| Signal Type | Source | Objectivity | Gaming Risk | Latency |
|-------------|--------|-------------|-------------|---------|
| **Automated benchmark** | Standardized tasks + test suites | High | Medium (can optimize for tests) | Minutes |
| **LLM-as-judge** | AI evaluator with rubric | Medium-High | Low (hard to game a judge) | Minutes |
| **Self-evaluation** | Creator rates own agent | Low | High (obvious conflict of interest) | Immediate |
| **Community evaluation** | Other users rate after using | Medium | Medium (vote manipulation) | Days-Weeks |
| **Real-world outcomes** | Tracked usage metrics | High | Low (hard to fake actual results) | Days-Weeks |

### 4.2 Recommended Weights

**Phase 1 (Launch — limited community):**

| Signal | Weight | Rationale |
|--------|--------|-----------|
| Automated benchmark | 40% | Most objective, available immediately |
| LLM-as-judge | 30% | Captures nuance benchmarks miss |
| Self-evaluation | 15% | Creator knows their agent best, but biased |
| Community evaluation | 10% | Too few ratings initially |
| Real-world outcomes | 5% | Not enough tracking data yet |

**Phase 2 (Mature — active community):**

| Signal | Weight | Rationale |
|--------|--------|-----------|
| Automated benchmark | 25% | Still important but community signal is stronger |
| LLM-as-judge | 20% | Supplementary to human judgment |
| Self-evaluation | 5% | Heavily discounted once community exists |
| Community evaluation | 30% | Large sample size, real user experiences |
| Real-world outcomes | 20% | Strongest signal of actual value |

**Why self-evaluation is discounted but not removed:** Creators genuinely know their agent's intent. A creator rating of "I built this for quick API scaffolding, not production code" is valuable context. But their quality assessment is inherently biased, so it gets minimal weight.

### 4.3 Precedents for This Weighting

- **npm (npms.io):** Quality 40%, Popularity 30%, Maintenance 30% — automated signals weighted highest, community (download counts) second
- **App Store:** Pure community ratings (simple average), no automated component — works because of massive scale
- **Kaggle:** 100% automated (test suite accuracy) — works because tasks have objective answers
- **Chatbot Arena (LMSYS):** 100% community pairwise voting — works because of Elo math and 6M+ votes
- **SWE-bench:** 100% automated (tests pass/fail) — works for narrow correctness evaluation

AgentEval needs to handle subjective quality (like communication style) AND objective correctness (like code that compiles), which is why a composite approach is necessary.

---

## 5. Concrete Scoring Examples

### 5.1 End-to-End Benchmark Run: @FullStack Agent

#### Step 1: Agent Submission

The agent config is registered:
```yaml
name: "@FullStack"
role: "fullstack-developer"
department: "development"
persona: |
  Senior full-stack developer. Ships features end-to-end.
  Tech: Vue 3, Node.js, TypeScript, Tailwind CSS, PostgreSQL...
tools:
  - mcp__Neon__run_sql
  - mcp__Neon__get_database_tables
  - mcp__Neon__prepare_database_migration
commands:
  - /dev
  - /push
skills: []
```

#### Step 2: Benchmark Suite Selected

System selects `fullstack-developer` benchmark suite containing 6 tasks:

| # | Task | Type | Evaluation Method |
|---|------|------|-------------------|
| 1 | Fix broken API endpoint (typo in SQL) | Bug fix | Test suite (4 tests) |
| 2 | Add pagination to product list | Feature | Test suite (8 tests) + LLM-judge (API design quality) |
| 3 | Diagnose slow dashboard | Performance | Test suite (index + timing) |
| 4 | Refactor auth middleware to use JWT | Refactoring | Test suite (12 tests) + LLM-judge (code quality) |
| 5 | Write API documentation for 3 endpoints | Documentation | LLM-judge only (accuracy, completeness, clarity) |
| 6 | Review a PR with 2 intentional bugs + 1 style issue | Code review | Exact match (did agent find the bugs?) |

#### Step 3: Task Execution (Task #2 Example)

```
INPUT:
  Task: "Add cursor-based pagination to /api/products"
  Codebase: express-app/ (3 files, 180 lines)
  Database: products table with 10,000 rows

AGENT EXECUTES:
  1. Reads existing endpoint code (1 tool call)
  2. Reads database schema via MCP (1 tool call)
  3. Modifies API endpoint (1 edit)
  4. Adds pagination parameters with validation (1 edit)
  5. Updates frontend component (1 edit)
  6. Runs tests (1 bash call)
  Total: 6 tool calls, 3 file edits

OUTPUT:
  - Modified: routes/products.js, src/components/ProductList.vue
  - New: (none)
  - Tests: 7/8 passing (edge case for empty last page fails)
```

#### Step 4: Automated Scoring

```
TEST RESULTS: 7/8 passed (87.5%)

EFFICIENCY METRICS:
  Tool calls: 6 (optimal range: 4-8) → Score: 8/10
  Files modified: 2 (optimal: 2-3) → Score: 9/10
  Time: 45 seconds → Score: 9/10

LLM-JUDGE (API Design Quality):
  Criterion: "Cursor-based pagination follows best practices"
  Reasoning: "Uses WHERE id > cursor with ORDER BY and LIMIT.
              Response includes nextCursor field. However, does not
              include totalCount or hasMore boolean for frontend."
  Score: 7/10

LLM-JUDGE (Code Quality):
  Criterion: "Code is clean, typed, follows project patterns"
  Reasoning: "Consistent with existing code style. Added input
              validation for cursor parameter. SQL is parameterized.
              Missing: TypeScript types for the pagination response."
  Score: 7/10
```

#### Step 5: Task Score Aggregation

```
Task #2 Score:
  Test pass rate:      87.5%  → mapped to 8.0/10
  Efficiency:          8.7/10  (avg of tool, file, time)
  LLM-judge avg:       7.0/10  (avg of design + quality)

  Task score = (Test × 0.4) + (Efficiency × 0.3) + (LLM-judge × 0.3)
             = (8.0 × 0.4) + (8.7 × 0.3) + (7.0 × 0.3)
             = 3.2 + 2.61 + 2.1
             = 7.91/10
```

#### Step 6: Benchmark Suite Score

| Task | Score |
|------|-------|
| 1. Fix broken endpoint | 9.2 |
| 2. Add pagination | 7.9 |
| 3. Diagnose slow dashboard | 8.5 |
| 4. Refactor auth middleware | 7.4 |
| 5. Write API docs | 6.8 |
| 6. Review PR | 8.0 |
| **Benchmark Average** | **7.97** |

#### Step 7: Map to Universal Criteria + Role KPIs

The benchmark tasks are designed to test specific criteria. Map results back:

```
UNIVERSAL CRITERIA (from benchmark data):
  Task Completion:    8.5  (5/6 tasks fully complete, 1 partial)
  Accuracy:           8.0  (7/8 tests pass on pagination, all pass on others)
  Efficiency:         8.7  (low tool call count across all tasks)
  Judgment:           7.5  (missed hasMore field, but good SQL decisions)
  Communication:      7.0  (docs task scored 6.8, showing room to improve)
  Domain Expertise:   8.0  (correct patterns, but missing some best practices)
  Autonomy:           9.0  (completed all tasks without asking questions)
  Safety:             9.0  (parameterized queries, no destructive actions)
  Universal Avg:      8.21

ROLE KPIs:
  Code Quality:       7.5  (good but missing types in some places)
  First-Pass Success: 8.0  (pagination test failure, else clean)
  Tool Usage:         8.5  (used MCP for schema, correct tool selection)
  Debugging Speed:    8.5  (identified slow query root cause quickly)
  Role Avg:           8.13

OVERALL = (8.21 × 0.6) + (8.13 × 0.4) = 4.93 + 3.25 = 8.18/10 — Strong
```

### 5.2 What the Public Score Display Looks Like

```
┌──────────────────────────────────────────────┐
│  @FullStack                                  │
│  by Dizid Web Development                    │
│                                              │
│  ★ 8.2/10  Strong                           │
│  ████████░░  82%                            │
│                                              │
│  Confidence: ●●●●○ (Established)            │
│  Based on: 14 evaluations                    │
│                                              │
│  Breakdown:                                  │
│  Universal:    8.2/10  ████████░░            │
│  Role KPIs:    8.1/10  ████████░░            │
│                                              │
│  Top: Autonomy (9.0), Safety (9.0)          │
│  Improve: Communication (7.0), Code Qual (7.5│
│                                              │
│  Badges: [Verified ✓] [Benchmark Passed]     │
│  Trend: ↑ +0.3 from last month              │
└──────────────────────────────────────────────┘
```

---

## 6. Recommendations for AgentEval v1

### 6.1 What to Build First (MVP Scope)

Given the existing framework and HANDOFF.md vision, here is the recommended build order:

**Tier 1 — Must Have (Week 1-2):**
1. Agent Registry (CRUD for agent configs)
2. Manual evaluation flow (digitize the existing `/rate` command into an app)
3. Scorecard storage and display (replace markdown files with database)
4. Score trend chart (line graph per agent over time)

**Tier 2 — High Value (Week 3-4):**
5. Benchmark task runner (start with 3-5 tasks per role type)
6. LLM-as-judge integration (G-Eval style, rubric per criterion)
7. Automated scoring pipeline (submit agent → get benchmark score)
8. Composite score calculation (Bayesian average of all signal types)

**Tier 3 — Growth (Week 5+):**
9. Community ratings (other users can rate agents they use)
10. Pairwise comparison ("which agent handled this better?")
11. Real-world tracking (instrument agent sessions for auto-metrics)
12. Public agent pages with confidence badges

### 6.2 Scoring Formula (Refined)

Keep the existing formula structure but add the composite signal weighting:

```
Per-Evaluation Score:
  = (Universal Avg × 0.6) + (Role KPI Avg × 0.4)

Composite Score (across all signal types):
  = Σ (signal_weight × signal_score) for each signal type

Displayed Score (Bayesian smoothed):
  = (v / (v + m)) × R + (m / (v + m)) × C

  Where v = eval count, m = 10, R = raw composite, C = category average
```

### 6.3 Key Design Decisions to Make

| Decision | Options | Recommendation |
|----------|---------|----------------|
| **Judge model** | Same model as agent (Claude) vs different model | Different — use Claude Sonnet 4.5 as judge for Opus agents (faster, cheaper, prevents self-enhancement bias) |
| **Benchmark environment** | Docker containers vs sandboxed local | Docker for v2; for v1, use Claude Code's existing sandbox |
| **Score granularity** | Integer 1-10 vs decimal 0.0-10.0 | Decimal internally, display as X.X (one decimal place) |
| **Public vs private scores** | All scores public vs opt-in | Private by default, publish when creator chooses |
| **Score freshness** | Static vs rolling window | Rolling 90-day window for community scores; benchmarks re-run on config change |
| **Minimum for display** | How many evals before showing score | 1 eval = "Preliminary", 5 evals = "Developing", 10+ = "Established" |

### 6.4 LLM-as-Judge Prompt Template (Ready to Use)

```
You are evaluating the output of an AI agent configuration.

AGENT BEING EVALUATED:
- Role: {agent_role}
- Task: {task_description}

AGENT OUTPUT:
{agent_output}

EVALUATION CRITERIA:
{for each criterion}
  Criterion: {criterion_name}
  Definition: {criterion_definition}

  Scoring Guide:
  - 9-10 (Elite): {elite_description}
  - 7-8 (Strong): {strong_description}
  - 5-6 (Adequate): {adequate_description}
  - 3-4 (Weak): {weak_description}
  - 1-2 (Failing): {failing_description}
{end for}

CALIBRATION EXAMPLES:
- A score of 3 looks like: {example_of_3}
- A score of 6 looks like: {example_of_6}
- A score of 9 looks like: {example_of_9}

INSTRUCTIONS:
For each criterion:
1. Examine the agent output against the criterion definition
2. Identify specific evidence (quote relevant parts)
3. Compare against the scoring guide
4. Assign an integer score 1-10

Important:
- Length does not indicate quality. Score based on substance.
- Judge the OUTPUT, not the agent's stated capabilities.
- If you cannot evaluate a criterion from the given output, mark it N/A.

Respond as JSON:
{
  "evaluations": [
    {
      "criterion": "string",
      "evidence": "string (specific quote or observation)",
      "reasoning": "string (2-3 sentences)",
      "score": number
    }
  ],
  "overall_impression": "string (1 sentence summary)"
}
```

### 6.5 What We Learned from Other Platforms

| Platform | What They Do Well | What We Should Adopt |
|----------|-------------------|---------------------|
| **npm/npms.io** | Composite score from automated signals (quality, popularity, maintenance) | Multi-dimensional scoring with clear category breakdown |
| **SWE-bench** | Objective task evaluation with hidden test suites | Agent never sees evaluation criteria; prevents gaming |
| **Chatbot Arena (LMSYS)** | Pairwise comparison eliminates absolute scale bias | Add pairwise mode: "Which agent handled this better?" |
| **App Store** | Simple 5-star community ratings at massive scale | Low-friction community rating (1-5 stars post-use) |
| **Kaggle** | Public + private leaderboard prevents overfitting | Benchmark has a hidden test set agent cannot optimize for |
| **G-Eval** | Chain-of-thought reasoning improves judge consistency | Always require reasoning before score in LLM-as-judge |
| **Chess Elo** | ~30 games for convergence; provisional vs established | Clear confidence tiers based on evaluation count |

---

## 7. MVP Addendum: The Minimum Viable Rating System

### 7.1 Can v1 Ship Without Automated Benchmarks?

**Yes, and it should.**

Automated benchmarks are the highest-engineering-cost component of the entire system. They require: designing tasks per role type, building isolated execution environments, writing test suites, building a task runner. That is weeks of work before a single user touches the product.

The MVP should ship with two signal types only:

| Signal | MVP Role | Why It Works |
|--------|----------|-------------|
| **Creator evaluation** (self + team) | Primary signal at launch | The existing `/rate` flow already works. Digitize it into the app. |
| **Community evaluation** | Grows over time | Simple 1-5 stars + optional structured criteria. Low friction. |

This is the App Store model — it works at scale with just community ratings. The key difference for MVP: since there is no massive community yet, the creator's own evaluations carry more weight initially and decay as community evaluations accumulate.

**What you lose without automated benchmarks:**
- Objectivity (all signals are subjective)
- New-agent bootstrapping (no instant score at submission time)
- Anti-gaming protection (self-evaluation is inherently biased)

**Why that is acceptable for v1:**
- The product's initial value proposition is "track and improve YOUR agents" not "discover the best agents globally"
- Self-evaluation bias matters when comparing agents across creators; it matters much less when one creator is tracking their own agents over time (they are biased consistently, so trend data is still valid)
- Automated benchmarks can be layered in as v2 without changing the data model — just add a new evaluation source type

#### MVP Scoring Formula (Simplified)

```
MVP Score = (Universal Avg x 0.6) + (Role KPI Avg x 0.4)
```

Same formula as FRAMEWORK.md. No composite weighting across signal types — that only matters when you have multiple signal types to combine. For v1, each evaluation produces one score using this formula. The agent's displayed score is the Bayesian-smoothed average of all its evaluations.

```
Displayed Score = (v / (v + m)) * R + (m / (v + m)) * C

Where:
  v = number of evaluations for this agent
  m = 5 (lower than v2's 10, because fewer evaluations exist overall)
  R = this agent's average score across all evaluations
  C = 6.0 (neutral midpoint; replaced by actual category average once you have 20+ agents)
```

Why m=5 and C=6.0: With only 12 agents at launch, there is no meaningful "category average" yet. Using 6.0 (midpoint of the 1-10 scale) as the prior is conservative — it says "we assume this agent is average until proven otherwise." Setting m=5 means after just 5 evaluations, the agent's own data dominates (71% weight). This is appropriate for a small, creator-driven system.

### 7.2 Minimum Evaluations Before Showing a Score Publicly

For MVP, the threshold should be **aggressive (low)** to give early users immediate feedback:

| Evaluations | Display | Rationale |
|------------|---------|-----------|
| 0 | "No ratings yet" | Cannot show what does not exist |
| 1 | Show score + "Based on 1 evaluation" label | One data point is better than none for the creator. They need to see something to stay engaged. |
| 3+ | Show score normally | Three evaluations provides minimum meaningful signal |

**For public/marketplace display (when that exists):** Require 3 evaluations minimum to appear in search/browse. Agents with 1-2 evaluations are visible only via direct link.

**Why not require more?** The GPT Store shows ratings after a single review. The App Store shows ratings immediately. At MVP scale (12-50 agents, single-digit users), requiring 10+ evaluations means most agents never get a displayed score. The Bayesian smoothing (pulling toward 6.0 with few ratings) already protects against small-sample extremes.

**Confidence badges for MVP:**

| Evaluations | Badge |
|------------|-------|
| 1-2 | "New" |
| 3-9 | "Early" |
| 10+ | "Established" |

Three tiers instead of the five from the full architecture. Simple enough to implement in a UI badge component.

### 7.3 Bootstrapping with the 12 Dizid Agents

The 12 existing agents are a perfect bootstrap dataset. Here is the concrete plan:

#### Step 1: Seed the Agent Registry

Import all 12 agents from `agents/CLAUDE-TEAM.md`:

```
@FullStack  → role: fullstack-developer,  dept: development
@Product    → role: product-designer,     dept: development
@Platform   → role: devops-security,      dept: development
@Data       → role: analytics-ml,         dept: development
@Growth     → role: growth-marketer,      dept: marketing
@Content    → role: content-writer,       dept: marketing
@Brand      → role: brand-manager,        dept: marketing
@Community  → role: community-pr,         dept: marketing
@Ops        → role: operations,           dept: operations
@Integration→ role: api-integrations,     dept: operations
@Publishing → role: content-ops,          dept: operations
@QA         → role: quality-assurance,    dept: operations
```

#### Step 2: Import Existing Scorecard

The `scorecards/fullstack-2026-02-06.md` becomes the first evaluation in the database:

```
agent: @FullStack
date: 2026-02-06
evaluator_type: self (creator)
task: "Rebuild CLAUDE-TEAM.md, create slash commands, build evaluation framework"
scores:
  task_completion: 9
  accuracy: 8
  efficiency: 7
  judgment: 9
  communication: 8
  domain_expertise: 8
  autonomy: 9
  safety: 9
  code_quality: 8
  first_pass_success: 7
  tool_usage: 8
  debugging_speed: null (N/A)
overall: 8.1
rating_label: "Strong"
action_item: "Verify SQL table/column names via MCP before including them"
```

#### Step 3: Rate the Other 11 Agents

This is the key bootstrapping action. The CEO should do a quick `/rate` for each of the other 11 agents based on recent work. Even rough scores create initial data that:

1. Populates the dashboard (not empty on day 1)
2. Establishes a category average (C in the Bayesian formula becomes real data)
3. Identifies which agents need the most improvement (directing effort)
4. Tests the evaluation UI flow with real data

**Estimated effort:** 15-20 minutes total (12 agents x ~90 seconds each for a quick evaluation). Some agents like @QA and @Publishing may not have recent work to evaluate — mark them as "No recent activity" rather than forcing a score.

#### Step 4: The Bootstrap Creates Instant Value

After bootstrapping:
- 12 agents in registry
- 8-12 evaluations (some agents may not have enough recent work)
- Category averages for each department
- At least 1 trend data point for @FullStack
- An immediate ranked view showing strongest and weakest agents

This is already useful on day 1 — the CEO can see at a glance which agents need persona improvements, which is the core value proposition.

### 7.4 What Is "Good Enough" for MVP vs What Waits for v2

| Feature | MVP (v1) | v2 | Why Wait |
|---------|----------|-----|----------|
| **Scoring formula** | `(Universal x 0.6) + (Role KPI x 0.4)` simple average | Composite multi-signal with Bayesian smoothing | One signal type in v1 makes composite weighting unnecessary |
| **Evaluation input** | Manual form (digitized `/rate`) | Manual + LLM-as-judge + automated benchmarks | LLM-as-judge needs prompt tuning, benchmarks need task design |
| **Score display** | Single number + rating label (e.g., "8.1 Strong") | Score + confidence interval + trend chart + badges | Confidence intervals and trends need data over time |
| **Agent registry** | Name, role, department, persona text, KPI definitions | + skills, commands, MCP config, version history | Full config envelope is complex to model; persona text captures 80% of value |
| **Trend tracking** | Simple: current score vs previous score, with arrow (up/down/stable) | Rolling 90-day line chart with per-criterion breakdown | Charts need 5+ data points to be meaningful |
| **Comparison** | Ranked list sorted by score within department | Side-by-side comparison, pairwise A/B testing | Pairwise needs task runner infrastructure |
| **Action items** | Free text field on evaluation (as today) | Structured: status tracking (pending/applied/rejected), linked to persona diffs | Status tracking is nice but not essential for "improve agent" loop |
| **Community ratings** | Not in v1 | 1-5 star + optional criterion-level scores from other users | No community exists yet |
| **Export** | Scorecard as markdown (matches existing format) | Generate CLAUDE-TEAM.md from app, API export | App becomes source of truth only when it proves its value first |
| **Auth** | Simple bearer token or none (single user, localhost) | OAuth or API key for multi-user | Single user at launch |

#### The MVP Feature Stack (Ordered by Priority)

```
MUST BUILD (launches broken without these):
  1. Agent list page (12 agents, grouped by department)
  2. Evaluation form (8 universal + 3-4 role KPIs, 1-10 scale with notes)
  3. Score calculation (auto-compute overall from inputs)
  4. Scorecard view (see one evaluation in detail)
  5. Agent detail page (latest score + list of all evaluations)

SHOULD BUILD (significantly better experience):
  6. Dashboard home (ranked agents, department summaries)
  7. Trend indicator (current vs previous: arrow up/down/stable)
  8. Action item field (free text, linked to evaluation)
  9. Import existing data (seed from CLAUDE-TEAM.md + existing scorecard)

NICE TO HAVE (polish):
  10. Score history list per agent
  11. Department average scores
  12. Export scorecard as markdown
  13. Mobile-optimized layout (CEO uses phone)
```

Items 1-5 are the minimum viable product. Items 6-9 make it significantly more useful. Items 10-13 are polish.

### 7.5 MVP Data Model (Simplified)

The full architecture document proposed 5 tables. MVP needs 3:

```sql
-- Table 1: Agents
CREATE TABLE agents (
  id          TEXT PRIMARY KEY,        -- e.g., "fullstack"
  name        TEXT NOT NULL,           -- e.g., "@FullStack"
  department  TEXT NOT NULL,           -- "development" | "marketing" | "operations"
  role        TEXT NOT NULL,           -- e.g., "fullstack-developer"
  persona     TEXT,                    -- persona text from CLAUDE-TEAM.md
  kpi_definitions JSONB,              -- [{ name: "Code Quality", description: "..." }, ...]
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Table 2: Evaluations
CREATE TABLE evaluations (
  id              SERIAL PRIMARY KEY,
  agent_id        TEXT REFERENCES agents(id),
  evaluator_type  TEXT DEFAULT 'self',  -- "self" | "community" | "benchmark" | "llm-judge"
  task_description TEXT,
  scores          JSONB NOT NULL,       -- { task_completion: 9, accuracy: 8, ... }
  universal_avg   NUMERIC(3,1),         -- computed on insert
  role_avg        NUMERIC(3,1),         -- computed on insert
  overall         NUMERIC(3,1),         -- computed: (universal*0.6)+(role*0.4)
  rating_label    TEXT,                 -- "Elite" | "Strong" | "Adequate" | "Weak" | "Failing"
  top_strength    TEXT,
  top_weakness    TEXT,
  action_item     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Table 3: Agent Scores (materialized/cached)
CREATE TABLE agent_scores (
  agent_id        TEXT PRIMARY KEY REFERENCES agents(id),
  eval_count      INTEGER DEFAULT 0,
  raw_avg         NUMERIC(3,1),         -- simple average of all evaluation.overall
  displayed_score NUMERIC(3,1),         -- Bayesian smoothed
  rating_label    TEXT,
  confidence      TEXT,                 -- "New" | "Early" | "Established"
  previous_score  NUMERIC(3,1),         -- for trend arrow
  trend           TEXT,                 -- "up" | "down" | "stable"
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

**Why JSONB for scores:** The number and names of KPIs vary per agent role. @FullStack has "Code Quality, First-Pass Success, Tool Usage, Debugging Speed". @Content has "Writing Quality, SEO Integration, Conversion Focus, Adaptability". Storing as JSONB avoids a complex normalized schema for v1 while still being queryable.

**Why a cached agent_scores table:** Recalculating Bayesian scores from all evaluations on every page load is wasteful. Update `agent_scores` whenever a new evaluation is inserted (trigger or application code). This makes the agent list page a simple `SELECT * FROM agent_scores ORDER BY displayed_score DESC`.

### 7.6 The One Architectural Decision That Matters Most for MVP

**Store evaluations as structured data from day 1, not as markdown files.**

The existing system stores scorecards as markdown in `scorecards/`. This works for manual review but makes it impossible to:
- Calculate averages across agents
- Show trend charts
- Sort/filter agents by score
- Compare criteria across agents

The single most important architectural decision is: evaluations go into a database (even SQLite) with structured fields. The markdown export can be generated from the database, but the database cannot be reconstructed from markdown.

This does NOT mean you need PostgreSQL or Neon at launch. SQLite is sufficient for v1:
- Single user, single machine
- No concurrent writes
- Embedded, zero config
- Can migrate to PostgreSQL later if needed

### 7.7 MVP Timeline Estimate

For a solo developer working with Claude Code agents:

| Phase | Scope | Estimate |
|-------|-------|----------|
| Setup | Vite + Vue 3 + Tailwind 4 + SQLite | Half day |
| Agent registry | Import 12 agents, list/detail pages | Half day |
| Evaluation form | 8 universal + role KPIs, score calculation | 1 day |
| Scorecard display | View evaluation, export as markdown | Half day |
| Dashboard | Ranked list, department grouping, trend arrows | 1 day |
| Bootstrap | Import existing data, rate remaining agents | 2 hours |
| Polish | Mobile layout, dark mode, glass morphism | Half day |
| **Total** | | **~4 days** |

This gets the 12 Dizid agents rated, trackable, and improvable in under a week. Community features, LLM-as-judge, and automated benchmarks come in v2 once the core loop (rate → diagnose → improve → re-evaluate) is validated.

---

## Sources

### Evaluation Frameworks & Benchmarks
- [30 LLM Evaluation Benchmarks - Evidently AI](https://www.evidentlyai.com/llm-guide/llm-benchmarks)
- [Evaluation and Benchmarking of LLM Agents: A Survey - ACM](https://dl.acm.org/doi/10.1145/3711896.3736570)
- [SWE-bench: Can Language Models Resolve Real-world Github Issues?](https://www.swebench.com/SWE-bench/)
- [SWE-bench Verified - OpenAI](https://openai.com/index/introducing-swe-bench-verified/)
- [8 Benchmarks Shaping the Next Generation of AI Agents](https://ainativedev.io/news/8-benchmarks-shaping-the-next-generation-of-ai-agents)
- [Terminal-Bench: Evaluating AI Agents on Real-World Terminal Tasks](https://www.flowhunt.io/blog/terminal-bench-evaluating-ai-agents-on-real-world-terminal-tasks/)

### LLM-as-Judge
- [LLM-as-a-judge: Complete Guide - Evidently AI](https://www.evidentlyai.com/llm-guide/llm-as-a-judge)
- [LLM-As-Judge: 7 Best Practices - Monte Carlo Data](https://www.montecarlodata.com/blog-llm-as-judge/)
- [G-Eval: The Definitive Guide - Confident AI](https://www.confident-ai.com/blog/g-eval-the-definitive-guide)
- [G-Eval - DeepEval Documentation](https://deepeval.com/docs/metrics-llm-evals)
- [LLM-as-a-Judge Cookbook - Hugging Face](https://huggingface.co/learn/cookbook/en/llm_judge)

### Scoring & Rating Systems
- [How Not To Sort By Average Rating - Evan Miller](https://www.evanmiller.org/how-not-to-sort-by-average-rating.html)
- [Wilson Lower Bound Score and Bayesian Approximation - Medium](https://medium.com/tech-that-works/wilson-lower-bound-score-and-bayesian-approximation-for-k-star-scale-rating-to-rate-products-c67ec6e30060)
- [How npmjs.com Calculates Code Quality - CodeLessGenie](https://www.codelessgenie.com/blog/how-npmjs-com-calculates-the-code-quality/)
- [npms.io Scoring](https://www.npmjs.com/package/package-quality)

### Marketplace & Community Rating Precedents
- [Chatbot Arena: Benchmarking LLMs in the Wild - LMSYS](https://lmsys.org/blog/2023-05-03-arena/)
- [Chatbot Arena Review 2025 - Skywork AI](https://skywork.ai/blog/chatbot-arena-lmsys-review-2025/)
- [OpenAI GPT Store - Ratings and Profiles](https://www.maginative.com/article/openai-adds-ratings-and-rich-profiles-to/)
- [Claude Code Plugin Marketplace](https://code.claude.com/docs/en/plugin-marketplaces)

### Statistical Methods
- [Interrater Reliability: The Kappa Statistic - PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC3900052/)
- [Elo Rating System - Wikipedia](https://en.wikipedia.org/wiki/Elo_rating_system)
- [Wilson CI - Statistics How To](https://www.statisticshowto.com/wilson-ci/)
