#!/usr/bin/env node
/** Re-run ffmpeg finalize when *-raw.webm already exists (e.g. after audio bridge fix). */
const fs = require("fs");
const path = require("path");
const { finalizeClipDir } = require("./finalize-content-clip");

const root = path.join(__dirname, "../qa/content");
const dirs = fs.readdirSync(root).filter(d => {
  const p = path.join(root, d);
  return fs.statSync(p).isDirectory() && fs.existsSync(path.join(p, "mix-raw.webm"));
});

for (const d of dirs) {
  const dir = path.join(root, d);
  const hasVert = fs.existsSync(path.join(dir, "gameplay-1080x1920-silent.mp4"));
  const base = hasVert ? "gameplay-1080x1920" : fs.existsSync(path.join(dir, "gameplay-1080p-en-silent.mp4")) ? "gameplay-1080p-en" : "gameplay-1080p";
  try {
    const r = finalizeClipDir(dir, { trimSec: 0, basename: base });
    console.log(d, r.duration.toFixed(1) + "s");
  } catch (e) {
    console.error(d, e.message);
  }
}
