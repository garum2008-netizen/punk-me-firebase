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

function alphaDistanceToClear(data, w, h) {
  const dist = new Int32Array(w * h);
  dist.fill(1e9);
  const q = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (data[i * 4 + 3] <= 0) {
        dist[i] = 0;
        q.push(i);
      }
    }
  }
  let qi = 0;
  while (qi < q.length) {
    const i = q[qi++];
    const x = i % w;
    const y = (i / w) | 0;
    const d = dist[i];
    for (const [dx, dy] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1]
    ]) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const ni = ny * w + nx;
      if (dist[ni] > d + 1) {
        dist[ni] = d + 1;
        q.push(ni);
      }
    }
  }
  return dist;
}

function sourceBgRefs(sourceData, w, h, radius = 4) {
  const refs = [];
  for (const [cx, cy] of [
    [0, 0],
    [w - 1, 0],
    [0, h - 1],
    [w - 1, h - 1]
  ]) {
    let rs = 0;
    let gs = 0;
    let bs = 0;
    let n = 0;
    for (let y = Math.max(0, cy - radius); y <= Math.min(h - 1, cy + radius); y++) {
      for (let x = Math.max(0, cx - radius); x <= Math.min(w - 1, cx + radius); x++) {
        const i = (y * w + x) * 4;
        rs += sourceData[i];
        gs += sourceData[i + 1];
        bs += sourceData[i + 2];
        n++;
      }
    }
    refs.push([Math.round(rs / n), Math.round(gs / n), Math.round(bs / n)]);
  }
  return refs;
}

function matchesSourceBg(r, g, b, refs, tol = 18) {
  const chroma = Math.max(r, g, b) - Math.min(r, g, b);
  const lum = (r + g + b) / 3;
  if (chroma >= 22 && lum < 248) return false;
  for (const [cr, cg, cb] of refs) {
    if (Math.max(Math.abs(r - cr), Math.abs(g - cg), Math.abs(b - cb)) <= tol) return true;
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
      for (let y = 0; y < shipped.h; y++) {
        for (let x = 0; x < shipped.w; x++) {
          const i = (y * shipped.w + x) * 4;
          const a = shipped.data[i + 3];
          if (a < 128) continue;
          if (isEdge(shipped.data, shipped.w, shipped.h, x, y, 8)) continue;
          if (a !== 255) softInterior++;
        }
      }
      if (softInterior > 0) {
        console.error(`FAIL: ${id} ${kind} interior alpha not 255 (${softInterior} px)`);
        failed++;
      }

      const shipped3 = await loadRgba(slot.path, 3);
      const source3 = await loadSourceAtSize(sourceRel, shipped3.w, shipped3.h);
      const bgRefs = sourceBgRefs(source3.data, source3.w, source3.h);
      const distClear = alphaDistanceToClear(shipped3.data, shipped3.w, shipped3.h);
      let bgOpaqueBand = 0;
      let bandCandidates = 0;
      for (let y = 0; y < shipped3.h; y++) {
        for (let x = 0; x < shipped3.w; x++) {
          const idx = y * shipped3.w + x;
          const i = idx * 4;
          const a = shipped3.data[i + 3];
          if (a !== 255) continue;
          if (distClear[idx] > 15) continue;
          bandCandidates++;
          const r = shipped3.data[i];
          const g = shipped3.data[i + 1];
          const b = shipped3.data[i + 2];
          const lum = (r + g + b) / 3;
          const compChroma = Math.max(r, g, b) - Math.min(r, g, b);
          const distGrey =
            Math.abs(r - lum) + Math.abs(g - lum) + Math.abs(b - lum);
          const greyMatt = distGrey < 10 && lum > 55 && lum < 210 && compChroma < 13;
          if (greyMatt) bgOpaqueBand++;
        }
      }
      if (bgOpaqueBand > 0) {
        console.error(
          `FAIL: ${id} ${kind} opaque source-bg band within 15px of edge (${bgOpaqueBand} px, band ${bandCandidates})`
        );
        failed++;
      } else if (bandCandidates > 40) {
        console.log(`OK: ${id} ${kind} opaque edge band 0/${bandCandidates}`);
      }
    }
  }
  if (failed) process.exit(1);
  console.log("test-angelina-skin-halo: PASS");
})().catch(e => {
  console.error("test-angelina-skin-halo: FAIL", e);
  process.exit(1);
});
