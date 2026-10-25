#!/usr/bin/env node
/** Ingest full MediaRecorder segments (valid webm per stop); concat at finalize. */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

let server = null;
let segmentsDir = null;
let outPath = null;
let segmentIndex = 0;

function start(destFile) {
  outPath = destFile;
  segmentsDir = path.join(path.dirname(destFile), "episode1-audio-segments");
  fs.mkdirSync(segmentsDir, { recursive: true });
  fs.readdirSync(segmentsDir).forEach(f => {
    try {
      fs.unlinkSync(path.join(segmentsDir, f));
    } catch (e) {}
  });
  segmentIndex = 0;
  const port = Number(process.env.EP1_AUDIO_PORT || 9876);
  if (server) return Promise.resolve(port);
  server = http.createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }
    if (req.method === "POST" && (req.url === "/segment" || req.url === "/chunk")) {
      const chunks = [];
      req.on("data", c => chunks.push(c));
      req.on("end", () => {
        const body = Buffer.concat(chunks);
        if (body.length > 256) {
          const name = `segment-${String(segmentIndex++).padStart(3, "0")}.webm`;
          fs.writeFileSync(path.join(segmentsDir, name), body);
        }
        res.writeHead(204);
        res.end();
      });
      return;
    }
    res.writeHead(404);
    res.end();
  });
  return new Promise(resolve => {
    server.listen(port, "127.0.0.1", () => resolve(port));
  });
}

function finalizeConcat() {
  const files = fs
    .readdirSync(segmentsDir)
    .filter(f => f.startsWith("segment-") && f.endsWith(".webm"))
    .sort()
    .filter(f => fs.statSync(path.join(segmentsDir, f)).size > 256);
  if (!files.length) return false;
  if (files.length === 1) {
    fs.copyFileSync(path.join(segmentsDir, files[0]), outPath);
    return fs.existsSync(outPath);
  }
  const listPath = path.join(segmentsDir, "concat.txt");
  fs.writeFileSync(
    listPath,
    files.map(f => `file '${path.join(segmentsDir, f).replace(/'/g, "'\\''")}'`).join("\n")
  );
  let r = spawnSync(
    "ffmpeg",
    ["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", outPath],
    { encoding: "utf8" }
  );
  if (r.status !== 0 || !fs.existsSync(outPath)) {
    r = spawnSync(
      "ffmpeg",
      ["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c:a", "libopus", outPath],
      { encoding: "utf8" }
    );
  }
  return r.status === 0 && fs.existsSync(outPath);
}

function stop() {
  if (server) {
    server.close();
    server = null;
  }
}

function getOutPath() {
  return outPath;
}

module.exports = { start, stop, getOutPath, finalizeConcat };
