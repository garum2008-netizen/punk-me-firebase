#!/usr/bin/env bash
# Run on inna-mac only after Commander routed the agent here.
set -euo pipefail

PROJECT="${HOME}/Developer/emma-mystical-stories"
CHECKPOINT_ROOT="${PROJECT}/.cursor-checkpoints"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
CHECKPOINT_DIR="${CHECKPOINT_ROOT}/${STAMP}-EMMA-RECOVERY"

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "WRONG_EXECUTION_TARGET: not Darwin" >&2
  exit 1
fi

for path in "/Applications/Inna Audiobook.app" "${PROJECT}"; do
  if [[ ! -e "${path}" ]]; then
    echo "Missing: ${path}" >&2
    exit 1
  fi
done

mkdir -p "${CHECKPOINT_DIR}"

# Snapshot tree without overwriting sources (copy into checkpoint only)
if command -v rsync >/dev/null 2>&1; then
  rsync -a --exclude '.cursor-checkpoints' "${PROJECT}/" "${CHECKPOINT_DIR}/project-mirror/"
else
  cp -R "${PROJECT}/." "${CHECKPOINT_DIR}/project-mirror/"
fi

APP_VERSION="unknown"
if [[ -f "/Applications/Inna Audiobook.app/Contents/Info.plist" ]]; then
  APP_VERSION="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' '/Applications/Inna Audiobook.app/Contents/Info.plist' 2>/dev/null || echo unknown)"
fi

MANIFEST="${CHECKPOINT_DIR}/manifest.json"
FILE_COUNT="$(find "${CHECKPOINT_DIR}/project-mirror" -type f 2>/dev/null | wc -l | tr -d ' ')"

cat > "${MANIFEST}" <<EOF
{
  "mission": "EMMA-RECOVERY-20261111",
  "createdAtUtc": "${STAMP}",
  "checkpointDir": "${CHECKPOINT_DIR}",
  "appVersion": "${APP_VERSION}",
  "fileCount": ${FILE_COUNT}
}
EOF

echo "Checkpoint: ${CHECKPOINT_DIR}"
echo "Files: ${FILE_COUNT}"
echo "App version: ${APP_VERSION}"
cat "${MANIFEST}"
