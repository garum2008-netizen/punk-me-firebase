#!/usr/bin/env node
/** ffprobe, freezedetect, per-minute volumedetect, 6×6 contact sheet for PR B deliverable. */
const fs = require("fs");
const path = require("path");
const { execSync, spawnSync } = require("child_process");
const { probeDuration } = require("./validate-episode1-recording");

function run(cmd) {
  return execSync(cmd, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

function measureWindowMeanDb(mediaPath, startSec, windowSec) {
  const r = spawnSync(
    "ffmpeg",
    ["-hide_banner", "-ss", String(Math.max(0, startSec)), "-t", String(windowSec), "-i", mediaPath, "-af", "volumedetect", "-f", "null", "-"],
    { encoding: "utf8" }
  );
  const blob = `${r.stdout || ""}\n${r.stderr || ""}`;
  const m = blob.match(/mean_volume:\s*([-\d.]+)\s*dB/);
  return m ? parseFloat(m[1]) : -99;
}

function parseFreezes(stderr) {
  const freezes = [];
  let start = null;
  for (const line of stderr.split("\n")) {
    const s = line.match(/lavfi\.freezedetect\.freeze_start:\s*([\d.]+)/);
    const e = line.match(/lavfi\.freezedetect\.freeze_end:\s*([\d.]+)/);
    const d = line.match(/lavfi\.freezedetect\.freeze_duration:\s*([\d.]+)/);
    if (s) start = parseFloat(s[1]);
    if (e && start != null) {
      freezes.push({ start, end: parseFloat(e[1]), duration: d ? parseFloat(d[1]) : parseFloat(e[1]) - start });
      start = null;
    }
  }
  return freezes;
}

function buildContact6x6(videoPath, outJpg, duration) {
  const n = 36;
  const cols = 6;
  const rows = 6;
  const tmp = path.join(path.dirname(outJpg), "_contact_frames");
  fs.mkdirSync(tmp, { recursive: true });
  const frames = [];
  for (let i = 0; i < n; i++) {
    const t = (duration * (i + 0.5)) / n;
    const p = path.join(tmp, `f_${i}.png`);
    spawnSync("ffmpeg", ["-y", "-ss", String(t), "-i", videoPath, "-frames:v", "1", "-q:v", "3", p], { stdio: "ignore" });
    if (fs.existsSync(p)) frames.push(p);
  }
  if (frames.length < 4) throw new Error("contact frames missing");
  spawnSync("ffmpeg", ["-y", ...frames.flatMap(p => ["-i", p]), "-filter_complex", `tile=${cols}x${rows}`, outJpg], {
    stdio: "ignore"
  });
  return frames.length;
}

function validatePrBRecording(videoPath, qaDir) {
  const errors = [];
  const lines = [];
  lines.push(`# PR B recording validation`);
  lines.push(`video: ${videoPath}`);
  lines.push("");

  const ffprobeOut = run(
    `ffprobe -v error -show_entries format=duration:stream=codec_type,codec_name,width,height,r_frame_rate -of default=noprint_wrappers=1 "${videoPath}"`
  );
  lines.push("## ffprobe");
  lines.push("```");
  lines.push(ffprobeOut.trim());
  lines.push("```");
  const duration = probeDuration(videoPath);
  lines.push(`duration_sec=${duration.toFixed(3)}`);
  lines.push("");

  const hasAudio = /codec_type=audio/.test(ffprobeOut);
  if (!hasAudio) errors.push("no audio stream");

  lines.push("## freezedetect (n=0.003, d=5)");
  const fr = spawnSync(
    "ffmpeg",
    ["-hide_banner", "-i", videoPath, "-vf", "freezedetect=n=0.003:d=5", "-map", "0:v:0", "-f", "null", "-"],
    { encoding: "utf8" }
  );
  const freezeLog = fr.stderr || "";
  lines.push("```");
  lines.push(freezeLog.trim());
  lines.push("```");
  const freezes = parseFreezes(freezeLog);
  for (const f of freezes) {
    if (f.duration > 8) errors.push(`freeze ${f.duration.toFixed(1)}s at ${f.start.toFixed(1)}–${f.end.toFixed(1)}s (>8s)`);
  }
  lines.push("");

  lines.push("## volumedetect (60s windows)");
  lines.push("| start_s | mean_volume_dB |");
  lines.push("| --- | --- |");
  for (let t = 0; t + 60 <= duration + 0.01; t += 60) {
    const mean = measureWindowMeanDb(videoPath, t, Math.min(60, duration - t));
    lines.push(`| ${t} | ${mean} |`);
    if (mean <= -45) errors.push(`audio quiet at ${t}s: ${mean} dB`);
  }
  lines.push("");

  const contact = path.join(qaDir, "contact-sheet-6x6.jpg");
  const nFrames = buildContact6x6(videoPath, contact, duration);
  lines.push(`## contact sheet 6×6 (${nFrames} frames) → ${contact}`);
  lines.push("");

  const report = { ok: errors.length === 0, errors, duration, hasAudio, freezes, contact };
  const outPath = path.join(qaDir, "VALIDATION-REPORT.md");
  lines.push(report.ok ? "**PASS**" : `**FAIL**: ${errors.join("; ")}`);
  fs.writeFileSync(outPath, lines.join("\n"));
  console.log(lines.join("\n"));
  if (!report.ok) process.exit(1);
  return report;
}

module.exports = { validatePrBRecording };

if (require.main === module) {
  const video = process.argv[2] || path.join(__dirname, "../qa/pr-b-full/punk-me-ep-full-1080p.mp4");
  const qaDir = path.dirname(video);
  validatePrBRecording(video, qaDir);
}
