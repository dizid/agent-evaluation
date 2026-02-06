---
description: Quick security audit - auth, secrets, CORS, dependencies
allowed-tools: Grep, Read, Bash
---

Fast security audit focusing on the most common vulnerability patterns.

## Steps

### 1. Auth coverage on trading endpoints
Verify all trading endpoints require authentication:
```
Grep for "validateTradingAuth" in netlify/functions/
```

These files MUST have auth:
- `kraken-open-position.mts`
- `kraken-close-position.mts`
- `kraken-get-positions.mts`
- `open-position.mts`
- `close-position.mts`
- `get-positions.mts`
- `sync-positions.mts`
- `execute-trade.mts`
- `record-manual-trade.mts`
- `update-position.mts`

### 2. Hardcoded secrets scan
```
Grep for patterns in netlify/functions/ and src/:
- Strings matching API key patterns (long hex/base64 strings)
- "api_key\s*[:=]"
- "secret\s*[:=]"
- "password\s*[:=]"
- "token\s*[:=].*['\"]"
```
All should use `process.env.*` or `import.meta.env.*`, not hardcoded values.

### 3. CORS configuration
```
Read netlify/functions/utils/cors.ts
```
Verify: Authorization in allowed headers, no wildcard `*` origin in production.

### 4. Auth implementation
```
Read netlify/functions/utils/auth.ts
```
Verify: Uses `crypto.timingSafeEqual` for secret comparison (not `===`).

### 5. Dependency audit
```bash
npm audit --production 2>&1 | tail -20
```

## Output Format

Summary:
- Auth coverage: X/Y trading endpoints protected (list any missing)
- Secrets: clean / found in [file:line]
- CORS: safe / needs review
- Auth implementation: timing-safe / vulnerable
- npm vulns: count by severity (critical/high/moderate/low)
- Recommendation: pass / needs fixes (list specific actions)
