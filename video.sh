#!/usr/bin/env bash
# Thin wrapper for macOS/Linux: ./video.sh <command> [project]. Same as `node bin/reelwright.mjs`; run it with no command for help.
exec node "$(dirname "$0")/bin/reelwright.mjs" "$@"
