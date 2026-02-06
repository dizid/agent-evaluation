---
description: Retrain ML models, bundle for serverless, and test
allowed-tools: Bash
---

Complete ML model retraining pipeline. Requires DATABASE_URL in environment.

## Steps

### 1. Verify prerequisites
```bash
echo "Checking DATABASE_URL..." && [ -n "$DATABASE_URL" ] && echo "OK" || echo "ERROR: DATABASE_URL not set"
```

### 2. Retrain all models
Trains BTC/ETH/SOL/XRP models for 24h and 1w timeframes (8 models total):
```bash
node scripts/train-model.mjs
```

### 3. Bundle models for serverless deployment
Converts TensorFlow.js models to TypeScript for Netlify Functions:
```bash
npm run bundle-models
```

### 4. Test predictions
Verify models produce valid predictions:
```bash
npm run test:ml
```

### 5. Run full test suite
Ensure nothing broke:
```bash
npm run test:run
```

## Output Format

Report:
- Per-model training accuracy (coin x timeframe)
- Bundle size (target < 500KB per model)
- Test results: pass/fail
- Ready for deployment: yes/no

If all pass, inform user to run `/push` to deploy updated models.
