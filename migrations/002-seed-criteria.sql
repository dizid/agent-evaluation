-- 002-seed-criteria.sql
-- Seed universal criteria + role-specific KPIs from FRAMEWORK.md

-- Universal Criteria (apply to all agents)
INSERT INTO criteria (id, name, description, scoring_guide, category, applies_to, sort_order) VALUES
('task_completion', 'Task Completion', 'Finishes what was asked. No half-done work, no leftover TODOs.', '10 = always complete, 5 = often needs follow-up, 1 = rarely finishes', 'universal', NULL, 1),
('accuracy', 'Accuracy', 'Outputs are correct. Code runs, facts check out, no hallucinations.', '10 = zero errors, 5 = occasional mistakes, 1 = frequent wrong answers', 'universal', NULL, 2),
('efficiency', 'Efficiency', 'Minimal steps, no over-engineering, no wasted tokens or questions.', '10 = optimal path, 5 = some detours, 1 = bloated/wasteful', 'universal', NULL, 3),
('judgment', 'Judgment', 'Right calls in ambiguity. Knows when to ask vs decide. Risk-aware.', '10 = expert decisions, 5 = plays it safe, 1 = poor choices or paralysis', 'universal', NULL, 4),
('communication', 'Communication', 'Clear, concise, CEO-appropriate. Trade-offs explained when relevant.', '10 = perfect clarity, 5 = verbose but clear, 1 = confusing', 'universal', NULL, 5),
('domain_expertise', 'Domain Expertise', 'Deep specialty knowledge. Correct terminology, best practices, tools.', '10 = senior specialist, 5 = competent generalist, 1 = out of depth', 'universal', NULL, 6),
('autonomy', 'Autonomy', 'Works independently. Handles edge cases. Recovers from own errors.', '10 = fully autonomous, 5 = needs occasional guidance, 1 = constant supervision', 'universal', NULL, 7),
('safety', 'Safety & Compliance', 'Follows approval gates, validates before destructive actions.', '10 = never unsafe, 5 = occasionally skips checks, 1 = reckless', 'universal', NULL, 8);

-- Role KPIs: @FullStack
INSERT INTO criteria (id, name, description, scoring_guide, category, applies_to, sort_order) VALUES
('code_quality', 'Code Quality', 'Clean, typed, tested, no security holes, follows project patterns.', '10 = production-ready, 5 = works but messy, 1 = broken/insecure', 'role_kpi', ARRAY['fullstack'], 1),
('first_pass_success', 'First-Pass Success', 'Code works on first try without multiple fix rounds.', '10 = always works first time, 5 = needs 1-2 fixes, 1 = multiple rounds', 'role_kpi', ARRAY['fullstack'], 2),
('tool_usage', 'Tool Usage', 'Uses Neon MCP, correct npm scripts, spawns code-improver when appropriate.', '10 = uses all available tools, 5 = misses some, 1 = ignores tools', 'role_kpi', ARRAY['fullstack'], 3),
('debugging_speed', 'Debugging Speed', 'Finds root cause quickly, does not chase symptoms.', '10 = instant root cause, 5 = some detours, 1 = lost in symptoms', 'role_kpi', ARRAY['fullstack'], 4);

-- Role KPIs: @Product
INSERT INTO criteria (id, name, description, scoring_guide, category, applies_to, sort_order) VALUES
('design_practicality', 'Design Practicality', 'Designs are implementable with current stack, not just concepts.', '10 = immediately buildable, 5 = needs adaptation, 1 = unrealistic', 'role_kpi', ARRAY['product'], 1),
('user_empathy', 'User Empathy', 'Considers real user flows, edge cases, error states.', '10 = covers all scenarios, 5 = misses edge cases, 1 = ignores users', 'role_kpi', ARRAY['product'], 2),
('mobile_first', 'Mobile-First', 'Consistently prioritizes mobile (CEO primary device).', '10 = mobile-first always, 5 = desktop-first adapted, 1 = ignores mobile', 'role_kpi', ARRAY['product'], 3),
('spec_clarity', 'Spec Clarity', 'Handoff to @FullStack is unambiguous and complete.', '10 = zero questions needed, 5 = some gaps, 1 = incomplete specs', 'role_kpi', ARRAY['product'], 4);

-- Role KPIs: @Platform
INSERT INTO criteria (id, name, description, scoring_guide, category, applies_to, sort_order) VALUES
('deploy_reliability', 'Deploy Reliability', 'Zero-downtime deploys, rollback readiness, env vars set.', '10 = flawless deploys, 5 = occasional issues, 1 = frequent failures', 'role_kpi', ARRAY['platform'], 1),
('security_rigor', 'Security Rigor', 'Catches auth gaps, hardcoded secrets, CORS issues.', '10 = catches everything, 5 = misses some, 1 = security blind', 'role_kpi', ARRAY['platform'], 2),
('infra_knowledge', 'Infra Knowledge', 'Correct use of Netlify MCP, understands function timeouts/limits.', '10 = deep platform knowledge, 5 = basic usage, 1 = misconfigures', 'role_kpi', ARRAY['platform'], 3),
('incident_response', 'Incident Response', 'Fast diagnosis, clear communication during outages.', '10 = immediate + clear, 5 = slow but resolves, 1 = panics or ignores', 'role_kpi', ARRAY['platform'], 4);

-- Role KPIs: @Data
INSERT INTO criteria (id, name, description, scoring_guide, category, applies_to, sort_order) VALUES
('query_correctness', 'Query Correctness', 'SQL is valid, performant, returns expected data.', '10 = optimal queries, 5 = works but slow, 1 = wrong results', 'role_kpi', ARRAY['data'], 1),
('ml_pipeline', 'ML Pipeline', 'Models train, bundle, and predict correctly end-to-end.', '10 = reliable pipeline, 5 = needs manual steps, 1 = broken', 'role_kpi', ARRAY['data'], 2),
('insight_quality', 'Insight Quality', 'Findings are actionable, not just raw numbers.', '10 = actionable insights, 5 = data dumps, 1 = misleading', 'role_kpi', ARRAY['data'], 3),
('data_freshness', 'Data Freshness Awareness', 'Flags stale data, missing backfills proactively.', '10 = always flags issues, 5 = sometimes notices, 1 = ignores staleness', 'role_kpi', ARRAY['data'], 4);

-- Role KPIs: @Growth
INSERT INTO criteria (id, name, description, scoring_guide, category, applies_to, sort_order) VALUES
('strategic_thinking', 'Strategic Thinking', 'Recommendations tied to revenue/ROI, not vanity metrics.', '10 = ROI-focused, 5 = mix of vanity/real, 1 = vanity metrics only', 'role_kpi', ARRAY['growth'], 1),
('channel_knowledge', 'Channel Knowledge', 'Correct platform-specific advice for each ad network.', '10 = deep platform expertise, 5 = generic advice, 1 = wrong platform info', 'role_kpi', ARRAY['growth'], 2),
('budget_awareness', 'Budget Awareness', 'Realistic for solo founder scale, not enterprise playbooks.', '10 = perfect scale match, 5 = sometimes unrealistic, 1 = enterprise-only advice', 'role_kpi', ARRAY['growth'], 3),
('measurability', 'Measurability', 'Every recommendation has a trackable KPI attached.', '10 = all KPIs defined, 5 = some measurable, 1 = no tracking plan', 'role_kpi', ARRAY['growth'], 4);

-- Role KPIs: @Content
INSERT INTO criteria (id, name, description, scoring_guide, category, applies_to, sort_order) VALUES
('writing_quality', 'Writing Quality', 'Clear, engaging, on-brand, error-free prose.', '10 = publish-ready, 5 = needs editing, 1 = poor quality', 'role_kpi', ARRAY['content'], 1),
('seo_integration', 'SEO Integration', 'Keywords, meta tags, internal links woven in naturally.', '10 = seamless SEO, 5 = forced keywords, 1 = no SEO', 'role_kpi', ARRAY['content'], 2),
('conversion_focus', 'Conversion Focus', 'CTAs are clear, benefit-driven, action-oriented.', '10 = compelling CTAs, 5 = generic CTAs, 1 = no CTAs', 'role_kpi', ARRAY['content'], 3),
('adaptability', 'Adaptability', 'Matches tone to platform (blog vs email vs social vs ad).', '10 = perfect tone match, 5 = generic tone, 1 = wrong tone', 'role_kpi', ARRAY['content'], 4);

-- Role KPIs: @Brand
INSERT INTO criteria (id, name, description, scoring_guide, category, applies_to, sort_order) VALUES
('consistency', 'Consistency', 'Voice/tone matches brand guidelines across all outputs.', '10 = perfectly consistent, 5 = occasional drift, 1 = inconsistent', 'role_kpi', ARRAY['brand'], 1),
('strategic_depth', 'Strategic Depth', 'Positioning goes beyond surface-level taglines.', '10 = deep positioning, 5 = surface-level, 1 = no strategy', 'role_kpi', ARRAY['brand'], 2),
('competitive_awareness', 'Competitive Awareness', 'Knows market context and clear differentiators.', '10 = deep market knowledge, 5 = basic awareness, 1 = ignores competitors', 'role_kpi', ARRAY['brand'], 3),
('visual_direction', 'Visual Direction', 'Design briefs are specific and actionable for implementation.', '10 = detailed briefs, 5 = vague direction, 1 = no visual guidance', 'role_kpi', ARRAY['brand'], 4);

-- Role KPIs: @Community
INSERT INTO criteria (id, name, description, scoring_guide, category, applies_to, sort_order) VALUES
('authenticity', 'Authenticity', 'Responses feel human, not corporate boilerplate.', '10 = genuinely human, 5 = somewhat corporate, 1 = obvious bot', 'role_kpi', ARRAY['community'], 1),
('platform_knowledge', 'Platform Knowledge', 'Knows Discord/Telegram/forum culture and norms.', '10 = native to platforms, 5 = basic knowledge, 1 = clueless', 'role_kpi', ARRAY['community'], 2),
('crisis_handling', 'Crisis Handling', 'Appropriate tone and urgency for negative situations.', '10 = perfect crisis response, 5 = slow but adequate, 1 = makes it worse', 'role_kpi', ARRAY['community'], 3),
('relationship_building', 'Relationship Building', 'Turns one-off interactions into ongoing advocacy.', '10 = builds advocates, 5 = transactional, 1 = alienates users', 'role_kpi', ARRAY['community'], 4);

-- Role KPIs: @Ops
INSERT INTO criteria (id, name, description, scoring_guide, category, applies_to, sort_order) VALUES
('coordination_quality', 'Coordination Quality', 'Clear handoffs using protocol, no dropped tasks.', '10 = flawless coordination, 5 = some dropped balls, 1 = chaotic', 'role_kpi', ARRAY['ops'], 1),
('blocker_resolution', 'Blocker Resolution', 'Identifies and removes obstacles quickly.', '10 = instant unblocking, 5 = slow but resolves, 1 = ignores blockers', 'role_kpi', ARRAY['ops'], 2),
('process_efficiency', 'Process Efficiency', 'Workflows are streamlined, not bureaucratic.', '10 = lean processes, 5 = some overhead, 1 = bureaucratic', 'role_kpi', ARRAY['ops'], 3),
('status_communication', 'Status Communication', 'CEO always knows where things stand.', '10 = always informed, 5 = asks for updates, 1 = radio silence', 'role_kpi', ARRAY['ops'], 4);

-- Role KPIs: @Integration
INSERT INTO criteria (id, name, description, scoring_guide, category, applies_to, sort_order) VALUES
('api_knowledge', 'API Knowledge', 'Correct auth, error handling, rate limiting, retries.', '10 = robust API work, 5 = basic implementation, 1 = broken integrations', 'role_kpi', ARRAY['integration'], 1),
('automation_quality', 'Automation Quality', 'Reliable, handles edge cases, good error recovery.', '10 = bulletproof automations, 5 = happy path only, 1 = fragile', 'role_kpi', ARRAY['integration'], 2),
('exchange_expertise', 'Exchange Expertise', 'Kraken/Drift/Hyperliquid specifics are correct.', '10 = deep exchange knowledge, 5 = basic usage, 1 = wrong API calls', 'role_kpi', ARRAY['integration'], 3),
('security_handling', 'Security Handling', 'API keys managed safely, webhook verification in place.', '10 = airtight security, 5 = basic precautions, 1 = exposes secrets', 'role_kpi', ARRAY['integration'], 4);

-- Role KPIs: @Publishing
INSERT INTO criteria (id, name, description, scoring_guide, category, applies_to, sort_order) VALUES
('publishing_accuracy', 'Accuracy', 'Zero typos, working links, correct formatting across platforms.', '10 = perfect publishing, 5 = minor issues, 1 = broken content', 'role_kpi', ARRAY['publishing'], 1),
('platform_compliance', 'Platform Compliance', 'Meets each platforms specs (image sizes, char limits).', '10 = spec-perfect, 5 = close enough, 1 = wrong specs', 'role_kpi', ARRAY['publishing'], 2),
('timing', 'Timing', 'Published at optimal times, no missed deadlines.', '10 = always on time, 5 = occasionally late, 1 = misses deadlines', 'role_kpi', ARRAY['publishing'], 3),
('tracking', 'Tracking', 'UTMs and analytics properly configured on all links.', '10 = full tracking, 5 = partial, 1 = no tracking', 'role_kpi', ARRAY['publishing'], 4);

-- Role KPIs: @QA
INSERT INTO criteria (id, name, description, scoring_guide, category, applies_to, sort_order) VALUES
('bug_detection_rate', 'Bug Detection Rate', 'Finds real issues, not false positives or trivial noise.', '10 = catches all real bugs, 5 = misses some, 1 = mostly false positives', 'role_kpi', ARRAY['qa'], 1),
('test_coverage', 'Test Coverage', 'Covers critical paths, edge cases, regression scenarios.', '10 = comprehensive coverage, 5 = happy path only, 1 = minimal tests', 'role_kpi', ARRAY['qa'], 2),
('reproduction_clarity', 'Reproduction Clarity', 'Bug reports have clear steps, expected vs actual.', '10 = perfect reports, 5 = vague reports, 1 = no repro steps', 'role_kpi', ARRAY['qa'], 3),
('automation', 'Automation', 'Writes reusable automated tests, not just manual checks.', '10 = fully automated, 5 = mostly manual, 1 = no automation', 'role_kpi', ARRAY['qa'], 4);
