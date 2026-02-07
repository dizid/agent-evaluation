#!/bin/bash
# install-hooks.sh — Deploy Dizid agents + auto-eval hooks to a client project
#
# Usage:
#   ./install-hooks.sh /path/to/project [agent1 agent2 ...]
#   ./install-hooks.sh ~/DEV/crypto fullstack platform data
#   ./install-hooks.sh ~/DEV/site-improver fullstack    # just one agent
#   ./install-hooks.sh ~/DEV/myapp                      # default: fullstack only
#
# What it does:
#   1. Creates .claude/agents/ in the project with symlinks to agent definitions
#   2. Copies auto-eval.sh hook script
#   3. Configures SubagentStop hook in .claude/settings.json

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
AGENTS_DIR="$(cd "$SCRIPT_DIR/../agents" && pwd)"

# Validate args
if [ $# -lt 1 ]; then
  echo "Usage: $0 /path/to/project [agent1 agent2 ...]"
  echo ""
  echo "Available agents:"
  ls "$AGENTS_DIR"/*.md 2>/dev/null | xargs -I {} basename {} .md | grep -v CLAUDE-TEAM | sort | tr '\n' ' '
  echo ""
  exit 1
fi

PROJECT_DIR="$1"
shift

# Default to fullstack if no agents specified
if [ $# -eq 0 ]; then
  AGENTS=("fullstack")
else
  AGENTS=("$@")
fi

# Validate project directory exists
if [ ! -d "$PROJECT_DIR" ]; then
  echo "Error: Project directory does not exist: $PROJECT_DIR"
  exit 1
fi

echo "Installing Dizid agents into: $PROJECT_DIR"
echo "Agents: ${AGENTS[*]}"
echo ""

# 1. Create agent symlinks
mkdir -p "$PROJECT_DIR/.claude/agents"
for agent in "${AGENTS[@]}"; do
  SOURCE="$AGENTS_DIR/$agent.md"
  if [ ! -f "$SOURCE" ]; then
    echo "Warning: Agent file not found: $SOURCE (skipping)"
    continue
  fi
  DEST="$PROJECT_DIR/.claude/agents/$agent.md"
  ln -sf "$SOURCE" "$DEST"
  echo "  Linked: $agent.md -> $SOURCE"
done

# 2. Copy auto-eval hook script
mkdir -p "$PROJECT_DIR/.claude/hooks"
cp "$SCRIPT_DIR/auto-eval.sh" "$PROJECT_DIR/.claude/hooks/auto-eval.sh"
chmod +x "$PROJECT_DIR/.claude/hooks/auto-eval.sh"
echo "  Copied: auto-eval.sh -> .claude/hooks/"

# 3. Configure SubagentStop hook in settings.json
SETTINGS_FILE="$PROJECT_DIR/.claude/settings.json"
HOOK_COMMAND="$PROJECT_DIR/.claude/hooks/auto-eval.sh"

if [ -f "$SETTINGS_FILE" ]; then
  # Merge hook into existing settings
  EXISTING=$(cat "$SETTINGS_FILE")

  # Check if SubagentStop hook already exists
  HAS_HOOK=$(echo "$EXISTING" | jq 'has("hooks") and (.hooks | has("SubagentStop"))' 2>/dev/null || echo "false")

  if [ "$HAS_HOOK" = "true" ]; then
    echo "  SubagentStop hook already configured in settings.json (skipping)"
  else
    # Add hooks to existing settings
    UPDATED=$(echo "$EXISTING" | jq --arg cmd "$HOOK_COMMAND" \
      '.hooks = (.hooks // {}) + {
        "SubagentStop": [{
          "matcher": "",
          "hooks": [{
            "type": "command",
            "command": $cmd,
            "timeout": 60
          }]
        }]
      }')
    echo "$UPDATED" > "$SETTINGS_FILE"
    echo "  Added SubagentStop hook to existing settings.json"
  fi
else
  # Create new settings.json with hook
  jq -n --arg cmd "$HOOK_COMMAND" \
    '{
      "hooks": {
        "SubagentStop": [{
          "matcher": "",
          "hooks": [{
            "type": "command",
            "command": $cmd,
            "timeout": 60
          }]
        }]
      }
    }' > "$SETTINGS_FILE"
  echo "  Created settings.json with SubagentStop hook"
fi

echo ""
echo "Done! Agents installed in $PROJECT_DIR"
echo "Auto-eval will score agent work and POST to https://dizid-agenteval.netlify.app"
echo ""
echo "To remove: rm -rf $PROJECT_DIR/.claude/agents/ $PROJECT_DIR/.claude/hooks/"
