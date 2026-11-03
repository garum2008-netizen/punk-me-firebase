#!/usr/bin/env node
/** Verify shipped world/portrait WebPs have meaningful alpha (transparent cutouts). */
const fs = require("fs");
const path = require("path");

let sharp;
try {
  sharp = require("sharp");
} catch {
  console.error("FAIL: sharp not installed — run npm install");
  process.exit(1);
}

const root = path.join(__dirname, "..");
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, "data/story/angelina-skin-manifest.json"), "utf8")
);

async function alphaRatio(rel) {
  const p = path.join(root, rel);
  const { data, info } = await sharp(p).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let transparent = 0;
  const pixels = info.width * info.height;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 16) transparent += 1;
  }
  return transparent / pixels;
}

/** Lower half, outer 10% columns — backdrop must be mostly transparent (C-v2 fix). */
async function lowerOuterColumnsTransparentRatio(rel) {
  const p = path.join(root, rel);
  const { data, info } = await sharp(p).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  const y0 = Math.floor(h * 0.5);
  const leftMax = Math.floor(w * 0.1);
  const rightMin = Math.floor(w * 0.9);
  let transparent = 0;
  let total = 0;
  for (let y = y0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x >= leftMax && x < rightMin) continue;
      const i = (y * w + x) * 4 + 3;
      total += 1;
      if (data[i] < 16) transparent += 1;
    }
  }
  return total ? transparent / total : 0;
}

(async () => {
  let failed = 0;
  for (const id of ["A", "B", "C"]) {
    for (const kind of ["portrait", "world"]) {
      const slot = manifest.skins[id][kind];
      const ratio = await alphaRatio(slot.path);
      if (ratio < 0.08) {
        console.error(`FAIL: ${id} ${kind} transparent ratio ${ratio.toFixed(3)} (need >= 0.08)`);
        failed++;
      } else {
        console.log(`OK: ${id} ${kind} alpha ${(ratio * 100).toFixed(1)}% transparent`);
      }
      if (id === "C") {
        const edge = await lowerOuterColumnsTransparentRatio(slot.path);
        if (edge < 0.72) {
          console.error(
            `FAIL: C ${kind} lower outer columns transparent ${edge.toFixed(3)} (need >= 0.72)`
          );
          failed++;
        } else {
          console.log(`OK: C ${kind} lower outer columns ${(edge * 100).toFixed(1)}% transparent`);
        }
      }
    }
  }
  if (failed) process.exit(1);
  console.log("angelina-skin-alpha: PASS");
})();
