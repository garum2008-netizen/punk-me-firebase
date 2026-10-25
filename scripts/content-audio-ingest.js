#!/usr/bin/env node
/** Multi-track Web Audio ingest for qa/content clips (mix, music, sfx). */
const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const TRACKS = ["mix", "music", "sfx"];
let server = null;
let segmentsDir = null;
let outPaths = null;
let segmentIndex = { mix: 0, music: 0, sfx: 0 };

function start(destDir) {
  segmentsDir = path.join(destDir, "audio-segments");
  fs.mkdirSync(segmentsDir, { recursive: true });
  for (const t of TRACKS) {
    const sub = path.join(segmentsDir, t);
    fs.mkdirSync(sub, { recursive: true });
    fs.readdirSync(sub).forEach(f => {
      try {
        fs.unlinkSync(path.join(sub, f));
      } catch (e) {}
    });
  }
  segmentIndex = { mix: 0, music: 0, sfx: 0 };
  outPaths = {
    mix: path.join(destDir, "mix-raw.webm"),
    music: path.join(destDir, "music-raw.webm"),
    sfx: path.join(destDir, "sfx-raw.webm")
  };
  const port = Number(process.env.CONTENT_AUDIO_PORT || 9877);
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
    const m = /^\/segment\/(mix|music|sfx)$/.exec(req.url || "");
    if (req.method === "POST" && m) {
      const track = m[1];
      const chunks = [];
      req.on("data", c => chunks.push(c));
      req.on("end", () => {
        const body = Buffer.concat(chunks);
        if (body.length > 256) {
          const name = `segment-${String(segmentIndex[track]++).padStart(3, "0")}.webm`;
          fs.writeFileSync(path.join(segmentsDir, track, name), body);
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

function concatTrack(track) {
  const sub = path.join(segmentsDir, track);
  const files = fs
    .readdirSync(sub)
    .filter(f => f.startsWith("segment-") && f.endsWith(".webm"))
    .sort()
    .filter(f => fs.statSync(path.join(sub, f)).size > 256);
  const out = outPaths[track];
  if (!files.length) return false;
  if (files.length === 1) {
    fs.copyFileSync(path.join(sub, files[0]), out);
    return fs.existsSync(out);
  }
  const listPath = path.join(sub, "concat.txt");
  fs.writeFileSync(
    listPath,
    files.map(f => `file '${path.join(sub, f).replace(/'/g, "'\\''")}'`).join("\n")
  );
  let r = spawnSync(
    "ffmpeg",
    ["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", out],
    { encoding: "utf8" }
  );
  if (r.status !== 0 || !fs.existsSync(out)) {
    r = spawnSync(
      "ffmpeg",
      ["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c:a", "libopus", out],
      { encoding: "utf8" }
    );
  }
  return r.status === 0 && fs.existsSync(out);
}

function finalizeConcat() {
  const ok = {};
  for (const t of TRACKS) ok[t] = concatTrack(t);
  return ok;
}

function stop() {
  if (server) {
    server.close();
    server = null;
  }
}

module.exports = { start, finalizeConcat, stop, TRACKS };
