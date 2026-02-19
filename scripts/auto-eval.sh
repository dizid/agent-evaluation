#!/bin/bash
# auto-eval.sh — SubagentStop hook dispatcher for automatic agent evaluation
# Routes to eval-fast.sh (Haiku G-Eval) or eval-deep.sh (Claude CLI Sonnet)
# based on transcript size and agent score.
#
# Receives JSON on stdin from Claude Code SubagentStop hook:
# { "agent_type": "fullstack", "agent_transcript_path": "...", "cwd": "...", ... }

set -euo pipefail

# Prevent recursion — if we're inside a deep eval, exit immediately
if [ "${EVAL_IN_PROGRESS:-}" = "1" ]; then
  exit 0
fi

# Load required env vars from project .env
# (Don't source the whole file — DATABASE_URL contains & which bash interprets as background)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"
if [ -f "$ENV_FILE" ]; then
  : "${ANTHROPIC_API_KEY:=$(grep '^ANTHROPIC_API_KEY=' "$ENV_FILE" | cut -d= -f2-)}"
  : "${SERVICE_KEY:=$(grep '^SERVICE_KEY=' "$ENV_FILE" | cut -d= -f2-)}"
  export ANTHROPIC_API_KEY SERVICE_KEY
fi

# Read hook event from stdin
INPUT=$(cat)

# Extract fields
AGENT_TYPE=$(echo "$INPUT" | jq -r '.agent_type // empty')
TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.agent_transcript_path // empty')
CWD=$(echo "$INPUT" | jq -r '.cwd // empty')
STOP_HOOK_ACTIVE=$(echo "$INPUT" | jq -r '.stop_hook_active // false')

# Prevent infinite loops (Claude Code's own guard)
if [ "$STOP_HOOK_ACTIVE" = "true" ]; then
  exit 0
fi

# Only evaluate Dizid team agents
DIZID_AGENTS="fullstack product platform data ai growth content brand seo sales ops email code-improver security-reviewer backtest-quant risk-quant regime-detector edge-monitor"
if [[ ! " $DIZID_AGENTS " =~ " $AGENT_TYPE " ]]; then
  exit 0
fi

# Require API key + service key
if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  echo "[auto-eval] ANTHROPIC_API_KEY not set, skipping" >&2
  exit 0
fi
if [ -z "${SERVICE_KEY:-}" ]; then
  echo "[auto-eval] SERVICE_KEY not set, skipping" >&2
  exit 0
fi

# Validate transcript exists
if [ -z "$TRANSCRIPT_PATH" ] || [ ! -f "$TRANSCRIPT_PATH" ]; then
  exit 0
fi

# API base URL
API_BASE="https://hirefire.dev"

# Detect project name from git
PROJECT=$(basename "$(git -C "$CWD" rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")

# Fetch agent KPIs from API
AGENT_INFO=$(curl -sf "$API_BASE/api/agents/$AGENT_TYPE" \
  -H "X-Service-Key: $SERVICE_KEY" 2>/dev/null || echo '{}')
KPIS=$(echo "$AGENT_INFO" | jq -r '.agent.kpi_definitions // [] | join(", ")' 2>/dev/null || echo "")
AGENT_SCORE=$(echo "$AGENT_INFO" | jq -r '.agent.overall_score // "6"' 2>/dev/null || echo "6")

# Determine transcript size
TRANSCRIPT_SIZE=$(wc -c < "$TRANSCRIPT_PATH" 2>/dev/null || echo "0")

# --- Dispatch: fast (Haiku) vs deep (Sonnet CLI) ---
# Deep eval when: transcript > 500KB OR agent score < 5.0
# Deep evals run async (background) to avoid blocking the hook
DEEP_THRESHOLD=512000
SCORE_THRESHOLD=5

USE_DEEP=false
if [ "$TRANSCRIPT_SIZE" -gt "$DEEP_THRESHOLD" ]; then
  USE_DEEP=true
  echo "[auto-eval] Large transcript (${TRANSCRIPT_SIZE}B) for @$AGENT_TYPE — using deep eval" >&2
fi
# Compare score (handle empty/non-numeric gracefully)
if echo "$AGENT_SCORE" | grep -qP '^\d+\.?\d*$'; then
  if [ "$(echo "$AGENT_SCORE < $SCORE_THRESHOLD" | bc 2>/dev/null || echo 0)" -eq 1 ]; then
    USE_DEEP=true
    echo "[auto-eval] Low score ($AGENT_SCORE) for @$AGENT_TYPE — using deep eval" >&2
  fi
fi

if [ "$USE_DEEP" = true ] && command -v claude &>/dev/null; then
  # Deep eval: run async in background
  nohup "$SCRIPT_DIR/eval-deep.sh" "$AGENT_TYPE" "$TRANSCRIPT_PATH" "$CWD" "$KPIS" "$PROJECT" \
    >> /tmp/auto-eval-deep.log 2>&1 &
  echo "[auto-eval] Dispatched deep eval for @$AGENT_TYPE (pid $!)" >&2
else
  # Fast eval: run synchronously
  "$SCRIPT_DIR/eval-fast.sh" "$AGENT_TYPE" "$TRANSCRIPT_PATH" "$CWD" "$KPIS" "$PROJECT"
fi

exit 0
