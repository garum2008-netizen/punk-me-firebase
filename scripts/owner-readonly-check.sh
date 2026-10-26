#!/usr/bin/env bash
# Owner-only read-only session: live RTDB rules export + test artifact inventory + auth stats.
# Run in Google Cloud Shell with ADC (no writes to RTDB/Auth).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PROJECT="${FIREBASE_PROJECT:-punk-me-40605}"
STAMP="$(date -u +%Y%m%dT%H%MZ)"
OUT="${OUT_DIR:-$ROOT/docs/release/prod-readonly-snapshots}"
ANON_WINDOW="${ANON_WINDOW:-2026-10-24T00:00:00Z/2026-10-26T00:00:00Z}"
mkdir -p "$OUT"

echo "==> [1/3] Export LIVE database rules (read-only) → $OUT/rtdb-rules-prod-${STAMP}.json"
npx firebase database:rules:get --project "$PROJECT" > "$OUT/rtdb-rules-prod-${STAMP}.json"

echo "==> [2/3] list:test-artifacts anon window $ANON_WINDOW"
node scripts/list-test-artifacts.mjs --anon-window="$ANON_WINDOW" | tee "$OUT/test-artifacts-${STAMP}.json"

echo "==> [3/3] auth-stats (counts only)"
node scripts/list-test-artifacts.mjs --auth-stats | tee "$OUT/auth-stats-${STAMP}.json"

echo "Done. Files under $OUT (keep local; do not commit UID dumps to git)."
