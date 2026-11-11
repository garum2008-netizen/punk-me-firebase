#!/usr/bin/env node
/** Lossless chapter segments + smaller VP9 derivative from full desktop ORDINARY UNCUT (original preserved). */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const OUT = process.env.PUNK_ICE_OUT || path.join("/opt/cursor/artifacts", "ice-ch1-footage");
const shaShort = (
  process.env.SHA_SHORT ||
  process.env.PUNK_EVIDENCE_SHA?.slice(0, 12) ||
  spawnSync("git", ["rev-parse", "--short=12", "HEAD"], { encoding: "utf8" }).stdout.trim()
).slice(0, 12);
const pass = process.env.ORDINARY_PASS || "03";

function resolveDesktopUncutSource(dir, shortSha, passRaw) {
  const passNum = Number(passRaw);
  const passTag = Number.isFinite(passNum) ? `pass${String(passNum).padStart(2, "0")}` : `pass${passRaw}`;
  const exact = path.join(
    dir,
    `ice-ch1-ORDINARY-UNCUT-desktop-${shortSha}-desktop1280x720-${passTag}.webm`
  );
  if (fs.existsSync(exact)) return exact;
  if (!fs.existsSync(dir)) return exact;
  const matches = fs
    .readdirSync(dir)
    .filter(
      f =>
        f.startsWith(`ice-ch1-ORDINARY-UNCUT-desktop-${shortSha}-`) &&
        f.includes("desktop1280x720") &&
        f.endsWith(`-${passTag}.webm`)
    )
    .sort();
  return matches.length ? path.join(dir, matches[matches.length - 1]) : exact;
}

const src = resolveDesktopUncutSource(OUT, shaShort, pass);
if (!fs.existsSync(src)) {
  console.error("missing source:", src);
  process.exit(1);
}

const chops = [
  { id: "onboarding", start: 0, end: 130, note: "char select through shop (approx from scene map)" },
  { id: "life-ch1", start: 130, end: 250, note: "ch1 quest through completion banner" },
  { id: "outdoor-scale", start: 250, end: 400, note: "street/cemetery screenshots" },
];

for (const c of chops) {
  const dest = path.join(OUT, `DERIV-LOSSLESS-${c.id}-desktop-${shaShort}-pass${pass}.webm`);
  const dur = c.end - c.start;
  const r = spawnSync(
    "ffmpeg",
    ["-y", "-ss", String(c.start), "-i", src, "-t", String(dur), "-c", "copy", dest],
    { encoding: "utf8" }
  );
  if (r.status !== 0) {
    console.error("ffmpeg segment fail", c.id, r.stderr);
    process.exit(1);
  }
  console.log("wrote", dest);
}

const derivSm = path.join(OUT, `DERIV-VP9-COMPACT-full-desktop-${shaShort}-pass${pass}.webm`);
const r2 = spawnSync(
  "ffmpeg",
  [
    "-y",
    "-i",
    src,
    "-c:v",
    "libvpx-vp9",
    "-crf",
    "36",
    "-b:v",
    "0",
    "-row-mt",
    "1",
    "-an",
    derivSm,
  ],
  { encoding: "utf8", timeout: 600000 }
);
if (r2.status !== 0) {
  console.error("ffmpeg compact fail", r2.stderr?.slice(-800));
  process.exit(1);
}
console.log("wrote", derivSm);
