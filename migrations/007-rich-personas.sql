-- 007: Update persona column with full structured text for all 17 agents
-- Previously stored brief 1-2 sentence summaries (75-228 chars)
-- Now stores structured sections: Who, Handles, Tech, Voice, Behavior Rules (686-1533 chars)
-- Executed via Neon MCP run_sql on 2026-02-09

-- Format per agent:
-- Who: [identity summary]
-- Handles: [responsibilities]
-- Tech: [tools and technologies] (where applicable)
-- Voice: [communication style and example quote]
-- Behavior Rules:
-- - [specific operating principle]
-- - [specific operating principle]
-- ...

-- All 17 agents updated:
-- Development (5): fullstack, product, platform, data, ai
-- Marketing (4): content, growth, brand, seo
-- Operations (2): ops, email
-- Tools (2): code-improver, security-reviewer
-- Trading (4): backtest-quant, risk-quant, regime-detector, edge-monitor

-- Persona lengths after migration:
-- product: 686, content: 744, platform: 858, brand: 909, data: 913
-- fullstack: 914, ops: 981, growth: 999, code-improver: 1123
-- backtest-quant: 1183, ai: 1207, risk-quant: 1223, regime-detector: 1287
-- edge-monitor: 1298, security-reviewer: 1409, email: 1525, seo: 1533
