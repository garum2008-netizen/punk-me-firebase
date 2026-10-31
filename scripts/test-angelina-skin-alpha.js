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
    }
  }
  if (failed) process.exit(1);
  console.log("angelina-skin-alpha: PASS");
})();
