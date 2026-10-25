#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { probeDuration } = require("./validate-episode1-recording");
const { muxVideoWithAudio } = require("./episode1-audio-mux");

function webmToWav(webmPath, wavPath, trimSec = 0) {
  if (!fs.existsSync(webmPath) || fs.statSync(webmPath).size < 800) return false;
  const args = ["-y", "-i", webmPath];
  if (trimSec > 0.05) {
    args.push("-af", `atrim=start=${trimSec.toFixed(3)}`);
  }
  args.push("-ac", "2", "-ar", "48000", wavPath);
  const r = spawnSync("ffmpeg", args, { encoding: "utf8" });
  return r.status === 0 && fs.existsSync(wavPath);
}

function trimVideoSilent(webmIn, mp4Out, trimSec) {
  const ss = Math.max(0, trimSec);
  const r = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-ss",
      String(ss),
      "-i",
      webmIn,
      "-c:v",
      "libx264",
      "-preset",
      "fast",
      "-crf",
      "22",
      "-pix_fmt",
      "yuv420p",
      "-an",
      mp4Out
    ],
    { encoding: "utf8" }
  );
  return r.status === 0 && fs.existsSync(mp4Out);
}

/**
 * @param {string} clipDir folder with capture-raw/*.webm and *-raw.webm audio
 * @param {{ trimSec?: number, basename?: string }} opts
 */
function finalizeClipDir(clipDir, opts = {}) {
  const trimSec = opts.trimSec ?? 0;
  const base = opts.basename || "gameplay-1080p";
  const rawDir = path.join(clipDir, "capture-raw");
  const webm = fs
    .readdirSync(rawDir)
    .filter(f => f.endsWith(".webm"))
    .map(f => ({ f, m: fs.statSync(path.join(rawDir, f)).mtimeMs }))
    .sort((a, b) => b.m - a.m)[0]?.f;
  if (!webm) throw new Error(`no video in ${rawDir}`);
  const videoIn = path.join(rawDir, webm);
  const silentMp4 = path.join(clipDir, `${base}-silent.mp4`);
  trimVideoSilent(videoIn, silentMp4, trimSec);
  const duration = probeDuration(silentMp4);

  for (const track of ["music", "sfx", "voice", "mix"]) {
    const raw = path.join(clipDir, `${track}-raw.webm`);
    webmToWav(raw, path.join(clipDir, `${track}.wav`), trimSec);
  }

  const mixWav = path.join(clipDir, "mix.wav");
  const mixMp4 = path.join(clipDir, `${base}-mix.mp4`);
  if (fs.existsSync(mixWav) && fs.statSync(mixWav).size > 800) {
    muxVideoWithAudio(silentMp4, mixWav, mixMp4, { videoCodec: "libx264", audioCodec: "aac" });
  }

  return { duration, silentMp4, mixMp4 };
}

if (require.main === module) {
  const dir = process.argv[2];
  const trim = Number(process.argv[3] || 0);
  const base = process.argv[4] || "gameplay-1080p";
  if (!dir) {
    console.error("usage: finalize-content-clip.js <clipDir> [trimSec] [basename]");
    process.exit(1);
  }
  console.log(JSON.stringify(finalizeClipDir(dir, { trimSec: trim, basename: base }), null, 2));
}

module.exports = { finalizeClipDir, webmToWav, trimVideoSilent };
