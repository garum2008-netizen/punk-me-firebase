#!/usr/bin/env bash
# Build preview @ HEAD and publish tarball to Agent Store for Game Bot.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SHA="$(git -C "$ROOT" rev-parse HEAD)"
SHORT="${SHA:0:12}"
STORE="${1:-/cursor/stores/self/preview-${SHORT}}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

(cd "$ROOT" && npm run build:preview)
cp -a "$ROOT/dist-preview/." "$TMP/"
git -C "$ROOT" archive HEAD functions | tar -x -C "$TMP"

mkdir -p "$STORE" "$STORE/functions"
tar -czf "$STORE/punk-me-preview-${SHORT}.tar.gz" -C "$TMP" .
cp "$ROOT/docs/handover/PREVIEW_DEPLOY_FOR_GAME_BOT.md" "$STORE/" 2>/dev/null || true
cp "$TMP/functions/_middleware.js" "$STORE/functions/" 2>/dev/null || true

HASH="$(sha256sum "$STORE/punk-me-preview-${SHORT}.tar.gz" | awk '{print $1}')"
cat > "$STORE/MANIFEST.json" <<EOF
{
  "gitSha": "$SHA",
  "tarball": "punk-me-preview-${SHORT}.tar.gz",
  "sha256": "$HASH",
  "includes": ["dist-preview at archive root", "functions/_middleware.js", "robots.txt", "_headers"],
  "previewUrl": "https://punk-me-preview-552740b.pages.dev",
  "deployTargetProject": "punk-me-preview-552740b"
}
EOF
echo "$HASH" > "$STORE/MANIFEST.sha256"
echo "AGENT_STORE=$STORE"
echo "SHA256=$HASH"
echo "GIT_SHA=$SHA"
