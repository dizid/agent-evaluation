#!/usr/bin/env bash
#
# AgentEval Install Script
# Sets up agents, SubagentStop hook, and MCP server for Claude Code.
# Safe to run multiple times (idempotent).
#
# Usage: bash scripts/install.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SETTINGS_FILE="$HOME/.claude/settings.json"
AGENTS_DIR="$HOME/.claude/agents"

GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[+]${NC} $1"; }
skip() { echo -e "${YELLOW}[~]${NC} $1 (already configured)"; }

# --- Prerequisites ---

if ! command -v jq &>/dev/null; then
  echo "Error: jq is required. Install with: sudo apt install jq"
  exit 1
fi

if [ ! -f "$SETTINGS_FILE" ]; then
  echo "Error: $SETTINGS_FILE not found. Is Claude Code installed?"
  exit 1
fi

# Read SERVICE_KEY from .env (careful with & in DATABASE_URL)
SERVICE_KEY=""
if [ -f "$PROJECT_DIR/.env" ]; then
  SERVICE_KEY=$(grep '^SERVICE_KEY=' "$PROJECT_DIR/.env" | cut -d'=' -f2 || true)
fi

if [ -z "$SERVICE_KEY" ]; then
  echo "Warning: SERVICE_KEY not found in .env — MCP server won't work without it."
fi

# --- 1. Sync agent files ---

mkdir -p "$AGENTS_DIR"
AGENT_COUNT=$(ls "$PROJECT_DIR/agents/"*.md 2>/dev/null | wc -l)
if [ "$AGENT_COUNT" -gt 0 ]; then
  cp "$PROJECT_DIR/agents/"*.md "$AGENTS_DIR/"
  log "Agents synced ($AGENT_COUNT files → ~/.claude/agents/)"
else
  echo "Warning: No agent .md files found in $PROJECT_DIR/agents/"
fi

# --- 2. Register SubagentStop hook ---

HOOK_CMD="$PROJECT_DIR/scripts/auto-eval.sh"
EXISTING_HOOK=$(jq -r '.hooks.SubagentStop // empty' "$SETTINGS_FILE")

if echo "$EXISTING_HOOK" | grep -q "auto-eval.sh"; then
  skip "SubagentStop hook"
else
  # Merge hook into settings.json
  HOOK_JSON=$(cat <<EOF
{
  "matcher": "",
  "hooks": [{
    "type": "command",
    "command": "$HOOK_CMD",
    "timeout": 60
  }]
}
EOF
)
  jq --argjson hook "$HOOK_JSON" '.hooks.SubagentStop = (.hooks.SubagentStop // []) + [$hook]' "$SETTINGS_FILE" > "${SETTINGS_FILE}.tmp"
  mv "${SETTINGS_FILE}.tmp" "$SETTINGS_FILE"
  log "SubagentStop hook registered"
fi

# --- 3. Register MCP server in project .mcp.json ---

MCP_FILE="$PROJECT_DIR/.mcp.json"

if [ -f "$MCP_FILE" ] && jq -e '.mcpServers.agenteval' "$MCP_FILE" &>/dev/null; then
  skip "MCP server (.mcp.json)"
else
  cat > "$MCP_FILE" <<EOF
{
  "mcpServers": {
    "agenteval": {
      "command": "npx",
      "args": ["tsx", "$PROJECT_DIR/mcp-server/index.ts"],
      "env": {
        "HIREFIRE_SERVICE_KEY": "$SERVICE_KEY"
      }
    }
  }
}
EOF
  log "MCP server registered in .mcp.json"
fi

# --- 4. Install MCP server dependencies ---

MCP_DIR="$PROJECT_DIR/mcp-server"
if [ -d "$MCP_DIR/node_modules" ]; then
  skip "MCP server dependencies"
else
  if [ -f "$MCP_DIR/package.json" ]; then
    (cd "$MCP_DIR" && npm install --silent)
    log "MCP server dependencies installed"
  else
    echo "Warning: mcp-server/package.json not found — skipping dependency install"
  fi
fi

# --- Summary ---

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  AgentEval setup complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Agents:    $AGENT_COUNT files → ~/.claude/agents/"
echo "  Hook:      SubagentStop → auto-eval.sh"
echo "  MCP:       agenteval server → .mcp.json"
echo "  Dashboard: https://hirefire.dev"
echo ""
echo "  Restart Claude Code to activate the MCP server."
echo ""
