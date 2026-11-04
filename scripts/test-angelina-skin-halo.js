#!/usr/bin/env node
/** Shipped skins vs approved source (python pipeline); edge halo @3x on #111. */
const { spawnSync } = require("child_process");
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
  const py = spawnSync("python3", [path.join(__dirname, "verify-angelina-shipped-vs-source.py")], {
    cwd: root,
    encoding: "utf8"
  });
  if (py.stdout) process.stdout.write(py.stdout);
  if (py.stderr) process.stderr.write(py.stderr);
  if (py.status !== 0) process.exit(py.status || 1);

  let failed = 0;
  for (const id of ["A", "B", "C"]) {
    for (const kind of ["portrait", "world"]) {
      const slot = manifest.skins[id][kind];
      const shipped = await loadRgba(slot.path);
      let softInterior = 0;
      for (let y = 0; y < shipped.h; y++) {
        for (let x = 0; x < shipped.w; x++) {
          const i = (y * shipped.w + x) * 4;
          const a = shipped.data[i + 3];
          if (a < 128) continue;
          if (!isEdge(shipped.data, shipped.w, shipped.h, x, y) && a !== 255) softInterior++;
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
      }
    }
  }
  if (failed) process.exit(1);
  console.log("test-angelina-skin-halo: PASS");
})().catch(e => {
  console.error("test-angelina-skin-halo: FAIL", e);
  process.exit(1);
});
