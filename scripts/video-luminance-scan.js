#!/usr/bin/env node
/**
 * Sample video every N seconds; measure luminance on the 3D canvas crop only (not HUD chrome).
 * Usage: node scripts/video-luminance-scan.js <video.webm|mp4> [outDir]
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { buildModalIntervals, modalAtTime } = require("./luminance-modal-mask");

const video = process.argv[2];
const outDir = process.argv[3] || path.join(path.dirname(video || "."), "luminance-scan");
const timelinePath = process.argv[4] || process.env.RECORDING_TIMELINE_JSON || "";
const intervalSec = Number(process.env.VIDEO_LUMINANCE_INTERVAL_SEC || 5);
const nearBlackCanvas = Number(process.env.VIDEO_LUMINANCE_CANVAS_NEAR_BLACK || 48);
const nearBlackFull = Number(process.env.VIDEO_LUMINANCE_NEAR_BLACK || 14);
const maxStreakSec = Number(process.env.VIDEO_LUMINANCE_MAX_STREAK_SEC || 3);
const sampleEvery = Math.max(1, intervalSec);
const mode = process.env.VIDEO_LUMINANCE_MODE || "canvas";
let ignoreBeforeSec = Number(process.env.VIDEO_LUMINANCE_IGNORE_BEFORE_SEC || 70);

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

function canvasCropRect(w, h) {
  const top = Math.round(h * 0.11);
  const height = Math.round(h * 0.64);
  const left = Math.round(w * 0.05);
  const width = Math.round(w * 0.9);
  return { left, top, width, height: Math.min(height, h - top) };
}

async function meanLumaFull(pngPath) {
  const { data } = await sharp(pngPath).greyscale().raw().toBuffer({ resolveWithObject: true });
  if (!data.length) return 0;
  let sum = 0;
  for (let i = 0; i < data.length; i++) sum += data[i];
  return sum / data.length;
}

async function meanLumaCanvas(pngPath) {
  const meta = await sharp(pngPath).metadata();
  const w = meta.width || 1280;
  const h = meta.height || 720;
  const crop = canvasCropRect(w, h);
  const canvasDir = path.join(outDir, "canvas-crops");
  fs.mkdirSync(canvasDir, { recursive: true });
  const base = path.basename(pngPath);
  const cropPath = path.join(canvasDir, base.replace("frame-", "canvas-"));
  const { data } = await sharp(pngPath)
    .extract(crop)
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });
  await sharp(pngPath).extract(crop).png().toFile(cropPath);
  if (!data.length) return 0;
  let sum = 0;
  for (let i = 0; i < data.length; i++) sum += data[i];
  return sum / data.length;
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  let timeline = null;
  if (timelinePath && fs.existsSync(timelinePath)) {
    try {
      timeline = JSON.parse(fs.readFileSync(timelinePath, "utf8"));
    } catch (_) {}
  }
  const studioMaxWallMs = Number(timeline?.studioMaxWallMs || process.env.STUDIO_MAX_WALL_MS || 70000);
  const studioWallMs = timeline?.studioWallMs != null ? Number(timeline.studioWallMs) : null;
  const studioAssertOk = studioWallMs == null ? true : studioWallMs <= studioMaxWallMs;
  if (timeline?.gameplayAlignedRecording) {
    const boot = Number(timeline.gameplayIgnoreBeforeSec);
  const ob = Array.isArray(timeline.scenes)
      ? timeline.scenes.find(s => s.id === "onboarding_start")?.tSec
      : null;
    const step4 = Array.isArray(timeline.scenes)
      ? timeline.scenes.find(s => s.id === "onboarding_step_4")?.tSec
      : null;
    const bootEnd = Math.max(boot || 0, Number(ob || 0) + 18, Number(step4 || 0));
    ignoreBeforeSec = Math.ceil(bootEnd);
  }
  const duration = ffprobeDuration(video);
  const fps = 1 / sampleEvery;
  const pattern = path.join(outDir, "frame-%04d.png");
  let frames = fs
    .readdirSync(outDir)
    .filter(f => /^frame-\d+\.png$/i.test(f))
    .sort();
  const rescoreOnly = process.env.LUMINANCE_RESCORE_ONLY === "1";
  if (!frames.length || !rescoreOnly) {
    const ex = spawnSync(
      "ffmpeg",
      ["-y", "-i", video, "-vf", `fps=${fps}`, "-frames:v", String(Math.ceil(duration * fps) + 2), pattern],
      { encoding: "utf8" }
    );
    if (ex.status !== 0) {
      console.error(ex.stderr || ex.stdout);
      process.exit(2);
    }
    frames = fs
      .readdirSync(outDir)
      .filter(f => /^frame-\d+\.png$/i.test(f))
      .sort();
  }
  const samples = [];
  for (let i = 0; i < frames.length; i++) {
    const tSec = i * sampleEvery;
    const fp = path.join(outDir, frames[i]);
    const lumaFull = await meanLumaFull(fp);
    const lumaCanvas = await meanLumaCanvas(fp);
    const gateLuma = mode === "full" ? lumaFull : lumaCanvas;
    const threshold = mode === "full" ? nearBlackFull : nearBlackCanvas;
    samples.push({
      tSec,
      lumaFull: +lumaFull.toFixed(2),
      lumaCanvas: +lumaCanvas.toFixed(2),
      nearBlack: gateLuma < threshold,
      luma: +gateLuma.toFixed(2)
    });
  }
  const modalIntervals = buildModalIntervals(timeline, video);
  let streak = 0;
  let worst = { streakSec: 0, startSec: 0, endSec: 0 };
  let runStart = 0;
  let modalSampleCount = 0;
  for (const s of samples) {
    const modalKind = modalAtTime(s.tSec, modalIntervals, 0.5);
    s.modalExclude = modalKind;
    s.gateClass = modalKind
      ? modalKind === "sessionReload"
        ? "reload"
        : "modal"
      : s.nearBlack
        ? "nearBlack"
        : "ok";
    if (modalKind) {
      modalSampleCount += 1;
      streak = 0;
      continue;
    }
    if (s.tSec < ignoreBeforeSec) continue;
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
    mode,
    nearBlackThreshold: mode === "full" ? nearBlackFull : nearBlackCanvas,
    ignoreBeforeSec,
    studioAssert: {
      gameplayAlignedRecording: !!timeline?.gameplayAlignedRecording,
      studioWallMs,
      studioMaxWallMs,
      ok: studioAssertOk,
    },
    maxStreakSecAllowed: maxStreakSec,
    sampleCount: samples.length,
    worstNearBlackStreak: worst,
    worstNearBlackStreakExModals: worst,
    modalIntervals,
    modalExclusion: {
      enabled: true,
      modalSampleCount,
      intervalCount: modalIntervals.length,
    },
    ok: worst.streakSec <= maxStreakSec && studioAssertOk,
    samples,
    renderDiagSamples: timeline?.renderDiagSamples || [],
  };
  fs.writeFileSync(path.join(outDir, "LUMINANCE_SCAN.json"), JSON.stringify(manifest, null, 2));
  console.log(JSON.stringify({ ok: manifest.ok, mode, worst: manifest.worstNearBlackStreak }, null, 2));
  process.exit(manifest.ok ? 0 : 1);
}

main().catch(e => {
  console.error(e);
  process.exit(2);
});