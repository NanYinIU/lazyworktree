#!/usr/bin/env bash
set -euo pipefail

TOOL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Require Node.js 18 or newer.
if ! command -v node &>/dev/null; then
  echo "Error: Node.js is not installed. Please install Node.js >= 18." >&2
  exit 1
fi

NODE_MAJOR=$(node -e "console.log(process.versions.node.split('.')[0])")
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "Error: Node.js >= 18 is required (found $(node --version))." >&2
  exit 1
fi

# Require npm for first-run dependency installation.
if ! command -v npm &>/dev/null; then
  echo "Error: npm is not installed. Please install npm." >&2
  exit 1
fi

# Install dependencies on first run.
if [ ! -d "$TOOL_DIR/node_modules" ]; then
  echo "Installing dependencies (first run)..."
  (cd "$TOOL_DIR" && npm install)
fi

# Run the TUI from the current workspace.
exec npx --prefix "$TOOL_DIR" tsx "$TOOL_DIR/src/index.tsx" "$@"
