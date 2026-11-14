#!/usr/bin/env bash
# Package t209 Ch1 acceptance artifacts into Agent Store (no deploy).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SHA="$(git -C "$ROOT" rev-parse HEAD)"
SHORT="${SHA:0:12}"
STORE="/cursor/stores/self/t209-ch1-acceptance-${SHORT}"
ART="/opt/cursor/artifacts"
ICE="${ART}/ice-ch1-footage"

mkdir -p "$STORE/evidence" "$STORE/video" "$STORE/docs"

"$ROOT/scripts/package-preview-agent-store.sh" "$STORE/preview-bundle"

PASS_TAG="${ORDINARY_PASS_TAG:-pass-t209-ch1-full}"
for f in "$ICE/ice-ch1-ORDINARY-UNCUT-desktop-${SHORT}"-*-"${PASS_TAG}.webm"; do
  [[ -f "$f" ]] && cp "$f" "$STORE/video/" && break
done
for f in "$ICE/ice-ordinary-footage-metadata-${PASS_TAG}.json" "$ICE/t209-onboarding-sequence-proof-${SHORT}.json"; do
  [[ -f "$f" ]] && cp "$f" "$STORE/evidence/"
done
for f in "$ICE/CH1_PLAYTHROUGH_LOG-${SHORT}.md" "$ROOT/docs/handover/T209U_ACCEPTANCE_REPORT.md"; do
  [[ -f "$f" ]] && cp "$f" "$STORE/docs/"
done
cp "$ART/avatar-qa-t207/wing-clip-samples-t207.json" "$STORE/evidence/" 2>/dev/null || true

tar -czf "$STORE/t209-ch1-acceptance-${SHORT}.tar.gz" -C "$STORE" evidence video docs preview-bundle MANIFEST.json 2>/dev/null || \
  tar -czf "$STORE/t209-ch1-acceptance-${SHORT}.tar.gz" -C "$STORE" .
HASH="$(sha256sum "$STORE/t209-ch1-acceptance-${SHORT}.tar.gz" | awk '{print $1}')"
echo "$HASH" > "$STORE/ACCEPTANCE.sha256"
cat > "$STORE/ACCEPTANCE_MANIFEST.json" <<EOF
{
  "gitSha": "$SHA",
  "acceptanceTarball": "t209-ch1-acceptance-${SHORT}.tar.gz",
  "sha256": "$HASH",
  "agentStorePath": "$STORE"
}
EOF
echo "STORE=$STORE"
echo "SHA256=$HASH"