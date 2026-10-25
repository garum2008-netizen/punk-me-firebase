#!/usr/bin/env node
/** Build 1080p H.264/AAC mp4 < 95MB for qa-media/episode1 branch. */
const fs = require("fs");
const path = require("path");
const { spawnSync, execSync } = require("child_process");
const { probeDuration } = require("./validate-episode1-recording");

const videoIn = process.argv[2] || path.join(__dirname, "../qa/episode1/episode1-youtube-video.webm");
const audioIn = process.argv[3] || path.join(__dirname, "../qa/episode1/episode1-youtube-audio-norm.m4a");
const outMp4 = process.argv[4] || path.join(__dirname, "../qa/episode1/episode1-youtube-1080p.mp4");

const vDur = probeDuration(videoIn);
const args = [
  "-y",
  "-i",
  videoIn,
  "-i",
  audioIn,
  "-map",
  "0:v:0",
  "-map",
  "1:a:0",
  "-vf",
  "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2",
  "-c:v",
  "libx264",
  "-preset",
  "slow",
  "-crf",
  "27",
  "-maxrate",
  "9000k",
  "-bufsize",
  "12000k",
  "-c:a",
  "aac",
  "-b:a",
  "128k",
  "-movflags",
  "+faststart",
  "-t",
  String(vDur),
  outMp4
];
let r = spawnSync("ffmpeg", args, { encoding: "utf8" });
if (r.status !== 0) throw new Error(r.stderr || r.stdout);

let size = fs.statSync(outMp4).size;
const maxBytes = 95 * 1024 * 1024;
let crf = 27;
while (size > maxBytes && crf < 34) {
  crf += 1;
  const retry = [
    "-y",
    "-i",
    videoIn,
    "-i",
    audioIn,
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-vf",
    "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2",
    "-c:v",
    "libx264",
    "-preset",
    "slow",
    "-crf",
    String(crf),
    "-c:a",
    "aac",
    "-b:a",
    "112k",
    "-movflags",
    "+faststart",
    "-t",
    String(vDur),
    outMp4
  ];
  r = spawnSync("ffmpeg", retry, { encoding: "utf8" });
  if (r.status !== 0) throw new Error(r.stderr || r.stdout);
  size = fs.statSync(outMp4).size;
}

const sha = execSync(`sha256sum "${outMp4}"`, { encoding: "utf8" }).trim().split(/\s+/)[0];
const dur = probeDuration(outMp4);
const res = execSync(
  `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0:s=x "${outMp4}"`,
  { encoding: "utf8" }
).trim();
console.log(JSON.stringify({ outMp4, durationSec: dur, resolution: res, bytes: size, sha256: sha, crf }, null, 2));
