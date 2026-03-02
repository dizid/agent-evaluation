#!/bin/bash
# reasoning-extraction.test.sh — Tests for the reasoning extraction sed pipeline
# used in eval-fast.sh and eval-deep.sh
#
# Run: bash tests/scripts/reasoning-extraction.test.sh

set -euo pipefail

PASS=0
FAIL=0

# The exact sed pipeline used in both eval scripts
extract_reasoning() {
  echo "$1" | sed -n '/<reasoning>/,/<\/reasoning>/p' | sed '1s/^<reasoning>//; $s/<\/reasoning>$//' | sed '/^$/d' 2>/dev/null || true
}

assert_eq() {
  local test_name="$1"
  local expected="$2"
  local actual="$3"
  if [ "$expected" = "$actual" ]; then
    echo "  PASS: $test_name"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $test_name"
    echo "    expected: $(echo "$expected" | head -1)..."
    echo "    actual:   $(echo "$actual" | head -1)..."
    FAIL=$((FAIL + 1))
  fi
}

assert_empty() {
  local test_name="$1"
  local actual="$2"
  if [ -z "$actual" ]; then
    echo "  PASS: $test_name"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $test_name (expected empty, got: ${actual:0:50})"
    FAIL=$((FAIL + 1))
  fi
}

assert_not_empty() {
  local test_name="$1"
  local actual="$2"
  if [ -n "$actual" ]; then
    echo "  PASS: $test_name"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $test_name (expected non-empty, got empty)"
    FAIL=$((FAIL + 1))
  fi
}

echo "=== Reasoning Extraction Tests ==="
echo ""

# --- Test 1: Standard extraction ---
echo "1. Standard extraction"
INPUT='Some preamble text
<reasoning>
Task: The agent was asked to build a login form.
Outcome: Completed successfully.
</reasoning>
{"scores": {"task_completion": 8}}'

RESULT=$(extract_reasoning "$INPUT")
assert_not_empty "extracts reasoning from well-formed tags" "$RESULT"
# Should NOT contain the XML tags
echo "$RESULT" | grep -q '<reasoning>' && { echo "  FAIL: still contains opening tag"; FAIL=$((FAIL + 1)); } || { echo "  PASS: opening tag stripped"; PASS=$((PASS + 1)); }
echo "$RESULT" | grep -q '</reasoning>' && { echo "  FAIL: still contains closing tag"; FAIL=$((FAIL + 1)); } || { echo "  PASS: closing tag stripped"; PASS=$((PASS + 1)); }
# Should contain the actual content
echo "$RESULT" | grep -q 'Task: The agent was asked' && { echo "  PASS: content preserved"; PASS=$((PASS + 1)); } || { echo "  FAIL: content not found"; FAIL=$((FAIL + 1)); }

echo ""

# --- Test 2: Multi-line reasoning ---
echo "2. Multi-line reasoning"
INPUT='<reasoning>
Task: Build a dashboard.
Outcome: Completed with minor issues.
Evidence per criterion:
- task_completion: Built all 3 widgets
- accuracy: One widget had wrong data source
- efficiency: Used 15 tool calls (could be 10)
- judgment: Good decisions on layout
- communication: Clear explanations throughout
- domain_expertise: Strong Vue.js knowledge
- autonomy: Needed 2 clarifications
- safety: No destructive operations attempted
</reasoning>
{"scores": {"task_completion": 7}}'

RESULT=$(extract_reasoning "$INPUT")
LINE_COUNT=$(echo "$RESULT" | wc -l)
assert_not_empty "multi-line reasoning extracted" "$RESULT"
# Should have multiple lines (the evidence lines)
if [ "$LINE_COUNT" -ge 8 ]; then
  echo "  PASS: multi-line preserved ($LINE_COUNT lines)"
  PASS=$((PASS + 1))
else
  echo "  FAIL: expected 8+ lines, got $LINE_COUNT"
  FAIL=$((FAIL + 1))
fi

echo ""

# --- Test 3: Empty reasoning (no tags at all) ---
echo "3. Empty reasoning"
INPUT='{"scores": {"task_completion": 7}, "task_description": "No reasoning here"}'
RESULT=$(extract_reasoning "$INPUT")
assert_empty "no reasoning tags → empty result" "$RESULT"

echo ""

# --- Test 4: Empty reasoning tags ---
echo "4. Empty reasoning tags"
INPUT='<reasoning>
</reasoning>
{"scores": {"task_completion": 7}}'
RESULT=$(extract_reasoning "$INPUT")
assert_empty "empty reasoning tags → empty result" "$RESULT"

echo ""

# --- Test 5: Malformed tags (no closing) ---
echo "5. Malformed tags"
INPUT='<reasoning>
Some reasoning without closing tag
{"scores": {"task_completion": 7}}'
# sed -n will capture from <reasoning> to end of input (no closing tag found)
RESULT=$(extract_reasoning "$INPUT")
# It should still capture something (everything after opening tag)
assert_not_empty "partial tags still capture content" "$RESULT"

echo ""

# --- Test 6: Special characters in reasoning ---
echo "6. Special characters"
INPUT='<reasoning>
Task: Agent used "$HOME" variable and `backtick` commands.
The score was 8/10 (good). Path: /home/user'\''s/dir.
Used && and || operators. Price: $99.
</reasoning>
{"scores": {"task_completion": 8}}'

RESULT=$(extract_reasoning "$INPUT")
assert_not_empty "special characters preserved" "$RESULT"
echo "$RESULT" | grep -q 'backtick' && { echo "  PASS: backtick content preserved"; PASS=$((PASS + 1)); } || { echo "  FAIL: backtick content lost"; FAIL=$((FAIL + 1)); }

echo ""

# --- Test 7: Reasoning with JSON-like content inside ---
echo "7. JSON inside reasoning"
INPUT='<reasoning>
The scores object looks like {"task_completion": 8, "accuracy": 7}.
Agent used array [1, 2, 3] in the code.
Key: value pairs were present.
</reasoning>
{"scores": {"task_completion": 8}}'

RESULT=$(extract_reasoning "$INPUT")
assert_not_empty "JSON-like content inside reasoning doesn't break extraction" "$RESULT"
echo "$RESULT" | grep -q '"task_completion": 8' && { echo "  PASS: JSON content preserved in reasoning"; PASS=$((PASS + 1)); } || { echo "  FAIL: JSON content lost"; FAIL=$((FAIL + 1)); }

echo ""

# --- Test 8: jq payload construction with reasoning ---
echo "8. jq payload construction"
REASONING_TEXT="Task: Build a form.
Outcome: Success with minor issues.
Evidence: task_completion scored 7 because of edge cases."

PAYLOAD=$(jq -n \
  --arg agent_id "fullstack" \
  --argjson scores '{"task_completion": 7, "accuracy": 8}' \
  --arg reasoning "$REASONING_TEXT" \
  '{
    agent_id: $agent_id,
    scores: $scores,
    reasoning: $reasoning
  }' 2>/dev/null || echo "FAILED")

if [ "$PAYLOAD" = "FAILED" ]; then
  echo "  FAIL: jq payload construction failed"
  FAIL=$((FAIL + 1))
else
  echo "  PASS: jq produced valid JSON"
  PASS=$((PASS + 1))

  # Verify reasoning field exists and contains the text
  EXTRACTED=$(echo "$PAYLOAD" | jq -r '.reasoning' 2>/dev/null)
  echo "$EXTRACTED" | grep -q 'Task: Build a form' && { echo "  PASS: reasoning field has content"; PASS=$((PASS + 1)); } || { echo "  FAIL: reasoning field empty or wrong"; FAIL=$((FAIL + 1)); }

  # Verify agent_id wasn't corrupted
  AGENT=$(echo "$PAYLOAD" | jq -r '.agent_id' 2>/dev/null)
  assert_eq "agent_id preserved" "fullstack" "$AGENT"
fi

echo ""

# --- Test 9: jq with empty reasoning ---
echo "9. jq with empty reasoning"
PAYLOAD=$(jq -n \
  --arg agent_id "fullstack" \
  --argjson scores '{"task_completion": 7}' \
  --arg reasoning "" \
  '{
    agent_id: $agent_id,
    scores: $scores,
    reasoning: $reasoning
  }' 2>/dev/null || echo "FAILED")

if [ "$PAYLOAD" = "FAILED" ]; then
  echo "  FAIL: jq with empty reasoning failed"
  FAIL=$((FAIL + 1))
else
  EXTRACTED=$(echo "$PAYLOAD" | jq -r '.reasoning' 2>/dev/null)
  assert_eq "empty reasoning → empty string in JSON" "" "$EXTRACTED"
fi

echo ""

# --- Test 10: Large reasoning (stress test) ---
echo "10. Large reasoning"
LARGE_REASONING="<reasoning>"
for i in $(seq 1 100); do
  LARGE_REASONING+="
Line $i: This is a test line with evidence about criterion number $i."
done
LARGE_REASONING+="
</reasoning>"

RESULT=$(extract_reasoning "$LARGE_REASONING")
LINE_COUNT=$(echo "$RESULT" | wc -l)
if [ "$LINE_COUNT" -ge 90 ]; then
  echo "  PASS: large reasoning preserved ($LINE_COUNT lines)"
  PASS=$((PASS + 1))
else
  echo "  FAIL: large reasoning truncated ($LINE_COUNT lines)"
  FAIL=$((FAIL + 1))
fi

# Verify jq can handle it
PAYLOAD=$(jq -n --arg reasoning "$RESULT" '{reasoning: $reasoning}' 2>/dev/null || echo "FAILED")
if [ "$PAYLOAD" = "FAILED" ]; then
  echo "  FAIL: jq choked on large reasoning"
  FAIL=$((FAIL + 1))
else
  echo "  PASS: jq handles large reasoning"
  PASS=$((PASS + 1))
fi

echo ""

# --- Summary ---
TOTAL=$((PASS + FAIL))
echo "=== Results: $PASS/$TOTAL passed, $FAIL failed ==="

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
exit 0
