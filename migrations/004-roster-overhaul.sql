-- 004-roster-overhaul.sql
-- Fire 4 underperforming agents, hire 3 new top-talent agents

-- Step 1: Remove fired agents (must delete evaluations first due to FK constraint)
DELETE FROM evaluations WHERE agent_id IN ('integration', 'publishing', 'qa', 'community');
DELETE FROM agents WHERE id IN ('integration', 'publishing', 'qa', 'community');

-- Step 2: Remove orphaned criteria for fired agents
DELETE FROM criteria WHERE id IN (
  'api_knowledge', 'automation_quality', 'exchange_expertise', 'security_handling',
  'publishing_accuracy', 'platform_compliance', 'timing', 'tracking',
  'bug_detection_rate', 'test_coverage', 'reproduction_clarity', 'automation',
  'authenticity', 'platform_knowledge', 'crisis_handling', 'relationship_building'
);

-- Step 3: Insert new agents
INSERT INTO agents (id, name, department, role, persona, kpi_definitions) VALUES
('ai', '@AI', 'development', 'AI/ML Specialist',
 'AI/ML specialist. Expert in prompt engineering, LLM API integration, agent orchestration, and evaluation harnesses. Thinks in tokens, latency, and cost-per-call. Builds AI systems that are reliable, measurable, and cheap to run.',
 '["prompt_engineering", "llm_integration", "eval_design", "cost_optimization"]'::jsonb),
('seo', '@SEO', 'marketing', 'SEO & Analytics Specialist',
 'SEO and analytics specialist. Thinks in search intent, crawl budgets, and conversion funnels. Data-obsessed but translates numbers into CEO-actionable items.',
 '["technical_seo", "keyword_research", "analytics_setup", "conversion_tracking"]'::jsonb),
('email', '@Email', 'operations', 'Email & Automation Specialist',
 'Email and automation specialist. Builds sequences that convert, automations that don''t break, and deliverability that stays out of spam folders. Thinks in triggers, segments, and lifecycle stages.',
 '["sequence_design", "deliverability", "automation_reliability", "lifecycle_strategy"]'::jsonb);

-- Step 4: Insert role KPIs for new agents
INSERT INTO criteria (id, name, description, scoring_guide, category, applies_to, sort_order) VALUES
-- @AI KPIs
('prompt_engineering', 'Prompt Engineering', 'Prompts use system/user roles, include examples, handle edge cases, produce consistent outputs.', '10 = production-grade with guardrails, 5 = functional but brittle, 1 = naive single-shot', 'role_kpi', ARRAY['ai'], 1),
('llm_integration', 'LLM Integration', 'API calls use correct models, parameters, structured outputs, tool use, and error handling.', '10 = robust multi-provider with fallbacks, 5 = basic but functional, 1 = broken API usage', 'role_kpi', ARRAY['ai'], 2),
('eval_design', 'Evaluation Design', 'Builds measurable eval harnesses with rubrics, automated scoring, and reproducible results.', '10 = automated pipeline with regression detection, 5 = manual spot-checks, 1 = no methodology', 'role_kpi', ARRAY['ai'], 3),
('cost_optimization', 'Cost & Latency Optimization', 'Chooses right model tiers, uses caching, batching, prompt compression. Balances quality vs cost.', '10 = optimized under budget, 5 = works but wasteful, 1 = ignores cost', 'role_kpi', ARRAY['ai'], 4),
-- @SEO KPIs
('technical_seo', 'Technical SEO', 'Structured data, canonicals, sitemaps, Core Web Vitals, internal linking, crawl efficiency.', '10 = passes all audits with structured data, 5 = basic on-page present, 1 = broken crawlability', 'role_kpi', ARRAY['seo'], 1),
('keyword_research', 'Keyword & Intent Research', 'High-value keywords matched to search intent with realistic difficulty assessment.', '10 = prioritized keyword map with intent, 5 = generic list, 1 = no strategy', 'role_kpi', ARRAY['seo'], 2),
('analytics_setup', 'Analytics Setup', 'GA4 configuration, GTM container, custom events, data streams, debug verification.', '10 = full GA4+GTM verified, 5 = basic pageviews only, 1 = broken or missing', 'role_kpi', ARRAY['seo'], 3),
('conversion_tracking', 'Conversion Tracking', 'Full funnel tracking with attribution, UTM strategy, goal configuration, dashboards.', '10 = complete with attribution model, 5 = partial tracking, 1 = no tracking', 'role_kpi', ARRAY['seo'], 4),
-- @Email KPIs
('sequence_design', 'Sequence Design', 'Email sequences with triggers, timing, segmentation, A/B subject lines, proven copy frameworks.', '10 = multi-branch with personalization, 5 = linear but functional, 1 = single blast', 'role_kpi', ARRAY['email'], 1),
('deliverability', 'Deliverability & Compliance', 'DKIM/SPF/DMARC setup, list hygiene, CAN-SPAM/GDPR compliance, spam monitoring.', '10 = perfect auth with automated hygiene, 5 = basic auth only, 1 = emails in spam', 'role_kpi', ARRAY['email'], 2),
('automation_reliability', 'Automation Reliability', 'Zapier/Make/n8n workflows with error handling, retry logic, logging, no silent failures.', '10 = bulletproof with alerts, 5 = happy-path only, 1 = fragile and silent', 'role_kpi', ARRAY['email'], 3),
('lifecycle_strategy', 'Lifecycle Strategy', 'Maps email touchpoints to customer lifecycle stages with measurable goals per stage.', '10 = full lifecycle map with goals, 5 = some awareness, 1 = random emails', 'role_kpi', ARRAY['email'], 4);
