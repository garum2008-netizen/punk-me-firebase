#!/usr/bin/env node
/** Verify angelina-skin-manifest.json paths exist and sha256 match (t569u). */
const fs = require("fs");
const crypto = require("crypto");
const path = require("path");

const root = path.join(__dirname, "..");
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, "data/story/angelina-skin-manifest.json"), "utf8")
);

let failed = 0;
for (const id of ["A", "B", "C"]) {
  const entry = manifest.skins[id];
  const filePath = path.join(root, entry.portrait);
  if (!fs.existsSync(filePath)) {
    console.error("FAIL: missing", filePath);
    failed++;
    continue;
  }
  const hash = crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
  if (hash !== entry.sha256) {
    console.error(`FAIL: ${id} sha256 mismatch got ${hash} expected ${entry.sha256}`);
    failed++;
  }
}

if (failed) process.exit(1);
console.log("angelina-skin-manifest: PASS");
