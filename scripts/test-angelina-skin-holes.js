#!/usr/bin/env node
/** Hole regression: no interior semi-alpha; no new transparent islands inside rembg mask. */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, "data/story/angelina-skin-manifest.json"), "utf8")
);
const baseline = JSON.parse(
  fs.readFileSync(path.join(__dirname, "angelina-skin-holes-baseline.json"), "utf8")
);

let sharp;
try {
  sharp = require("sharp");
} catch {
  console.error("FAIL: sharp required");
  process.exit(1);
}

async function loadRgba(rel) {
  const p = path.join(root, rel);
  const { data, info } = await sharp(p).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

async function loadAlpha(rel) {
  const p = path.join(root, rel);
  const { data, info } = await sharp(p).greyscale().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

function rembgEdgeDist(mask, w, h, thresh = 128) {
  const dist = new Int32Array(w * h);
  dist.fill(1e9);
  const q = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (mask[i] < thresh) continue;
      let edge = false;
      for (const [dx, dy] of [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1]
      ]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h || mask[ny * w + nx] < thresh) {
          edge = true;
          break;
        }
      }
      if (edge) {
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
      if (mask[ni] < thresh) continue;
      if (dist[ni] > d + 1) {
        dist[ni] = d + 1;
        q.push(ni);
      }
    }
  }
  return dist;
}

function transparentComponentsInside(rgba, mask, w, h, edgePx = 15, maskT = 128) {
  const dist = rembgEdgeDist(mask, w, h, maskT);
  const seen = new Uint8Array(w * h);
  const comps = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (rgba[i * 4 + 3] > 0) continue;
      if (mask[i] < maskT) continue;
      if (dist[i] <= edgePx) continue;
      if (seen[i]) continue;
      const q = [i];
      seen[i] = 1;
      let n = 0;
      let qi = 0;
      while (qi < q.length) {
        const ci = q[qi++];
        const cx = ci % w;
        const cy = (ci / w) | 0;
        n++;
        for (const [dx, dy] of [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1]
        ]) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const ni = ny * w + nx;
          if (seen[ni]) continue;
          if (rgba[ni * 4 + 3] > 0) continue;
          if (mask[ni] < maskT) continue;
          if (dist[ni] <= edgePx) continue;
          seen[ni] = 1;
          q.push(ni);
        }
      }
      comps.push(n);
    }
  }
  comps.sort((a, b) => a - b);
  return comps;
}

function sameComponentList(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

(async () => {
  let failed = 0;
  for (const id of ["A", "B", "C"]) {
    for (const kind of ["portrait", "world"]) {
      const slot = manifest.skins[id][kind];
      const shipped = await loadRgba(slot.path);
      const alpha = await loadAlpha(slot.alphaRef);
      if (shipped.w !== alpha.w || shipped.h !== alpha.h) {
        console.error(`FAIL: ${id} ${kind} shipped/alpha size mismatch`);
        failed++;
        continue;
      }
      const dist = rembgEdgeDist(alpha.data, shipped.w, shipped.h);
      let softInterior = 0;
      for (let y = 0; y < shipped.h; y++) {
        for (let x = 0; x < shipped.w; x++) {
          const idx = y * shipped.w + x;
          if (alpha.data[idx] < 128) continue;
          if (shipped.data[idx * 4 + 3] >= 255) continue;
          if (dist[idx] > 15) softInterior++;
        }
      }
      if (softInterior > 0) {
        console.error(`FAIL: ${id} ${kind} interior alpha<255 (${softInterior} px)`);
        failed++;
      }
      const comps = transparentComponentsInside(shipped.data, alpha.data, shipped.w, shipped.h);
      const expect = baseline[id][kind].transparentComponents;
      if (!sameComponentList(comps, expect)) {
        console.error(
          `FAIL: ${id} ${kind} transparent components inside silhouette changed (now [${comps.join(",")}] vs baseline [${expect.join(",")}])`
        );
        failed++;
      }
    }
  }
  if (failed) process.exit(1);
  console.log("test-angelina-skin-holes: PASS");
})().catch(e => {
  console.error("test-angelina-skin-holes: FAIL", e);
  process.exit(1);
});
