#!/usr/bin/env node
/** Shipped skins vs approved source (committed assets only — no rembg at test runtime). */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

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

async function loadSourceAtSize(sourceRel, w, h) {
  const p = path.join(root, sourceRel);
  const { data, info } = await sharp(p)
    .ensureAlpha()
    .resize(w, h, { kernel: sharp.kernel.lanczos3 })
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

function laplacianVariance(data, w, h) {
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4;
      if (data[i + 3] < 200) continue;
      const lum =
        0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const li = ((y - 1) * w + x) * 4;
      const ri = ((y + 1) * w + x) * 4;
      const ti = (y * w + (x - 1)) * 4;
      const bi = (y * w + (x + 1)) * 4;
      const lap =
        4 * lum -
        (0.299 * data[li] + 0.587 * data[li + 1] + 0.114 * data[li + 2]) -
        (0.299 * data[ri] + 0.587 * data[ri + 1] + 0.114 * data[ri + 2]) -
        (0.299 * data[ti] + 0.587 * data[ti + 1] + 0.114 * data[ti + 2]) -
        (0.299 * data[bi] + 0.587 * data[bi + 1] + 0.114 * data[bi + 2]);
      sum += lap;
      sumSq += lap * lap;
      n++;
    }
  }
  if (n < 10) return 0;
  const mean = sum / n;
  return sumSq / n - mean * mean;
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

function interiorRgbSha256(data, w, h) {
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

(async () => {
  let failed = 0;
  for (const id of ["A", "B", "C"]) {
    const sourceRel = manifest.skins[id].source.path;
    for (const kind of ["portrait", "world"]) {
      const slot = manifest.skins[id][kind];
      const shipped = await loadRgba(slot.path);
      const sourceAt = await loadSourceAtSize(sourceRel, shipped.w, shipped.h);

      let fg = 0;
      let interior255 = 0;
      for (let y = 0; y < shipped.h; y++) {
        for (let x = 0; x < shipped.w; x++) {
          const i = (y * shipped.w + x) * 4;
          const a = shipped.data[i + 3];
          if (a < 128) continue;
          fg++;
          if (a === 255) interior255++;
        }
      }
      if (fg && interior255 / fg < 0.9) {
        console.error(`FAIL: ${id} ${kind} interior alpha255 share ${((100 * interior255) / fg).toFixed(1)}% < 90%`);
        failed++;
      }
      const shippedSha = interiorRgbSha256(shipped.data, shipped.w, shipped.h);
      if (slot.interiorRgbSha256 && shippedSha !== slot.interiorRgbSha256) {
        console.error(`FAIL: ${id} ${kind} interiorRgbSha256 drift`);
        failed++;
      }
      const refVar = laplacianVariance(sourceAt.data, sourceAt.w, sourceAt.h);
      const shipVar = laplacianVariance(shipped.data, shipped.w, shipped.h);
      if (refVar > 1 && shipVar / refVar < 0.9) {
        console.error(`FAIL: ${id} ${kind} Laplacian sharpness ratio ${(shipVar / refVar).toFixed(3)} < 0.9`);
        failed++;
      }

      let softInterior = 0;
      let interiorPixels = 0;
      for (let y = 0; y < shipped.h; y++) {
        for (let x = 0; x < shipped.w; x++) {
          const i = (y * shipped.w + x) * 4;
          const a = shipped.data[i + 3];
          if (a < 128) continue;
          if (isEdge(shipped.data, shipped.w, shipped.h, x, y, 8)) continue;
          interiorPixels++;
          if (a !== 255) softInterior++;
        }
      }
      if (softInterior > 0) {
        console.error(`FAIL: ${id} ${kind} interior alpha not 255 (${softInterior} px)`);
        failed++;
      }

      const shipped3 = await loadRgba(slot.path, 3);
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
          const compChroma = Math.max(compR, compG, compB) - Math.min(compR, compG, compB);
          const distGrey = Math.abs(compR - lum) + Math.abs(compG - lum) + Math.abs(compB - lum);
          const distHair =
            Math.abs(compR - interiorRgb[0]) +
            Math.abs(compG - interiorRgb[1]) +
            Math.abs(compB - interiorRgb[2]);
          const greyMatt = distGrey < 10 && lum > 55 && lum < 210 && compChroma < 13;
          if (greyMatt && distHair > 42) greyRing++;
        }
      }
      if (edgeSemi > 80 && greyRing / edgeSemi > 0.12) {
        console.error(`FAIL: ${id} ${kind} grey halo @3x on #111 (${greyRing}/${edgeSemi})`);
        failed++;
      }
    }
  }
  if (failed) process.exit(1);
  console.log("test-angelina-skin-halo: PASS");
})().catch(e => {
  console.error("test-angelina-skin-halo: FAIL", e);
  process.exit(1);
});
