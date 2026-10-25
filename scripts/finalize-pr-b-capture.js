#!/usr/bin/env node
/** Finalize raw Playwright + Web Audio capture into punk-me-ep-full-1080p.mp4 */
const fs = require("fs");
const path = require("path");
const { spawnSync, execSync } = require("child_process");
const { probeDuration } = require("./validate-episode1-recording");
const { validatePrBRecording } = require("./validate-pr-b-recording");
const { muxVideoWithAudio, normalizeAudioLufs } = require("./episode1-audio-mux");
const audioIngest = require("./episode1-audio-ingest");

const outDir = path.join(__dirname, "../qa/pr-b-full");
const videoRaw = path.join(outDir, "video-raw.webm");
const audioRaw = path.join(outDir, "pr-b-audio-raw.webm");
const marksPath = path.join(outDir, "marks.jsonl");

function loadMarks() {
  if (!fs.existsSync(marksPath)) return [];
  return fs
    .readFileSync(marksPath, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map(l => JSON.parse(l));
}

function fmt(sec) {
  const m = Math.floor(sec / 60);
  const r = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

function writeTimecodes(mp4, duration, trimOffset, marks) {
  const lines = [
    "# PUNK ME — full PR B playthrough (Episode 1 + building layer)",
    "",
    `**File:** \`qa/pr-b-full/punk-me-ep-full-1080p.mp4\``,
    `**Duration:** ${fmt(duration)} (${duration.toFixed(1)}s)`,
    `**Trim:** ${trimOffset.toFixed(2)}s removed from raw capture (post start_game)`,
    "",
    "| Time | Event | Notes |",
    "| --- | --- | --- |"
  ];
  marks.forEach(m => {
    const t = Math.max(0, m.sec - trimOffset);
    lines.push(`| ${fmt(t)} | ${m.label} | ${m.extra || ""} |`);
  });
  fs.writeFileSync(path.join(outDir, "TIMECODES.md"), lines.join("\n") + "\n");
}

function main() {
  if (!fs.existsSync(videoRaw)) throw new Error("missing video-raw.webm");
  const marks = loadMarks();
  const startGame = marks.find(m => m.label === "start_game");
  const trimSec = startGame ? Math.max(0, startGame.sec - 0.15) : 0.8;
  const videoTrim = path.join(outDir, "video-trim.mp4");
  execSync(
    `ffmpeg -y -ss ${trimSec} -i "${videoRaw}" -c:v libx264 -preset fast -crf 22 -pix_fmt yuv420p -an "${videoTrim}"`,
    { stdio: "inherit" }
  );
  const audioNorm = path.join(outDir, "audio-norm.m4a");
  const audioTrim = path.join(outDir, "audio-trim-out.m4a");
  if (fs.existsSync(audioRaw) && fs.statSync(audioRaw).size > 8000) {
    normalizeAudioLufs(audioRaw, audioNorm);
    execSync(`ffmpeg -y -ss ${trimSec} -i "${audioNorm}" -c:a aac -b:a 192k "${audioTrim}"`, { stdio: "inherit" });
  }
  const mp4 = path.join(outDir, "punk-me-ep-full-1080p.mp4");
  if (fs.existsSync(audioTrim)) {
    muxVideoWithAudio(videoTrim, audioTrim, mp4, { videoCodec: "copy", audioCodec: "aac" });
  } else {
    execSync(`ffmpeg -y -i "${videoTrim}" -c:v copy -an "${mp4}"`, { stdio: "inherit" });
  }
  const duration = probeDuration(mp4);
  writeTimecodes(mp4, duration, trimSec, marks);
  validatePrBRecording(mp4, outDir);
  console.log("OK", mp4, duration);
}

main();
