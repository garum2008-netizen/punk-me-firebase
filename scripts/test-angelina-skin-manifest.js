#!/usr/bin/env node
/** Verify manifest source + shipped sha256; forbid v1 guitar asset (t569u). */
const fs = require("fs");
const crypto = require("crypto");
const path = require("path");

const root = path.join(__dirname, "..");
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, "data/story/angelina-skin-manifest.json"), "utf8")
);

function hashFile(rel) {
  const p = path.join(root, rel);
  return crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
}

let failed = 0;
for (const id of ["A", "B", "C"]) {
  const entry = manifest.skins[id];
  for (const kind of ["source", "portrait", "world"]) {
    const slot = entry[kind];
    if (!slot?.path || !slot?.sha256) {
      console.error(`FAIL: ${id}.${kind} missing path/sha256`);
      failed++;
      continue;
    }
    if (!fs.existsSync(path.join(root, slot.path))) {
      console.error("FAIL: missing", slot.path);
      failed++;
      continue;
    }
    const got = hashFile(slot.path);
    if (got !== slot.sha256) {
      console.error(`FAIL: ${id}.${kind} sha256 got ${got} expected ${slot.sha256}`);
      failed++;
    }
  }
}

const forbidden = path.join(root, "assets/ui/angelina-skins/source/angelina-teen-C.png");
if (fs.existsSync(forbidden)) {
  console.error("FAIL: forbidden angelina-teen-C.png present in repo");
  failed++;
}

for (const rel of ["placeholder-a.svg", "placeholder-b.svg", "placeholder-c.svg"]) {
  if (fs.existsSync(path.join(root, "assets/ui/angelina-skins", rel))) {
    console.error("FAIL: obsolete placeholder still present:", rel);
    failed++;
  }
}

if (failed) process.exit(1);
console.log("angelina-skin-manifest: PASS (source + portrait + world sha256)");
