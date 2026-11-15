#!/usr/bin/env node
/**
 * Extract proof frames from final Ch1 video at claimed beats (owner / Grok review).
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const FFMPEG = process.env.FFMPEG_PATH || "/usr/bin/ffmpeg";
const ROOT = path.join(__dirname, "..");

const DEFAULT_BEATS = [
  { id: "studio_hair_blue", t: 55, claim: "Character studio blue hair visible on preview" },
  { id: "district_city_ground", t: 113, claim: "City district ground + markers visible (no void)" },
  { id: "duel_3d_chain", t: 374, claim: "3D duel HUD (not 2D Chain duel modal)" },
  { id: "magic_cast_duel", t: 390, claim: "Magic orb/light in 3D duel" },
  { id: "onboarding_objective", t: 530, claim: "Quest marker during onboarding" },
  { id: "ch1_climax_pulse", t: 748, claim: "Life Ch1 climax ring + MIDNIGHT PULSE" },
  { id: "ch1_complete", t: 764, claim: "Chapter complete after climax" }
];

function extractOne(videoPath, tSec, outPath) {
  const r = spawnSync(
    FFMPEG,
    ["-y", "-hide_banner", "-loglevel", "error", "-ss", String(Math.max(0, tSec)), "-i", videoPath, "-frames:v", "1", outPath],
    { encoding: "utf8" }
  );
  return r.status === 0 && fs.existsSync(outPath);
}

function main() {
  const video = process.argv[2];
  const outDir = process.argv[3] || path.join(process.env.OUT || "/opt/cursor/artifacts/ice-ch1-footage", "beat-frames");
  if (!video || !fs.existsSync(video)) {
    console.error("usage: node extract-video-beat-frames.js <video.mp4|webm> [outDir]");
    process.exit(1);
  }
  fs.mkdirSync(outDir, { recursive: true });
  const manifest = { video, beats: [], extractedAt: new Date().toISOString() };
  for (const b of DEFAULT_BEATS) {
    const out = path.join(outDir, `beat-${b.id}-t${String(Math.round(b.t)).padStart(4, "0")}.png`);
    const ok = extractOne(video, b.t, out);
    manifest.beats.push({ ...b, out, ok });
  }
  const manifestPath = path.join(outDir, "BEAT_FRAMES_MANIFEST.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  const failed = manifest.beats.filter(x => !x.ok).length;
  console.log("beat-frames:", outDir, "ok:", manifest.beats.length - failed, "fail:", failed);
  process.exit(failed ? 1 : 0);
}

if (require.main === module) main();

module.exports = { DEFAULT_BEATS, extractOne };