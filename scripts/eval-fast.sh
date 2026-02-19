#!/bin/bash
# eval-fast.sh — Fast auto-evaluation using Haiku with G-Eval prompt
# Called by auto-eval.sh for standard evaluations (< 500KB transcript, agent score >= 5.0)
#
# Arguments: AGENT_TYPE TRANSCRIPT_PATH CWD KPIS PROJECT
# Requires: ANTHROPIC_API_KEY, SERVICE_KEY env vars

set -euo pipefail

AGENT_TYPE="$1"
TRANSCRIPT_PATH="$2"
CWD="$3"
KPIS="${4:-}"
PROJECT="${5:-unknown}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API_BASE="https://hirefire.dev"

# --- Intelligent transcript compression ---
# Parse JSONL, extract only meaningful content (user messages, agent text, tool names)
# Drop tool results (file contents = noise), progress events, metadata
# This captures the full task flow in ~10% of raw size
COMPRESSED_TRANSCRIPT=$(jq -r '
  # Only process user and assistant messages
  select(.type == "user" or .type == "assistant") |
  if .type == "user" then
    if (.message.content | type) == "string" then
      "USER: " + (.message.content | .[0:500])
    elif (.message.content | type) == "array" then
      .message.content[] |
      if .type == "text" then
        "USER: " + (.text | .[0:500])
      elif .type == "tool_result" then
        if (.content | type) == "string" then
          "RESULT: " + (.content | .[0:150])
        elif (.content | type) == "array" then
          "RESULT: " + ([.content[] | select(.type == "text") | .text] | join(" ") | .[0:150])
        else
          empty
        end
      else
        empty
      end
    else
      empty
    end
  elif .type == "assistant" then
    if (.message.content | type) == "array" then
      .message.content[] |
      if .type == "text" then
        "AGENT: " + (.text | .[0:500])
      elif .type == "tool_use" then
        "TOOL: " + .name + "(" + (.input | tostring | .[0:80]) + ")"
      else
        empty
      end
    elif (.message.content | type) == "string" then
      "AGENT: " + (.message.content | .[0:500])
    else
      empty
    end
  else
    empty
  end
' "$TRANSCRIPT_PATH" 2>/dev/null || true)

# If jq extraction fails or is empty, fall back to head/tail
if [ -z "$COMPRESSED_TRANSCRIPT" ]; then
  TRANSCRIPT_HEAD=$(head -50 "$TRANSCRIPT_PATH" 2>/dev/null || true)
  TRANSCRIPT_TAIL=$(tail -50 "$TRANSCRIPT_PATH" 2>/dev/null || true)
  COMPRESSED_TRANSCRIPT="$TRANSCRIPT_HEAD
...
$TRANSCRIPT_TAIL"
fi

# Cap at ~200 lines to stay within context limits (~4000 tokens)
COMPRESSED_TRANSCRIPT=$(echo "$COMPRESSED_TRANSCRIPT" | head -200)

# --- Load G-Eval system prompt ---
SYSTEM_PROMPT=$(cat "$SCRIPT_DIR/prompts/g-eval-system.txt")

# --- Build user prompt ---
USER_PROMPT=$(cat <<PROMPT
Evaluate @${AGENT_TYPE} on project "${PROJECT}".

## Role KPIs
${KPIS:-No role-specific KPIs defined for this agent.}

## Conversation Transcript
${COMPRESSED_TRANSCRIPT}

Score all 8 universal criteria. If KPIs are listed above, include KPI scores too.
Use <reasoning> block before the JSON output.
PROMPT
)

# --- Call Anthropic API with system prompt + caching ---
HAIKU_RESPONSE=""
for attempt in 1 2 3; do
  HAIKU_RESPONSE=$(curl -sf --max-time 45 https://api.anthropic.com/v1/messages \
    -H "x-api-key: $ANTHROPIC_API_KEY" \
    -H "anthropic-version: 2023-06-01" \
    -H "anthropic-beta: prompt-caching-2024-07-31" \
    -H "content-type: application/json" \
    -d "$(jq -n \
      --arg system "$SYSTEM_PROMPT" \
      --arg user "$USER_PROMPT" \
      '{
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2048,
        system: [{ type: "text", text: $system, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: $user }]
      }')" 2>/dev/null) && break
  echo "[eval-fast] API attempt $attempt failed for @$AGENT_TYPE, retrying..." >&2
  sleep $((attempt * 2))
done

if [ -z "$HAIKU_RESPONSE" ]; then
  echo "[eval-fast] Haiku API failed after 3 attempts for @$AGENT_TYPE" >&2
  exit 1
fi

# --- Extract text content ---
RAW_TEXT=$(echo "$HAIKU_RESPONSE" | jq -r '.content[0].text // empty' 2>/dev/null || echo "")
if [ -z "$RAW_TEXT" ]; then
  echo "[eval-fast] Empty response from Haiku for @$AGENT_TYPE" >&2
  exit 1
fi

# Extract reasoning for storage + debugging
REASONING=$(echo "$RAW_TEXT" | sed -n '/<reasoning>/,/<\/reasoning>/p' | sed '1s/^<reasoning>//; $s/<\/reasoning>$//' | sed '/^$/d' 2>/dev/null || true)
if [ -n "$REASONING" ]; then
  echo "[eval-fast] @$AGENT_TYPE reasoning extracted (${#REASONING} chars)" >&2
fi

# --- Parse JSON from response ---
# Strip <reasoning> block, markdown fences, then extract JSON
EVAL_JSON=$(echo "$RAW_TEXT" \
  | sed '/<reasoning>/,/<\/reasoning>/d' \
  | sed 's/^```json//; s/^```//; s/```$//' \
  | tr '\n' ' ' \
  | grep -oP '\{.*\}' \
  | jq '.' 2>/dev/null || echo "")

if [ -z "$EVAL_JSON" ]; then
  echo "[eval-fast] Failed to parse JSON from Haiku response for @$AGENT_TYPE" >&2
  echo "[eval-fast] Raw text: ${RAW_TEXT:0:500}" >&2
  exit 1
fi

# Extract fields
SCORES=$(echo "$EVAL_JSON" | jq '.scores // empty' 2>/dev/null || echo "")
TASK_DESC=$(echo "$EVAL_JSON" | jq -r '.task_description // "Auto-evaluated task"' 2>/dev/null || echo "Auto-evaluated task")
TOP_STRENGTH=$(echo "$EVAL_JSON" | jq -r '.top_strength // empty' 2>/dev/null || echo "")
TOP_WEAKNESS=$(echo "$EVAL_JSON" | jq -r '.top_weakness // empty' 2>/dev/null || echo "")
ACTION_ITEM=$(echo "$EVAL_JSON" | jq -r '.action_item // empty' 2>/dev/null || echo "")

if [ -z "$SCORES" ] || [ "$SCORES" = "null" ]; then
  echo "[eval-fast] No scores in response for @$AGENT_TYPE" >&2
  exit 1
fi

# --- POST to AgentEval API ---
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
  echo "[eval-fast] Failed to POST evaluation for @$AGENT_TYPE" >&2
  exit 1
fi

# Log success
OVERALL=$(echo "$RESULT" | jq -r '.agent_summary.overall_score // "?"' 2>/dev/null || echo "?")
LABEL=$(echo "$RESULT" | jq -r '.agent_summary.rating_label // "?"' 2>/dev/null || echo "?")
echo "[eval-fast] @$AGENT_TYPE scored $OVERALL ($LABEL) on $PROJECT" >&2

exit 0
