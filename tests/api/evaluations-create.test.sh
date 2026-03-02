#!/bin/bash
# evaluations-create.test.sh — Integration tests for POST /api/evaluations with reasoning
# Tests against live API (hirefire.dev) using SERVICE_KEY auth
#
# Run: bash tests/api/evaluations-create.test.sh
# Requires: SERVICE_KEY env var (or in project .env)

set -uo pipefail
# Note: deliberately NOT using set -e — we handle errors via assert functions

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../../.env"

# Load SERVICE_KEY from .env if not set
if [ -z "${SERVICE_KEY:-}" ] && [ -f "$ENV_FILE" ]; then
  SERVICE_KEY=$(grep '^SERVICE_KEY=' "$ENV_FILE" | cut -d= -f2-)
  export SERVICE_KEY
fi

if [ -z "${SERVICE_KEY:-}" ]; then
  echo "ERROR: SERVICE_KEY not set. Set it in env or .env file."
  exit 1
fi

API_BASE="https://hirefire.dev"
# Use a known agent that exists in the Dizid org
TEST_AGENT="fullstack"

PASS=0
FAIL=0

assert_status() {
  local test_name="$1"
  local expected="$2"
  local actual="$3"
  if [ "$expected" = "$actual" ]; then
    echo "  PASS: $test_name (HTTP $actual)"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $test_name (expected HTTP $expected, got $actual)"
    FAIL=$((FAIL + 1))
  fi
}

assert_field() {
  local test_name="$1"
  local expected="$2"
  local actual="$3"
  if [ "$expected" = "$actual" ]; then
    echo "  PASS: $test_name"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $test_name (expected '$expected', got '$actual')"
    FAIL=$((FAIL + 1))
  fi
}

assert_not_null() {
  local test_name="$1"
  local actual="$2"
  if [ "$actual" != "null" ] && [ -n "$actual" ]; then
    echo "  PASS: $test_name"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $test_name (got null or empty)"
    FAIL=$((FAIL + 1))
  fi
}

assert_null() {
  local test_name="$1"
  local actual="$2"
  if [ "$actual" = "null" ] || [ -z "$actual" ]; then
    echo "  PASS: $test_name"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $test_name (expected null, got '$actual')"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== API Integration Tests: POST /api/evaluations ==="
echo "Target: $API_BASE"
echo ""

# --- Test 1: POST with reasoning ---
echo "1. POST with reasoning field"
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_BASE/api/evaluations" \
  -H "content-type: application/json" \
  -H "X-Service-Key: $SERVICE_KEY" \
  -d "$(jq -n '{
    agent_id: "fullstack",
    scores: {task_completion: 7, accuracy: 7, efficiency: 6, judgment: 7, communication: 7, domain_expertise: 7, autonomy: 6, safety: 8},
    evaluator_type: "auto",
    task_description: "E2E test: reasoning field validation",
    reasoning: "Task: E2E test evaluation.\nOutcome: Testing reasoning storage.\nEvidence:\n- task_completion: test completed\n- accuracy: test data is correct",
    project: "agent-evaluation"
  }')")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')
assert_status "returns 201" "201" "$HTTP_CODE"

REASONING_BACK=$(echo "$BODY" | jq -r '.evaluation.reasoning // "null"' 2>/dev/null || echo "null")
assert_not_null "response includes reasoning" "$REASONING_BACK"
echo "$REASONING_BACK" | grep -q 'E2E test evaluation' && { echo "  PASS: reasoning content matches"; PASS=$((PASS + 1)); } || { echo "  FAIL: reasoning content mismatch"; FAIL=$((FAIL + 1)); }

EVAL_ID_1=$(echo "$BODY" | jq -r '.evaluation.id // "null"' 2>/dev/null || echo "null")
echo ""

# --- Test 2: POST without reasoning (backward-compatible) ---
echo "2. POST without reasoning (backward-compatible)"
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_BASE/api/evaluations" \
  -H "content-type: application/json" \
  -H "X-Service-Key: $SERVICE_KEY" \
  -d "$(jq -n '{
    agent_id: "fullstack",
    scores: {task_completion: 6, accuracy: 7, efficiency: 7, judgment: 6, communication: 7, domain_expertise: 6, autonomy: 7, safety: 7},
    evaluator_type: "auto",
    task_description: "E2E test: no reasoning field",
    project: "agent-evaluation"
  }')")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')
assert_status "returns 201 without reasoning" "201" "$HTTP_CODE"

REASONING_BACK=$(echo "$BODY" | jq -r '.evaluation.reasoning' 2>/dev/null || echo "error")
assert_null "reasoning is null when not provided" "$REASONING_BACK"

echo ""

# --- Test 3: POST with empty reasoning ---
echo "3. POST with empty reasoning string"
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_BASE/api/evaluations" \
  -H "content-type: application/json" \
  -H "X-Service-Key: $SERVICE_KEY" \
  -d "$(jq -n '{
    agent_id: "fullstack",
    scores: {task_completion: 7, accuracy: 6, efficiency: 7, judgment: 7, communication: 6, domain_expertise: 7, autonomy: 7, safety: 7},
    evaluator_type: "auto",
    task_description: "E2E test: empty reasoning",
    reasoning: "",
    project: "agent-evaluation"
  }')")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')
assert_status "returns 201 with empty reasoning" "201" "$HTTP_CODE"

REASONING_BACK=$(echo "$BODY" | jq -r '.evaluation.reasoning' 2>/dev/null || echo "error")
assert_null "empty string reasoning stored as null" "$REASONING_BACK"

echo ""

# --- Test 4: POST with very long reasoning (under limit) ---
echo "4. POST with long reasoning (4999 chars)"
LONG_REASONING=$(python3 -c "print('X' * 4999)" 2>/dev/null || printf 'X%.0s' $(seq 1 4999))
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_BASE/api/evaluations" \
  -H "content-type: application/json" \
  -H "X-Service-Key: $SERVICE_KEY" \
  -d "$(jq -n --arg r "$LONG_REASONING" '{
    agent_id: "fullstack",
    scores: {task_completion: 7, accuracy: 7, efficiency: 7, judgment: 7, communication: 7, domain_expertise: 7, autonomy: 7, safety: 7},
    evaluator_type: "auto",
    task_description: "E2E test: long reasoning",
    reasoning: $r,
    project: "agent-evaluation"
  }')")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
assert_status "4999-char reasoning accepted" "201" "$HTTP_CODE"

echo ""

# --- Test 5: POST with reasoning over limit ---
echo "5. POST with reasoning over limit (5001 chars)"
OVER_REASONING=$(python3 -c "print('Y' * 5001)" 2>/dev/null || printf 'Y%.0s' $(seq 1 5001))
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_BASE/api/evaluations" \
  -H "content-type: application/json" \
  -H "X-Service-Key: $SERVICE_KEY" \
  -d "$(jq -n --arg r "$OVER_REASONING" '{
    agent_id: "fullstack",
    scores: {task_completion: 7, accuracy: 7, efficiency: 7, judgment: 7, communication: 7, domain_expertise: 7, autonomy: 7, safety: 7},
    evaluator_type: "auto",
    task_description: "E2E test: over-limit reasoning",
    reasoning: $r,
    project: "agent-evaluation"
  }')")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
assert_status "5001-char reasoning rejected" "400" "$HTTP_CODE"

echo ""

# --- Test 6: POST with HTML in reasoning (XSS check) ---
echo "6. POST with HTML in reasoning (XSS prevention)"
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_BASE/api/evaluations" \
  -H "content-type: application/json" \
  -H "X-Service-Key: $SERVICE_KEY" \
  -d "$(jq -n '{
    agent_id: "fullstack",
    scores: {task_completion: 7, accuracy: 7, efficiency: 7, judgment: 7, communication: 7, domain_expertise: 7, autonomy: 7, safety: 7},
    evaluator_type: "auto",
    task_description: "E2E test: HTML in reasoning",
    reasoning: "This has <script>alert(1)</script> and <b>bold</b> tags.",
    project: "agent-evaluation"
  }')")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')
assert_status "HTML reasoning accepted (tags stripped)" "201" "$HTTP_CODE"

REASONING_BACK=$(echo "$BODY" | jq -r '.evaluation.reasoning // "null"' 2>/dev/null || echo "null")
# Should NOT contain script tags
echo "$REASONING_BACK" | grep -q '<script>' && { echo "  FAIL: script tags not stripped"; FAIL=$((FAIL + 1)); } || { echo "  PASS: script tags stripped"; PASS=$((PASS + 1)); }
# Should contain the text content
echo "$REASONING_BACK" | grep -q 'alert(1)' && { echo "  PASS: text content preserved after stripping"; PASS=$((PASS + 1)); } || { echo "  FAIL: text content lost"; FAIL=$((FAIL + 1)); }

echo ""

# --- Test 7: GET evaluations — reasoning field present ---
echo "7. GET evaluations includes reasoning field"
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_BASE/api/agents/$TEST_AGENT/evaluations" \
  -H "X-Service-Key: $SERVICE_KEY")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')
assert_status "GET evaluations returns 200" "200" "$HTTP_CODE"

# Check that the response has evaluations with reasoning field
FIRST_EVAL=$(echo "$BODY" | jq '.[0] // .evaluations[0] // null' 2>/dev/null)
if [ "$FIRST_EVAL" != "null" ] && [ -n "$FIRST_EVAL" ]; then
  HAS_REASONING_KEY=$(echo "$FIRST_EVAL" | jq 'has("reasoning")' 2>/dev/null || echo "false")
  assert_field "evaluation object has reasoning key" "true" "$HAS_REASONING_KEY"
else
  echo "  SKIP: no evaluations to check (this is fine if agent has no evals)"
fi

echo ""

# --- Test 8: Agent detail — latest_evaluation has reasoning ---
echo "8. Agent detail includes reasoning in latest_evaluation"
RESPONSE=$(curl -s -w "\n%{http_code}" "$API_BASE/api/agents/$TEST_AGENT" \
  -H "X-Service-Key: $SERVICE_KEY")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')
assert_status "GET agent detail returns 200" "200" "$HTTP_CODE"

LATEST_EVAL=$(echo "$BODY" | jq '.latest_evaluation // null' 2>/dev/null)
if [ "$LATEST_EVAL" != "null" ] && [ -n "$LATEST_EVAL" ]; then
  HAS_REASONING_KEY=$(echo "$LATEST_EVAL" | jq 'has("reasoning")' 2>/dev/null || echo "false")
  assert_field "latest_evaluation has reasoning key" "true" "$HAS_REASONING_KEY"
else
  echo "  SKIP: no latest_evaluation (first eval for this agent)"
fi

echo ""

# --- Summary ---
TOTAL=$((PASS + FAIL))
echo "=== Results: $PASS/$TOTAL passed, $FAIL failed ==="

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
exit 0
