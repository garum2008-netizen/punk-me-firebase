#!/usr/bin/env bash
# Deploy pinned Game Bot tarball (site + functions/) to Cloudflare Pages.
set -euo pipefail
EXPECTED_SHA="cf9239e66f4fc2b84d24986af51f447d808da9964c62a8f0ebfe3054ab803045"
BUNDLE="${1:-/cursor/stores/self/preview-552740b/punk-me-preview-552740b.tar.gz}"
PROJECT="${CLOUDFLARE_PAGES_PROJECT:-punk-me-ch1-preview}"
ACCOUNT="${CLOUDFLARE_ACCOUNT_ID:-${CF_ACCOUNT_ID:-}}"
TOKEN="${CLOUDFLARE_API_TOKEN:-${CF_API_TOKEN:-}}"

[[ -f "$BUNDLE" ]] || { echo "missing bundle: $BUNDLE"; exit 1; }
ACTUAL_SHA="$(sha256sum "$BUNDLE" | awk '{print $1}')"
if [[ "$ACTUAL_SHA" != "$EXPECTED_SHA" ]]; then
  echo "sha256 mismatch: got $ACTUAL_SHA expected $EXPECTED_SHA"
  exit 1
fi
[[ -n "$TOKEN" && -n "$ACCOUNT" ]] || {
  echo "set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID"
  exit 2
}

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
tar -xzf "$BUNDLE" -C "$STAGE"
export CLOUDFLARE_API_TOKEN="$TOKEN"
export CLOUDFLARE_ACCOUNT_ID="$ACCOUNT"
npx --yes wrangler@4.156.2 pages deploy "$STAGE" \
  --project-name "$PROJECT" \
  --branch "preview-552740b" \
  --commit-dirty=true
echo "deploy-verified-bundle: PASS ($PROJECT)"
