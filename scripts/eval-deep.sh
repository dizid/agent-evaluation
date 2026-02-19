#!/bin/bash
# eval-deep.sh — Deep auto-evaluation using Claude CLI (Sonnet) with tool access
# Called by auto-eval.sh for complex evaluations (large transcript or low-scoring agent)
# Runs async (background) — does not block the SubagentStop hook
#
# Arguments: AGENT_TYPE TRANSCRIPT_PATH CWD KPIS PROJECT
# Requires: SERVICE_KEY env var, claude CLI available

set -euo pipefail

AGENT_TYPE="$1"
TRANSCRIPT_PATH="$2"
CWD="$3"
KPIS="${4:-}"
PROJECT="${5:-unknown}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
API_BASE="https://hirefire.dev"

# Prevent recursion — if we're already inside an eval, exit
export EVAL_IN_PROGRESS=1

# Load G-Eval system prompt
SYSTEM_PROMPT=$(cat "$SCRIPT_DIR/prompts/g-eval-system.txt")

# Build the evaluation prompt
# The Claude agent can read files directly, so we give it paths instead of content
EVAL_PROMPT=$(cat <<PROMPT
You are evaluating agent @${AGENT_TYPE} on project "${PROJECT}".

## Instructions

1. Read the agent's conversation transcript at: ${TRANSCRIPT_PATH}
   - Focus on: what task was assigned, what the agent did, what the outcome was
   - Note any errors, retries, or user corrections

2. Read the agent's persona file at: ${PROJECT_DIR}/agents/${AGENT_TYPE}.md
   - Understand what this agent is supposed to do and how

3. If the working directory exists, check recent changes:
   - Run: git -C ${CWD} log --oneline -5 (to see recent commits)
   - Run: git -C ${CWD} diff --stat HEAD~1 (to see what changed)

4. Score using the G-Eval methodology from your system prompt.

## Role KPIs for @${AGENT_TYPE}
${KPIS:-No role-specific KPIs defined.}

## Output

After your <reasoning> block, output ONLY the JSON evaluation object as specified in your system prompt.
Do NOT wrap it in markdown fences.
PROMPT
)

# Run Claude CLI with Sonnet, limited tools, budget cap
# --print: non-interactive mode
# --allowed-tools: only read-safe operations
# --dangerously-skip-permissions: required for non-interactive
# --max-budget-usd: hard cost cap per evaluation
# --no-session-persistence: don't save eval sessions to disk
CLAUDE_OUTPUT=$(claude --print \
  --model sonnet \
  --system-prompt "$SYSTEM_PROMPT" \
  --allowed-tools "Read,Bash(git:*),Bash(wc:*),Bash(head:*),Bash(tail:*),Bash(jq:*)" \
  --dangerously-skip-permissions \
  --max-budget-usd 0.20 \
  --no-session-persistence \
  --disallowed-tools "Task,Write,Edit,NotebookEdit,WebFetch,WebSearch" \
  -p "$EVAL_PROMPT" 2>/dev/null || echo "")

if [ -z "$CLAUDE_OUTPUT" ]; then
  echo "[eval-deep] Claude CLI returned empty response for @$AGENT_TYPE" >&2
  exit 1
fi

# Extract reasoning for storage + debugging
REASONING=$(echo "$CLAUDE_OUTPUT" | sed -n '/<reasoning>/,/<\/reasoning>/p' | sed '1s/^<reasoning>//; $s/<\/reasoning>$//' | sed '/^$/d' 2>/dev/null || true)
if [ -n "$REASONING" ]; then
  echo "[eval-deep] @$AGENT_TYPE reasoning extracted (${#REASONING} chars)" >&2
fi

# Extract JSON from Claude's output
# Strip reasoning block, markdown fences, find the JSON object
EVAL_JSON=$(echo "$CLAUDE_OUTPUT" \
  | sed '/<reasoning>/,/<\/reasoning>/d' \
  | sed 's/^```json//; s/^```//; s/```$//' \
  | tr '\n' ' ' \
  | grep -oP '\{.*\}' \
  | jq '.' 2>/dev/null || echo "")

if [ -z "$EVAL_JSON" ]; then
  echo "[eval-deep] Failed to parse JSON from Claude output for @$AGENT_TYPE" >&2
  echo "[eval-deep] Raw output (first 500 chars): ${CLAUDE_OUTPUT:0:500}" >&2
  exit 1
fi

# Extract fields
SCORES=$(echo "$EVAL_JSON" | jq '.scores // empty' 2>/dev/null || echo "")
TASK_DESC=$(echo "$EVAL_JSON" | jq -r '.task_description // "Deep auto-evaluated task"' 2>/dev/null || echo "Deep auto-evaluated task")
TOP_STRENGTH=$(echo "$EVAL_JSON" | jq -r '.top_strength // empty' 2>/dev/null || echo "")
TOP_WEAKNESS=$(echo "$EVAL_JSON" | jq -r '.top_weakness // empty' 2>/dev/null || echo "")
ACTION_ITEM=$(echo "$EVAL_JSON" | jq -r '.action_item // empty' 2>/dev/null || echo "")

if [ -z "$SCORES" ] || [ "$SCORES" = "null" ]; then
  echo "[eval-deep] No scores in Claude response for @$AGENT_TYPE" >&2
  exit 1
fi

# POST to AgentEval API
RESULT=$(curl -sf "$API_BASE/api/evaluations" \
  -H "content-type: application/json" \
  -H "X-Service-Key: $SERVICE_KEY" \
  -d "$(jq -n \
    --arg agent_id "$AGENT_TYPE" \
    --argjson scores "$SCORES" \
    --arg task_description "$TASK_DESC" \
    --arg top_strength "$TOP_STRENGTH" \
    --arg top_weakness "$TOP_WEAKNESS" \
    --arg action_item "$ACTION_ITEM" \
    --arg project "$PROJECT" \
    --arg reasoning "$REASONING" \
    '{
      agent_id: $agent_id,
      scores: $scores,
      evaluator_type: "auto",
      task_description: $task_description,
      top_strength: $top_strength,
      top_weakness: $top_weakness,
      action_item: $action_item,
      project: $project,
      reasoning: $reasoning
    }')" 2>/dev/null || echo "")

if [ -z "$RESULT" ]; then
  echo "[eval-deep] Failed to POST evaluation for @$AGENT_TYPE" >&2
  exit 1
fi

# Log success
OVERALL=$(echo "$RESULT" | jq -r '.agent_summary.overall_score // "?"' 2>/dev/null || echo "?")
LABEL=$(echo "$RESULT" | jq -r '.agent_summary.rating_label // "?"' 2>/dev/null || echo "?")
echo "[eval-deep] @$AGENT_TYPE scored $OVERALL ($LABEL) on $PROJECT [deep eval]" >&2

exit 0
