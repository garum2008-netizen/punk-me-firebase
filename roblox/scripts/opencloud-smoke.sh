#!/usr/bin/env bash
# Open Cloud Luau Execution smoke test (private test place only).
# Requires secrets — never commit API keys.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
API_KEY="${ROBLOX_OPEN_CLOUD_KEY:-}"
UNIVERSE_ID="${ROBLOX_UNIVERSE_ID:-}"
PLACE_ID="${ROBLOX_PLACE_ID:-}"
VERSION_ID="${ROBLOX_PLACE_VERSION:-0}"
SCRIPT_FILE="${ROOT}/scripts/opencloud-smoke.luau"

if [[ -z "$API_KEY" || -z "$UNIVERSE_ID" || -z "$PLACE_ID" ]]; then
  echo "Set ROBLOX_OPEN_CLOUD_KEY, ROBLOX_UNIVERSE_ID, ROBLOX_PLACE_ID (and optional ROBLOX_PLACE_VERSION)." >&2
  exit 2
fi

if [[ ! -f "$SCRIPT_FILE" ]]; then
  echo "Missing $SCRIPT_FILE" >&2
  exit 2
fi

SCRIPT_BODY="$(python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))' < "$SCRIPT_FILE")"
BASE="https://apis.roblox.com/cloud/v2/universes/${UNIVERSE_ID}/places/${PLACE_ID}/versions/${VERSION_ID}/luau-execution-session-tasks"

echo "Creating Luau execution task (universe=$UNIVERSE_ID place=$PLACE_ID version=$VERSION_ID)..."
CREATE_RESP="$(curl -sS -X POST "$BASE" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"script\": $SCRIPT_BODY}")"

TASK_PATH="$(python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("path",""))' <<< "$CREATE_RESP")"
if [[ -z "$TASK_PATH" ]]; then
  echo "Create task failed: $CREATE_RESP" >&2
  exit 1
fi

echo "Task: $TASK_PATH"
STATE="STATE_UNSPECIFIED"
for _ in $(seq 1 60); do
  sleep 2
  TASK_RESP="$(curl -sS -H "x-api-key: $API_KEY" "https://apis.roblox.com/${TASK_PATH}")"
  STATE="$(python3 -c 'import json,sys; print(json.load(sys.stdin).get("state","?"))' <<< "$TASK_RESP")"
  echo "  state=$STATE"
  if [[ "$STATE" == "COMPLETED" || "$STATE" == "FAILED" || "$STATE" == "CANCELLED" ]]; then
    echo "$TASK_RESP"
    break
  fi
done

if [[ "$STATE" != "COMPLETED" ]]; then
  echo "Task did not complete successfully (state=$STATE)" >&2
  exit 1
fi

echo "opencloud-smoke: OK"
