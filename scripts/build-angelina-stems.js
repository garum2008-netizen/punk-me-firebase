#!/usr/bin/env node
/** Build music.wav + sfx.wav for 00-angelina-long (asset timeline; see KNOWN_BUGS). */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const OUT = path.join(__dirname, "../qa/content/00-angelina-long");
const ASSETS = path.join(__dirname, "../assets/audio");
const duration = Number(process.env.ANGELINA_DURATION || 1785.24);
const trim = Number(process.env.ANGELINA_TRIM || 35.1);
const len = Math.max(60, duration - trim);

const timeline = [
  { t: 0, track: "music_home" },
  { t: 65, track: "music_street" },
  { t: 190, track: "music_cemetery" },
  { t: 320, track: "music_street" },
  { t: 450, track: "music_city" },
  { t: 720, track: "music_construction" },
  { t: 1050, track: "music_cemetery" },
  { t: 1500, track: "music_home" }
];

function ogg(name) {
  const p = path.join(ASSETS, "music", `${name}.ogg`);
  if (!fs.existsSync(p)) throw new Error(`missing ${p}`);
  return p;
}

function runFfmpeg(args) {
  const r = spawnSync("ffmpeg", args, { stdio: "inherit" });
  if (r.status !== 0) throw new Error(`ffmpeg failed`);
}

const tmp = path.join(OUT, ".stem-build");
fs.mkdirSync(tmp, { recursive: true });
const parts = [];
for (let i = 0; i < timeline.length; i++) {
  const start = timeline[i].t;
  const end = i + 1 < timeline.length ? timeline[i + 1].t : len;
  const segLen = Math.max(1, end - start);
  const out = path.join(tmp, `music-${i}.wav`);
  runFfmpeg(["-y", "-stream_loop", "-1", "-i", ogg(timeline[i].track), "-t", String(segLen), "-ac", "2", "-ar", "48000", out]);
  parts.push(out);
}
const list = path.join(tmp, "music-concat.txt");
fs.writeFileSync(list, parts.map(p => `file '${p}'`).join("\n"));
runFfmpeg(["-y", "-f", "concat", "-safe", "0", "-i", list, "-ac", "2", "-ar", "48000", path.join(OUT, "music.wav")]);

const sfxIn = path.join(ASSETS, "sfx", "interact.ogg");
runFfmpeg([
  "-y",
  "-stream_loop",
  "-1",
  "-i",
  sfxIn,
  "-t",
  String(len),
  "-af",
  "volume=0.08",
  "-ac",
  "2",
  "-ar",
  "48000",
  path.join(OUT, "sfx.wav")
]);
console.log("music+sfx stems ->", OUT);
