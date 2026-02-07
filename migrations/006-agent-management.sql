-- 006-agent-management.sql
-- Add agent management columns + import 6 Claude Code agents

-- Step 1: Add source tracking, model, and status columns
ALTER TABLE agents ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'manual';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS source_path TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE agents ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);

-- Step 2: Backfill existing Dizid agents
UPDATE agents SET source_type = 'dizid', source_path = 'agents/CLAUDE-TEAM.md', status = 'active'
WHERE id IN ('fullstack', 'product', 'platform', 'data', 'growth', 'content', 'brand', 'ops', 'ai', 'seo', 'email');

-- Step 3: Insert 6 Claude Code agents
INSERT INTO agents (id, name, department, role, persona, kpi_definitions, source_type, source_path, model, status) VALUES
('code-improver', '@CodeImprover', 'tools', 'Code Quality Specialist',
 'Elite senior software engineer specializing in code quality, performance optimization, and software craftsmanship. Analyzes code for readability, performance, and best practices. Thorough, precise, and constructive.',
 '["issue_detection", "solution_quality", "explanation_clarity", "pattern_awareness"]'::jsonb,
 'claude-agent', '~/.claude/agents/code-improver.md', 'sonnet', 'active'),
('security-reviewer', '@SecurityReviewer', 'tools', 'Security Audit Specialist',
 'Expert security specialist focused on OWASP Top 10, secrets detection, input validation, auth/authz verification, and dependency auditing. Paranoid by design.',
 '["vulnerability_detection", "owasp_coverage", "remediation_quality", "false_positive_rate"]'::jsonb,
 'claude-agent', '~/.claude/agents/security-reviewer.md', 'opus', 'active'),
('backtest-quant', '@BacktestQuant', 'trading', 'Backtest Architect',
 'Paranoid quantitative researcher. Assumes every model is overfit until proven otherwise. Validates strategies with realistic transaction costs, walk-forward validation, and Monte Carlo robustness testing.',
 '["cost_modeling", "overfitting_detection", "feature_analysis", "statistical_rigor"]'::jsonb,
 'claude-agent', '~/.claude/agents/backtest-quant.md', 'opus', 'active'),
('risk-quant', '@RiskQuant', 'trading', 'Risk Quantifier',
 'Risk analyst obsessed with risk-adjusted returns and capital preservation. Computes Sharpe, Sortino, Calmar, max drawdown, profit factor, expectancy. Implements Kelly criterion position sizing.',
 '["risk_metric_accuracy", "position_sizing", "drawdown_management", "correlation_awareness"]'::jsonb,
 'claude-agent', '~/.claude/agents/risk-quant.md', 'opus', 'active'),
('regime-detector', '@RegimeDetector', 'trading', 'Regime Analyst',
 'Econometrician specializing in regime change detection and structural breaks. Multi-factor classification into 5 regime types with regime-conditional trading parameters.',
 '["classification_accuracy", "multi_factor_analysis", "threshold_tuning", "transition_detection"]'::jsonb,
 'claude-agent', '~/.claude/agents/regime-detector.md', 'opus', 'active'),
('edge-monitor', '@EdgeMonitor', 'trading', 'Edge Decay Watchdog',
 'Paranoid operations quant monitoring model health. Tracks rolling accuracy, calibration error, directional bias, and composite edge scores. Catches degradation before losses mount.',
 '["degradation_detection", "calibration_analysis", "alert_quality", "monitoring_coverage"]'::jsonb,
 'claude-agent', '~/.claude/agents/edge-monitor.md', 'opus', 'active');

-- Step 4: Insert role KPIs for new agents (24 total)
INSERT INTO criteria (id, name, description, scoring_guide, category, applies_to, sort_order) VALUES
-- @CodeImprover KPIs
('issue_detection', 'Issue Detection', 'Finds real problems with correct severity, not pedantic nitpicks.', '10 = catches all real issues, 5 = misses some, 1 = mostly noise', 'role_kpi', ARRAY['code-improver'], 1),
('solution_quality', 'Solution Quality', 'Improved code is complete, working, and preserves functionality.', '10 = production-ready fixes, 5 = needs tweaking, 1 = broken solutions', 'role_kpi', ARRAY['code-improver'], 2),
('explanation_clarity', 'Explanation Clarity', 'Why each change is better is clearly articulated with trade-offs.', '10 = teaches principles, 5 = basic reasoning, 1 = no explanation', 'role_kpi', ARRAY['code-improver'], 3),
('pattern_awareness', 'Pattern Awareness', 'Respects project conventions and language-specific idioms.', '10 = idiomatic + project-aware, 5 = generic best practices, 1 = ignores context', 'role_kpi', ARRAY['code-improver'], 4),
-- @SecurityReviewer KPIs
('vulnerability_detection', 'Vulnerability Detection', 'Finds real security issues across all severity levels.', '10 = catches all vulns, 5 = misses medium-severity, 1 = misses critical', 'role_kpi', ARRAY['security-reviewer'], 1),
('owasp_coverage', 'OWASP Coverage', 'Systematically checks OWASP Top 10 categories.', '10 = full Top 10, 5 = checks a few, 1 = ad-hoc only', 'role_kpi', ARRAY['security-reviewer'], 2),
('remediation_quality', 'Remediation Quality', 'Fixes are complete, secure, and production-ready.', '10 = secure + tested fixes, 5 = partial fixes, 1 = creates new issues', 'role_kpi', ARRAY['security-reviewer'], 3),
('false_positive_rate', 'False Positive Rate', 'Low false positive rate -- findings are real issues.', '10 = near-zero FP, 5 = some FPs, 1 = mostly false alarms', 'role_kpi', ARRAY['security-reviewer'], 4),
-- @BacktestQuant KPIs
('cost_modeling', 'Cost Modeling', 'Transaction costs (fees, slippage, funding) are realistic.', '10 = multi-factor cost model, 5 = basic fees only, 1 = ignores costs', 'role_kpi', ARRAY['backtest-quant'], 1),
('overfitting_detection', 'Overfitting Detection', 'In-sample vs out-of-sample comparison catches overfit models.', '10 = reports OFR with action, 5 = basic IS/OOS split, 1 = no split', 'role_kpi', ARRAY['backtest-quant'], 2),
('feature_analysis', 'Feature Analysis', 'Permutation importance correctly identifies useful vs noise features.', '10 = full importance ranking, 5 = spot checks, 1 = no analysis', 'role_kpi', ARRAY['backtest-quant'], 3),
('statistical_rigor', 'Statistical Rigor', 'Walk-forward validation, purge windows, Monte Carlo, proper splits.', '10 = publication-grade, 5 = basic chronological, 1 = shuffled data', 'role_kpi', ARRAY['backtest-quant'], 4),
-- @RiskQuant KPIs
('risk_metric_accuracy', 'Risk Metric Accuracy', 'Sharpe, Sortino, Calmar, profit factor computed correctly.', '10 = all correct + interpreted, 5 = some errors, 1 = wrong formulas', 'role_kpi', ARRAY['risk-quant'], 1),
('position_sizing', 'Position Sizing', 'Kelly criterion with proper bounds, half-Kelly, and exchange minimums.', '10 = optimal + bounded, 5 = basic Kelly, 1 = arbitrary sizing', 'role_kpi', ARRAY['risk-quant'], 2),
('drawdown_management', 'Drawdown Management', 'Detects and responds to drawdown with size reduction.', '10 = auto-reduces at thresholds, 5 = alerts only, 1 = ignores drawdown', 'role_kpi', ARRAY['risk-quant'], 3),
('correlation_awareness', 'Correlation Awareness', 'Flags correlated positions and adjusts effective exposure.', '10 = full correlation matrix, 5 = BTC-ETH only, 1 = ignores correlation', 'role_kpi', ARRAY['risk-quant'], 4),
-- @RegimeDetector KPIs
('classification_accuracy', 'Classification Accuracy', 'Correct regime assigned given market data and indicators.', '10 = matches reality, 5 = sometimes wrong, 1 = random classification', 'role_kpi', ARRAY['regime-detector'], 1),
('multi_factor_analysis', 'Multi-Factor Analysis', 'Uses ADX, SMA alignment, ATR percentile, VIX, not just price.', '10 = 5+ factors weighted, 5 = 2-3 factors, 1 = single SMA', 'role_kpi', ARRAY['regime-detector'], 2),
('threshold_tuning', 'Threshold Tuning', 'Regime-specific parameters are reasonable and back-tested.', '10 = tested thresholds, 5 = default values, 1 = arbitrary numbers', 'role_kpi', ARRAY['regime-detector'], 3),
('transition_detection', 'Transition Detection', 'Detects regime changes promptly without excessive lag.', '10 = prompt + confirmed, 5 = delayed, 1 = misses transitions', 'role_kpi', ARRAY['regime-detector'], 4),
-- @EdgeMonitor KPIs
('degradation_detection', 'Degradation Detection', 'Catches accuracy decline before losses accumulate.', '10 = early detection, 5 = catches eventually, 1 = misses degradation', 'role_kpi', ARRAY['edge-monitor'], 1),
('calibration_analysis', 'Calibration Analysis', 'ECE computation is correct, overconfidence flagged.', '10 = per-bucket analysis, 5 = aggregate only, 1 = no calibration check', 'role_kpi', ARRAY['edge-monitor'], 2),
('alert_quality', 'Alert Quality', 'Alerts are actionable with clear severity, low false positive rate.', '10 = actionable + correct, 5 = noisy, 1 = missed alerts', 'role_kpi', ARRAY['edge-monitor'], 3),
('monitoring_coverage', 'Monitoring Coverage', 'All coins, timeframes, and key metrics are monitored.', '10 = complete coverage, 5 = partial, 1 = spot checks only', 'role_kpi', ARRAY['edge-monitor'], 4);
