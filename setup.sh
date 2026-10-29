#!/usr/bin/env bash
# One-time setup on macOS or Linux: installs Node if missing, then runs setup.mjs (Windows: run `node setup.mjs`).
set -euo pipefail
cd "$(dirname "$0")"
if ! command -v node >/dev/null; then
  echo "installing node…"
  if [[ "$(uname)" == "Darwin" ]]; then
    command -v brew >/dev/null || { echo "Homebrew is missing. Install it first (paste in Terminal, then re-run ./setup.sh):"
      echo '  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'; exit 1; }
    brew install node
  elif command -v apt-get >/dev/null; then sudo apt-get update -q && sudo apt-get install -yq nodejs npm
  else echo "Install Node 18+ with your package manager, then re-run ./setup.sh"; exit 1; fi
fi
exec node setup.mjs
