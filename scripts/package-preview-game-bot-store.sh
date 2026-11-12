#!/usr/bin/env bash
# Repack pinned preview for Game Bot (site + functions/, no secrets).
set -euo pipefail
SHA="${1:-552740b782bf415cd788f996fd5e7005d9874bfe}"
STORE="${2:-/cursor/stores/self/preview-552740b}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TMP="$STORE/.pack-staging"
rm -rf "$TMP" && mkdir -p "$TMP"
WT="$TMP/worktree"
git -C "$ROOT" worktree add --detach "$WT" "$SHA" 2>/dev/null || true
if [[ ! -d "$WT/dist-preview" ]]; then
  (cd "$WT" && npm ci && npm run build:preview)
fi
cp -a "$WT/dist-preview/." "$TMP/"
mkdir -p "$TMP/functions"
git -C "$ROOT" archive "$SHA" functions | tar -x -C "$TMP"
tar -czf "$STORE/punk-me-preview-552740b.tar.gz" -C "$TMP" .
sha256sum "$STORE/punk-me-preview-552740b.tar.gz" | tee "$STORE/MANIFEST.sha256"
rm -rf "$TMP" "$WT"
echo "OK $STORE"
