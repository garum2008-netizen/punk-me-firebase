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

RULES_OUT="$OUT/rtdb-rules-prod-${STAMP}.json"
echo "==> [1/3] Export LIVE database rules (read-only) → $RULES_OUT"
if npx firebase database:rules:get --project "$PROJECT" > "$RULES_OUT" 2>/dev/null && grep -q '"rules"' "$RULES_OUT"; then
  echo "    (via firebase database:rules:get)"
else
  echo "    firebase database:rules:get failed — trying read-only REST (ADC token)"
  TOKEN="$(gcloud auth print-access-token 2>/dev/null || true)"
  if [ -z "$TOKEN" ]; then
    echo "ERROR: need firebase login or gcloud auth application-default login for rules export"
    exit 1
  fi
  # Default RTDB instance; requires cloud-platform or firebase scope on the token.
  curl -fsS \
    "https://${PROJECT}-default-rtdb.firebaseio.com/.settings/rules.json?access_token=${TOKEN}" \
    -o "$RULES_OUT" || {
    echo "ERROR: REST rules export failed. Try: npx firebase login --no-localhost && npx firebase database:rules:get --project $PROJECT"
    exit 1
  }
  echo "    (via RTDB .settings/rules.json REST)"
fi

echo "==> [2/3] list:test-artifacts anon window $ANON_WINDOW"
node scripts/list-test-artifacts.mjs --anon-window="$ANON_WINDOW" | tee "$OUT/test-artifacts-${STAMP}.json"

echo "==> [3/3] auth-stats (counts only)"
node scripts/list-test-artifacts.mjs --auth-stats | tee "$OUT/auth-stats-${STAMP}.json"

echo "Done. Files under $OUT (keep local; do not commit UID dumps to git)."
