---
description: Check database health - predictions, accuracy, positions
allowed-tools: ToolSearch, mcp__Neon__run_sql, mcp__Neon__get_database_tables
---

Run health checks on the Neon PostgreSQL database and present a concise summary.

## Steps

1. Use ToolSearch to load `mcp__Neon__run_sql`
2. Run these queries and present results:

**Prediction counts (last 24h per coin):**
```sql
SELECT coin, COUNT(*) as total, COUNT(CASE WHEN created_at > NOW() - INTERVAL '24 hours' THEN 1 END) as last_24h FROM predictions GROUP BY coin ORDER BY coin;
```

**Model accuracy leaderboard:**
```sql
SELECT coin, timeframe, accuracy, total_predictions FROM prediction_accuracy WHERE total_predictions > 10 ORDER BY accuracy DESC;
```

**Open trading positions:**
```sql
SELECT symbol, side, size_usd, entry_price, unrealized_pnl_percent, created_at FROM perp_positions WHERE status = 'open' ORDER BY created_at DESC;
```

**Data freshness (latest market snapshot per coin):**
```sql
SELECT coin, MAX(timestamp) as latest_data FROM market_snapshots GROUP BY coin ORDER BY coin;
```

## Output Format

Present as a concise summary:
- Predictions: total + last 24h per coin
- Accuracy: top models with accuracy %
- Open positions: symbol, side, PnL
- Data gaps: any coin with stale data (> 1 hour old)
- Issues: flag anything unusual
