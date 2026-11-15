#!/usr/bin/env node
/**
 * Sample video every N seconds; fail if any near-black streak exceeds threshold.
 * Usage: node scripts/video-luminance-scan.js <video.webm|mp4> [outDir]
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const video = process.argv[2];
const outDir = process.argv[3] || path.join(path.dirname(video || "."), "luminance-scan");
const intervalSec = Number(process.env.VIDEO_LUMINANCE_INTERVAL_SEC || 5);
const nearBlack = Number(process.env.VIDEO_LUMINANCE_NEAR_BLACK || 14);
const maxStreakSec = Number(process.env.VIDEO_LUMINANCE_MAX_STREAK_SEC || 3);
const sampleEvery = Math.max(1, intervalSec);

if (!video || !fs.existsSync(video)) {
  console.error("usage: node scripts/video-luminance-scan.js <video> [outDir]");
  process.exit(2);
}

function ffprobeDuration(file) {
  const r = spawnSync(
    "ffprobe",
    ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file],
    { encoding: "utf8" }
  );
  const n = parseFloat(String(r.stdout || "").trim());
  return Number.isFinite(n) ? n : 0;
}

async function meanLuma(pngPath) {
  const { data } = await sharp(pngPath).greyscale().raw().toBuffer({ resolveWithObject: true });
  if (!data.length) return 0;
  let sum = 0;
  for (let i = 0; i < data.length; i++) sum += data[i];
  return sum / data.length;
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const duration = ffprobeDuration(video);
  const fps = 1 / sampleEvery;
  const pattern = path.join(outDir, "frame-%04d.png");
  const ex = spawnSync(
    "ffmpeg",
    ["-y", "-i", video, "-vf", `fps=${fps}`, "-frames:v", String(Math.ceil(duration * fps) + 2), pattern],
    { encoding: "utf8" }
  );
  if (ex.status !== 0) {
    console.error(ex.stderr || ex.stdout);
    process.exit(2);
  }
  const frames = fs
    .readdirSync(outDir)
    .filter(f => /^frame-\d+\.png$/i.test(f))
    .sort();
  const samples = [];
  for (let i = 0; i < frames.length; i++) {
    const tSec = i * sampleEvery;
    const luma = await meanLuma(path.join(outDir, frames[i]));
    samples.push({ tSec, luma, nearBlack: luma < nearBlack });
  }
  let streak = 0;
  let worst = { streakSec: 0, startSec: 0, endSec: 0 };
  let runStart = 0;
  for (const s of samples) {
    if (s.nearBlack) {
      if (streak === 0) runStart = s.tSec;
      streak += sampleEvery;
      if (streak > worst.streakSec) {
        worst = { streakSec: streak, startSec: runStart, endSec: s.tSec + sampleEvery };
      }
    } else streak = 0;
  }
  const manifest = {
    video: path.basename(video),
    durationSec: +duration.toFixed(2),
    intervalSec: sampleEvery,
    nearBlackThreshold: nearBlack,
    maxStreakSecAllowed: maxStreakSec,
    sampleCount: samples.length,
    worstNearBlackStreak: worst,
    ok: worst.streakSec <= maxStreakSec,
    samples
  };
  fs.writeFileSync(path.join(outDir, "LUMINANCE_SCAN.json"), JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify({ ok: manifest.ok, worst: manifest.worstNearBlackStreak }, null, 2));
  process.exit(manifest.ok ? 0 : 1);
}

main().catch(e => {
  console.error(e);
  process.exit(2);
});