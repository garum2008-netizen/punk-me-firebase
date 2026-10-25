#!/usr/bin/env node
const { probeDuration } = require("./validate-episode1-recording");
const path = require("path");
const mp4 = process.argv[2] || path.join(__dirname, "../qa/pr-b-full/punk-me-ep-full-1080p.mp4");
const d = probeDuration(mp4);
const ok = d >= 900 && d <= 1320;
console.log(JSON.stringify({ duration_sec: d, ok, target: "900-1320" }, null, 2));
process.exit(ok ? 0 : 1);
