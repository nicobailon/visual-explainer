#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <html-file>" >&2
  exit 2
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HTML_FILE="$1"

if node "$SCRIPT_DIR/open-with-glimpse.mjs" --check >/dev/null 2>&1; then
  node "$SCRIPT_DIR/open-with-glimpse.mjs" "$HTML_FILE" >/tmp/visual-explainer-glimpse.log 2>&1 &
  disown || true
else
  case "$(uname -s)" in
    Darwin) open "$HTML_FILE" ;;
    Linux) xdg-open "$HTML_FILE" ;;
    MINGW*|MSYS*|CYGWIN*) start "" "$HTML_FILE" ;;
    *) echo "No opener known for this OS. File: $HTML_FILE" >&2 ;;
  esac
fi
