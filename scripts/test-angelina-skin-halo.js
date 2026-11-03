#!/usr/bin/env node
/** Shipped skins: interior alpha 255 + interior RGB hash; no grey edge ring on #111 at 3× scale. */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, "data/story/angelina-skin-manifest.json"), "utf8")
);

let sharp;
try {
  sharp = require("sharp");
} catch {
  console.error("FAIL: sharp required");
  process.exit(1);
}

async function loadRgba(rel, scale = 1) {
  const p = path.join(root, rel);
  let pipe = sharp(p).ensureAlpha();
  if (scale !== 1) {
    const meta = await sharp(p).metadata();
    pipe = pipe.resize(Math.round(meta.width * scale), Math.round(meta.height * scale), {
      kernel: sharp.kernel.lanczos3
    });
  }
  const { data, info } = await pipe.raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

function interiorRgbSha256(data, w, h) {
  const crypto = require("crypto");
  const hsh = crypto.createHash("sha256");
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (data[i + 3] !== 255) continue;
      hsh.update(Buffer.from([data[i], data[i + 1], data[i + 2]]));
    }
  }
  return hsh.digest("hex");
}

function isEdge(data, w, h, x, y, clear = 20) {
  const a = data[(y * w + x) * 4 + 3];
  if (a <= 0) return false;
  if (a < 255) return true;
  for (const [dx, dy] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1]
  ]) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= w || ny >= h) return true;
    if (data[(ny * w + nx) * 4 + 3] < clear) return true;
  }
  return false;
}

(async () => {
  let failed = 0;
  for (const id of ["A", "B", "C"]) {
    for (const kind of ["portrait", "world"]) {
      const slot = manifest.skins[id][kind];
      const shipped = await loadRgba(slot.path);
      const shipped3 = await loadRgba(slot.path, 3);
      let softInterior = 0;
      let interiorOpaque = 0;
      for (let i = 3; i < shipped.data.length; i += 4) {
        const a = shipped.data[i];
        if (a < 254) continue;
        interiorOpaque++;
        const pi = i - 3;
        const x = (pi / 4) % shipped.w;
        const y = Math.floor(pi / 4 / shipped.w);
        if (!isEdge(shipped.data, shipped.w, shipped.h, x, y) && a < 255) softInterior++;
      }
      if (interiorOpaque > 0 && softInterior / interiorOpaque > 0.001) {
        console.error(`FAIL: ${id} ${kind} non-edge pixels with alpha < 255: ${softInterior}/${interiorOpaque}`);
        failed++;
      }
      const hash = interiorRgbSha256(shipped.data, shipped.w, shipped.h);
      if (slot.interiorRgbSha256 && hash !== slot.interiorRgbSha256) {
        console.error(`FAIL: ${id} ${kind} interiorRgbSha256 mismatch`);
        failed++;
      } else if (!slot.interiorRgbSha256) {
        console.error(`FAIL: ${id} ${kind} missing interiorRgbSha256 in manifest (rebuild skins)`);
        failed++;
      } else {
        console.log(`OK: ${id} ${kind} interior lock hash`);
      }

      let interiorRgb = [0, 0, 0];
      let n = 0;
      for (let y = 0; y < shipped3.h; y++) {
        for (let x = 0; x < shipped3.w; x++) {
          const i = (y * shipped3.w + x) * 4;
          if (shipped3.data[i + 3] < 254) continue;
          interiorRgb[0] += shipped3.data[i];
          interiorRgb[1] += shipped3.data[i + 1];
          interiorRgb[2] += shipped3.data[i + 2];
          n++;
        }
      }
      if (n) interiorRgb = interiorRgb.map(v => v / n);
      let greyRing = 0;
      let edgeSemi = 0;
      for (let y = 0; y < shipped3.h; y++) {
        for (let x = 0; x < shipped3.w; x++) {
          if (!isEdge(shipped3.data, shipped3.w, shipped3.h, x, y)) continue;
          const i = (y * shipped3.w + x) * 4;
          const a = shipped3.data[i + 3];
          if (a <= 0 || a >= 255) continue;
          edgeSemi++;
          const r = shipped3.data[i];
          const g = shipped3.data[i + 1];
          const b = shipped3.data[i + 2];
          const af = a / 255;
          const compR = r * af + 17 * (1 - af);
          const compG = g * af + 17 * (1 - af);
          const compB = b * af + 17 * (1 - af);
          const lum = (compR + compG + compB) / 3;
          const distGrey = Math.abs(compR - lum) + Math.abs(compG - lum) + Math.abs(compB - lum);
          const distHair =
            Math.abs(compR - interiorRgb[0]) +
            Math.abs(compG - interiorRgb[1]) +
            Math.abs(compB - interiorRgb[2]);
          const greyMatt = distGrey < 12 && lum > 55 && lum < 210;
          if (greyMatt && distHair > 38) greyRing++;
        }
      }
      if (edgeSemi > 80 && greyRing / edgeSemi > 0.12) {
        console.error(`FAIL: ${id} ${kind} grey halo @3x on #111 (${greyRing}/${edgeSemi})`);
        failed++;
      } else {
        console.log(`OK: ${id} ${kind} edge @3x (${edgeSemi} semi px)`);
      }
    }
  }
  if (failed) process.exit(1);
  console.log("test-angelina-skin-halo: PASS");
})().catch(e => {
  console.error("test-angelina-skin-halo: FAIL", e);
  process.exit(1);
});
