#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SHA="$(git -C "$ROOT" rev-parse HEAD)"
SHORT="$(git -C "$ROOT" rev-parse --short HEAD)"
REPORT="$ROOT/.cursor/autopilot-3x-d31a624.txt"
: > "$REPORT"
for i in 1 2 3; do
  pkill -f firebase 2>/dev/null || true
  pkill -f vitest 2>/dev/null || true
  fuser -k 9000/tcp 9099/tcp 4400/tcp 2>/dev/null || true
  sleep 3
  echo "=== RUN $i $SHORT ($SHA) ===" | tee -a "$REPORT"
  (
    cd "$ROOT"
    SAFE_CHAT_INTEGRATION=1 npm run test:safe-chat
  ) > "$ROOT/.cursor/3x-run$i.log" 2>&1 && EC=0 || EC=$?
  echo "EXIT=$EC" | tee -a "$REPORT"
  rg "^ Test Files|^      Tests " "$ROOT/.cursor/3x-run$i.log" | tee -a "$REPORT" || true
  rg "All safe-chat automated checks passed|CTRL0:|MUT-MIRROR-HIDDEN:|mutation-check:" "$ROOT/.cursor/3x-run$i.log" | tee -a "$REPORT" || true
  if [[ "$EC" -ne 0 ]]; then
    rg "FAIL  src|shuffle seed.*FAIL|NOT CAUGHT|mutation-check:" "$ROOT/.cursor/3x-run$i.log" | tail -12 | tee -a "$REPORT" || true
    echo "FULL_SHA=$SHA" >> "$REPORT"
    exit "$EC"
  fi
done
echo "FULL_SHA=$SHA" >> "$REPORT"
echo "STREAK=3x EXIT 0" | tee -a "$REPORT"
