#!/bin/bash
# SessionStart hook: silently installs npm dependencies so tsc/build/lint/dev
# work out of the box in fresh (e.g. Claude Code on the web) checkouts.
# - Skips entirely if node_modules already matches package-lock.json, so
#   sessions where dependencies are already cached don't pay any cost.
# - Runs quietly: npm output is captured and only shown if the install fails.
set -euo pipefail

cd "$CLAUDE_PROJECT_DIR"

# Only relevant remotely; on a local machine dependencies are normally
# already installed and this would just add startup latency for nothing.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

if [ ! -f package.json ]; then
  exit 0
fi

# Idempotent skip: if node_modules exists and package-lock.json hasn't
# changed since the last successful install, do nothing.
STAMP=".claude/hooks/.npm-install-stamp"
if [ -d node_modules ] && [ -f "$STAMP" ] && [ package-lock.json -ot "$STAMP" ]; then
  exit 0
fi

LOG="$(mktemp)"
if npm install --no-audit --no-fund > "$LOG" 2>&1; then
  touch "$STAMP"
else
  echo "SessionStart hook: npm install failed. Output:" >&2
  cat "$LOG" >&2
  rm -f "$LOG"
  exit 1
fi
rm -f "$LOG"
