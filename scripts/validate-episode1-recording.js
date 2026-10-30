#!/usr/bin/env node
/**
 * Post-record QA: duration vs timecodes, per-mark frames, freeze detection, contact sheet.
 */
const fs = require("fs");
const path = require("path");
const { execSync, spawnSync } = require("child_process");
const crypto = require("crypto");

function probeDuration(filePath) {
  const out = execSync(
    `ffprobe -v error -show_entries format=duration -of csv=p=0 "${filePath}"`,
    { encoding: "utf8" }
  ).trim();
  const n = parseFloat(out);
  if (!Number.isFinite(n)) throw new Error(`ffprobe duration failed for ${filePath}: ${out}`);
  return n;
}

function fileMd5(filePath) {
  return crypto.createHash("md5").update(fs.readFileSync(filePath)).digest("hex");
}

function extractFrame(videoPath, sec, outPng) {
  fs.mkdirSync(path.dirname(outPng), { recursive: true });
  const r = spawnSync(
    "ffmpeg",
    ["-y", "-ss", String(Math.max(0, sec)), "-i", videoPath, "-frames:v", "1", "-q:v", "2", outPng],
    { encoding: "utf8" }
  );
  if (r.status !== 0 || !fs.existsSync(outPng)) {
    throw new Error(`ffmpeg frame extract failed at ${sec}s: ${r.stderr || r.stdout}`);
  }
}

function buildContactSheet(framePaths, outPng) {
  if (!framePaths.length) return;
  const cols = Math.min(4, framePaths.length);
  const rows = Math.ceil(framePaths.length / cols);
  const args = ["-y"];
  framePaths.forEach(p => args.push("-i", p));
  args.push(
    "-filter_complex",
    `${framePaths.map((_, i) => `[${i}:v]`).join("")}xstack=inputs=${framePaths.length}:layout=${layoutGrid(
      framePaths.length,
      cols
    )}[v]`,
    "-map",
    "[v]",
    outPng
  );
  // xstack layout is verbose; use tile instead
  const tileArgs = ["-y", ...framePaths.flatMap(p => ["-i", p]), "-filter_complex", `tile=${cols}x${rows}`, outPng];
  const r = spawnSync("ffmpeg", tileArgs, { encoding: "utf8" });
  if (r.status !== 0) throw new Error(`contact sheet failed: ${r.stderr || r.stdout}`);
}

function layoutGrid() {
  return "";
}

function measureWindowMeanDb(mediaPath, startSec, windowSec) {
  const r = spawnSync(
    "ffmpeg",
    [
      "-hide_banner",
      "-ss",
      String(Math.max(0, startSec)),
      "-t",
      String(windowSec),
      "-i",
      mediaPath,
      "-af",
      "volumedetect",
      "-f",
      "null",
      "-"
    ],
    { encoding: "utf8" }
  );
  const blob = `${r.stdout || ""}\n${r.stderr || ""}`;
  const m = blob.match(/mean_volume:\s*([-\d.]+)\s*dB/);
  return m ? parseFloat(m[1]) : -99;
}

function validateAudioWindows(mediaPath, marks, durationSec) {
  const startMark = marks.find(m => m.label === "start_game");
  const startSec = startMark ? Number(startMark.sec) : 0;
  const windows = [];
  const errors = [];
  for (let t = Math.floor(startSec); t + 30 <= durationSec; t += 30) {
    const mean = measureWindowMeanDb(mediaPath, t, 30);
    windows.push({ startSec: t, windowSec: 30, meanVolumeDb: mean });
    if (mean <= -40) errors.push(`audio@${t}s mean_volume=${mean}dB (need > -40)`);
  }
  return { windows, errors };
}

/**
 * @param {string} videoPath
 * @param {{ sec: number, label: string }[]} marks
 * @param {string} qaDir - usually qa/episode1
 */
function validateEpisode1Recording(videoPath, marks, qaDir) {
  const duration = probeDuration(videoPath);
  const lastMark = marks.reduce((m, x) => Math.max(m, Number(x.sec) || 0), 0);
  const errors = [];
  if (duration + 0.5 < lastMark) {
    errors.push(`duration ${duration.toFixed(3)}s < last timecode ${lastMark.toFixed(1)}s`);
  }

  const framesDir = path.join(qaDir, "frames");
  fs.mkdirSync(framesDir, { recursive: true });
  const framePaths = [];
  const frameMeta = [];

  for (const m of marks) {
    let t = Number(m.sec);
    if (!Number.isFinite(t)) continue;
    if (t > duration - 0.2) t = Math.max(0, duration - 0.2);
    const safe = m.label.replace(/[^a-z0-9_-]+/gi, "_").slice(0, 48);
    const outPng = path.join(framesDir, `${String(Math.floor(t)).padStart(4, "0")}s_${safe}.png`);
    extractFrame(videoPath, t, outPng);
    framePaths.push(outPng);
    frameMeta.push({ label: m.label, sec: t, path: outPng });
  }

  for (let i = 1; i < framePaths.length; i++) {
    const dt = frameMeta[i].sec - frameMeta[i - 1].sec;
    if (dt < 2) continue;
    const a = fileMd5(framePaths[i - 1]);
    const b = fileMd5(framePaths[i]);
    if (a === b) {
      errors.push(
        `frozen/adjacent identical frames at ${frameMeta[i - 1].label} (${frameMeta[i - 1].sec}s) and ${frameMeta[i].label} (${frameMeta[i].sec}s)`
      );
    }
  }

  const contact = path.join(qaDir, "contact-sheet.png");
  if (framePaths.length) {
    const cols = Math.min(4, framePaths.length);
    const rows = Math.ceil(framePaths.length / cols);
    const r = spawnSync(
      "ffmpeg",
      ["-y", ...framePaths.flatMap(p => ["-i", p]), "-filter_complex", `tile=${cols}x${rows}`, contact],
      { encoding: "utf8" }
    );
    if (r.status !== 0) errors.push(`contact-sheet build failed: ${r.stderr || r.stdout}`);
  }

  const audioCheck = validateAudioWindows(videoPath, marks, duration);
  errors.push(...audioCheck.errors);

  const report = {
    videoPath,
    durationSec: duration,
    lastMarkSec: lastMark,
    frameCount: framePaths.length,
    contactSheet: contact,
    frames: frameMeta,
    audioWindows: audioCheck.windows,
    ok: errors.length === 0,
    errors
  };
  fs.writeFileSync(path.join(qaDir, "episode1-recording-validation.json"), JSON.stringify(report, null, 2));
  if (errors.length) {
    console.error("VALIDATION FAIL", errors.join("; "));
    process.exit(1);
  }
  console.log("VALIDATION OK", `duration=${duration.toFixed(3)}s`, `frames=${framePaths.length}`);
  return report;
}

module.exports = { validateEpisode1Recording, probeDuration };

if (require.main === module) {
  const video = process.argv[2];
  const metaPath = process.argv[3] || path.join(__dirname, "../qa/episode1/episode1-youtube-meta.json");
  if (!video) {
    console.error("usage: validate-episode1-recording.js <video> [meta.json]");
    process.exit(1);
  }
  const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
  validateEpisode1Recording(video, meta.marks || [], path.dirname(metaPath));
}
