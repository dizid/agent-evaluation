---
description: Check trading positions, PnL, and latest signals
allowed-tools: ToolSearch, mcp__Neon__run_sql, Bash
---

Get a complete overview of the trading system status.

## Steps

1. Use ToolSearch to load `mcp__Neon__run_sql`

2. **Open positions:**
```sql
SELECT symbol, side, size_usd, entry_price, current_price, unrealized_pnl_percent, take_profit_price, stop_loss_price, created_at FROM perp_positions WHERE status = 'open' ORDER BY created_at DESC;
```

3. **Today's closed trades + PnL:**
```sql
SELECT symbol, side, size_usd, realized_pnl_usd, entry_price, exit_price, closed_at FROM perp_positions WHERE status = 'closed' AND closed_at::date = CURRENT_DATE ORDER BY closed_at DESC;
```

4. **Latest prediction signals:**
```sql
SELECT coin, direction, confidence, timeframe, created_at FROM predictions WHERE created_at > NOW() - INTERVAL '6 hours' ORDER BY created_at DESC LIMIT 10;
```

5. **Circuit breaker status:**
```sql
SELECT coin, consecutive_losses, last_loss_at, is_blocked FROM circuit_breaker_state WHERE is_blocked = true;
```

## Output Format

Present as a dashboard summary:
- Open positions: count, total exposure, total unrealized PnL
- Per position: symbol, direction, size, PnL%, TP/SL levels
- Today's PnL: total realized, win/loss count
- Latest signals: top 5 with confidence %
- Alerts: blocked coins, unusual activity
