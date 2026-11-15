#!/usr/bin/env bash
# Package t209 Ch1 acceptance artifacts into Agent Store (no deploy).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SHA="${PUNK_EVIDENCE_SHA:-$(git -C "$ROOT" rev-parse HEAD)}"
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
         "$ICE/ice-ch1-ORDINARY-UNCUT-desktop-${SHORT}"-*-"${PASS_TAG}.mp4" \
         "$ICE/ice-ch1-ORDINARY-UNCUT-desktop-${SHORT}"-*-"${PASS_TAG}.mkv"; do
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
  BEAT_DIR="$STORE/stills/video-beat-frames"
  node "$ROOT/scripts/extract-video-beat-frames.js" "$VIDEO" "$BEAT_DIR" || echo "WARN: beat frame extract failed" >&2
  [[ -f "$BEAT_DIR/BEAT_FRAMES_MANIFEST.json" ]] && cp "$BEAT_DIR/BEAT_FRAMES_MANIFEST.json" "$STORE/evidence/"
  LUM_DIR=$(ls -d "$ICE/luminance-scan-${SHORT}"-* 2>/dev/null | head -1)
  if [[ -d "$LUM_DIR" ]]; then
    mkdir -p "$STORE/stills/luminance-scan"
    cp "$LUM_DIR/LUMINANCE_SCAN.json" "$STORE/stills/luminance-scan/"
    for f in "$LUM_DIR"/frame-*.png; do
      [[ -f "$f" ]] || continue
      base=$(basename "$f")
      num=${base#frame-}
      num=${num%.png}
      if [[ "$num" =~ ^[0-9]+$ ]] && (( 10#$num % 5 == 0 )); then
        cp "$f" "$STORE/stills/luminance-scan/"
      fi
    done
    node "$ROOT/scripts/verify-grok-six-points.js" "$VIDEO" "$STORE/stills/luminance-scan" "$BEAT_DIR" \
      || echo "WARN: grok six-point verify failed" >&2
    [[ -f "$STORE/stills/luminance-scan/GROK_SIX_POINT_VERIFY.json" ]] && \
      cp "$STORE/stills/luminance-scan/GROK_SIX_POINT_VERIFY.json" "$STORE/evidence/"
  fi
fi

STILLS_DIR=$(ls -d "$ICE/hero-stills-${SHORT}-${PASS_TAG}" 2>/dev/null | head -1)
[[ -d "$STILLS_DIR" ]] && cp -r "$STILLS_DIR/." "$STORE/stills/"
STUDIO_DIR=$(ls -d "$ICE/studio-step-stills-${SHORT}-${PASS_TAG}" 2>/dev/null | head -1)
if [[ -d "$STUDIO_DIR" ]]; then
  mkdir -p "$STORE/stills/studio-step-stills"
  cp -r "$STUDIO_DIR/." "$STORE/stills/studio-step-stills/"
fi
FRAMES_DIR=$(ls -d "$ICE/hero-frames-video-${SHORT}-${PASS_TAG}" 2>/dev/null | head -1)
if [[ -d "$FRAMES_DIR" ]]; then
  mkdir -p "$STORE/stills/video-frames"
  cp -r "$FRAMES_DIR/." "$STORE/stills/video-frames/"
fi

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