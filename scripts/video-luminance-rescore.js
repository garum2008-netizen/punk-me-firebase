#!/usr/bin/env node
/** Re-apply modal-aware gate on existing luminance-scan frames (no ffmpeg). */
const fs = require("fs");
const path = require("path");
const { buildModalIntervals, modalAtTime } = require("./luminance-modal-mask");

const lumDir = process.argv[2];
const timelinePath = process.argv[3];
const videoPath = process.argv[4] || "";

if (!lumDir || !fs.existsSync(path.join(lumDir, "LUMINANCE_SCAN.json"))) {
  console.error("usage: node video-luminance-rescore.js <luminance-scan-dir> <timeline.json> [video.mp4]");
  process.exit(2);
}

const maxStreakSec = Number(process.env.VIDEO_LUMINANCE_MAX_STREAK_SEC || 3);
const manifest = JSON.parse(fs.readFileSync(path.join(lumDir, "LUMINANCE_SCAN.json"), "utf8"));
let timeline = null;
if (timelinePath && fs.existsSync(timelinePath)) {
  timeline = JSON.parse(fs.readFileSync(timelinePath, "utf8"));
}
const intervals = buildModalIntervals(timeline, videoPath || manifest.video);
let ignoreBeforeSec = manifest.ignoreBeforeSec ?? 0;
if (timeline?.gameplayAlignedRecording) {
  const boot = Number(timeline.gameplayIgnoreBeforeSec);
  const ob = timeline.scenes?.find(s => s.id === "onboarding_start")?.tSec;
  const step4 = timeline.scenes?.find(s => s.id === "onboarding_step_4")?.tSec;
  ignoreBeforeSec = Math.ceil(Math.max(boot || 0, Number(ob || 0) + 18, Number(step4 || 0)));
  manifest.ignoreBeforeSec = ignoreBeforeSec;
}

let streak = 0;
let worst = { streakSec: 0, startSec: 0, endSec: 0 };
let runStart = 0;
let modalSampleCount = 0;

for (const s of manifest.samples) {
  const modalKind = modalAtTime(s.tSec, intervals, 0.5);
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
    streak += manifest.intervalSec || 5;
    if (streak > worst.streakSec) {
      worst = { streakSec: streak, startSec: runStart, endSec: s.tSec + (manifest.intervalSec || 5) };
    }
  } else streak = 0;
}

manifest.modalIntervals = intervals;
manifest.modalExclusion = {
  enabled: true,
  modalSampleCount,
  intervalCount: intervals.length,
};
manifest.worstNearBlackStreak = worst;
manifest.worstNearBlackStreakExModals = worst;
const studioOk = manifest.studioAssert?.ok !== false;
manifest.ok = worst.streakSec <= maxStreakSec && studioOk;
fs.writeFileSync(path.join(lumDir, "LUMINANCE_SCAN.json"), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ ok: manifest.ok, worst, modalSamples: modalSampleCount, intervals: intervals.length }, null, 2));
process.exit(manifest.ok ? 0 : 1);