#!/usr/bin/env bash
# Package t209 Ch1 acceptance artifacts into Agent Store (no deploy).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SHA="$(git -C "$ROOT" rev-parse HEAD)"
SHORT="${SHA:0:12}"
STORE="/cursor/stores/self/t209-ch1-acceptance-${SHORT}"
ART="/opt/cursor/artifacts"
ICE="${ART}/ice-ch1-footage"

mkdir -p "$STORE/evidence" "$STORE/video" "$STORE/stills" "$STORE/docs"

"$ROOT/scripts/package-preview-agent-store.sh" "$STORE/preview-bundle"

PASS_TAG="${ORDINARY_PASS_TAG:-pass-t209-ch1-full}"
GATE="$ICE/VIDEO_ACCEPTANCE_GATE-${PASS_TAG}.json"
if [[ -f "$GATE" ]]; then
  cp "$GATE" "$STORE/evidence/"
fi

VIDEO=""
for f in "$ICE/ice-ch1-ORDINARY-UNCUT-desktop-${SHORT}"-*-"${PASS_TAG}.webm" \
         "$ICE/ice-ch1-ORDINARY-UNCUT-desktop-${SHORT}"-*-"${PASS_TAG}.mp4"; do
  if [[ -f "$f" ]]; then
    if [[ "$f" == *45b073f3acef* ]] || [[ "$f" == *7d3d245d* ]]; then
      continue
    fi
    DUR="$(/usr/bin/ffprobe -v error -show_entries format=duration -of csv=p=0 "$f" 2>/dev/null || echo 0)"
    if awk -v d="$DUR" 'BEGIN{exit (d+0 >= 600 ? 0 : 1)}'; then
      VIDEO="$f"
      break
    fi
  fi
done
if [[ -z "$VIDEO" ]]; then
  echo "WARN: no gated full-length video for ${SHORT} ${PASS_TAG}" >&2
else
  cp "$VIDEO" "$STORE/video/"
  sha256sum "$VIDEO" | awk '{print $1}' > "$STORE/video/VIDEO.sha256"
fi

STILLS_DIR=$(ls -d "$ICE/hero-stills-${SHORT}-${PASS_TAG}" 2>/dev/null | head -1)
[[ -d "$STILLS_DIR" ]] && cp -a "$STILLS_DIR/." "$STORE/stills/"
FRAMES_DIR=$(ls -d "$ICE/hero-frames-video-${SHORT}-${PASS_TAG}" 2>/dev/null | head -1)
[[ -d "$FRAMES_DIR" ]] && cp -a "$FRAMES_DIR/." "$STORE/stills/video-frames/"

for f in "$ICE/ice-ordinary-footage-metadata-${PASS_TAG}.json" "$ICE/t209-onboarding-sequence-proof-${SHORT}.json"; do
  [[ -f "$f" ]] && cp "$f" "$STORE/evidence/"
done
for f in "$ICE/CH1_PLAYTHROUGH_LOG-${SHORT}.md" "$ROOT/docs/handover/T209U_ACCEPTANCE_REPORT.md"; do
  [[ -f "$f" ]] && cp "$f" "$STORE/docs/"
done
cp "$ART/avatar-qa-t207/wing-clip-samples-t207.json" "$STORE/evidence/" 2>/dev/null || true

tar -czf "$STORE/t209-ch1-acceptance-${SHORT}.tar.gz" -C "$STORE" evidence video stills docs preview-bundle MANIFEST.json 2>/dev/null || \
  tar -czf "$STORE/t209-ch1-acceptance-${SHORT}.tar.gz" -C "$STORE" .
HASH="$(sha256sum "$STORE/t209-ch1-acceptance-${SHORT}.tar.gz" | awk '{print $1}')"
echo "$HASH" > "$STORE/ACCEPTANCE.sha256"
cat > "$STORE/ACCEPTANCE_MANIFEST.json" <<EOF
{
  "gitSha": "$SHA",
  "acceptanceTarball": "t209-ch1-acceptance-${SHORT}.tar.gz",
  "sha256": "$HASH",
  "videoSha256": "$(cat "$STORE/video/VIDEO.sha256" 2>/dev/null || echo null)",
  "agentStorePath": "$STORE",
  "rejectsLegacy245sWebm": true
}
EOF
echo "STORE=$STORE"
echo "SHA256=$HASH"
echo "VIDEO=${VIDEO:-none}"