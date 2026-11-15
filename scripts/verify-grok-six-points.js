#!/usr/bin/env node
/** Self-check Grok six P0 points from 5s samples + beat PNGs. */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { spawnSync } = require("child_process");

const video = process.argv[2];
const lumDir = process.argv[3];
const beatDir = process.argv[4];

const GROK = [
  { id: "district_void", t: 180, maxBlackStreak: 3, note: "District visible ~3min" },
  { id: "duel_vfx", t: 374, minLuma: 18, note: "3D duel chain/VFX" },
  { id: "quest_not_idle", t: 530, minLuma: 16, note: "Objective/marker on street" },
  { id: "cemetery_cam", t: 302, minLuma: 14, note: "Cemetery no pitch black" },
  { id: "climax_narrative", t: 748, minLuma: 20, note: "Climax pulse visible" },
  { id: "studio_preview", t: 25, minLuma: 22, note: "Studio hero visible" }
];

async function lumaPng(p) {
  const { data } = await sharp(p).greyscale().raw().toBuffer({ resolveWithObject: true });
  if (!data.length) return 0;
  let s = 0;
  for (let i = 0; i < data.length; i++) s += data[i];
  return s / data.length;
}

function frameAtT(lumDir, t, canvas = true) {
  const idx = Math.round(t / 5);
  const name = canvas
    ? `canvas-${String(idx + 1).padStart(4, "0")}.png`
  : `frame-${String(idx + 1).padStart(4, "0")}.png`;
  const sub = canvas ? "canvas-crops" : ".";
  return path.join(lumDir, sub, name);
}

async function main() {
  if (!video || !lumDir || !fs.existsSync(lumDir)) {
    console.error("usage: verify-grok-six-points.js <video> <luminance-scan-dir> [beatDir]");
    process.exit(2);
  }
  let lumJson = null;
  const jsonPath = path.join(lumDir, "LUMINANCE_SCAN.json");
  if (fs.existsSync(jsonPath)) lumJson = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

  const out = { video: path.basename(video), points: [], ok: true };
  if (lumJson && !lumJson.ok) {
    out.ok = false;
    out.luminanceFail = lumJson.worstNearBlackStreak;
  }
  for (const g of GROK) {
    let fp = frameAtT(lumDir, g.t, true);
    if (!fs.existsSync(fp)) fp = frameAtT(lumDir, g.t, false);
    let luma = null;
    let met = false;
    if (fs.existsSync(fp)) {
      luma = await lumaPng(fp);
      met = luma >= (g.minLuma || 10);
    }
    out.points.push({ ...g, frame: fp, luma: luma != null ? +luma.toFixed(1) : null, met });
    if (luma != null && g.minLuma && luma < g.minLuma) out.ok = false;
  }
  const report = path.join(lumDir, "GROK_SIX_POINT_VERIFY.json");
  fs.writeFileSync(report, JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  process.exit(out.ok ? 0 : 1);
}

main().catch(e => {
  console.error(e);
  process.exit(2);
});