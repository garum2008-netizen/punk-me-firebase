#!/usr/bin/env node
/** Copy a rules snapshot over database.rules.json (with backup). */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const liveRules = path.join(root, "database.rules.json");
const backup = path.join(root, "database.rules.json.emulator-backup");

function useSnapshot(snapshotName) {
  const src = path.join(__dirname, "rules-deploy-snapshots", snapshotName);
  if (!fs.existsSync(src)) throw new Error(`missing snapshot ${src}`);
  if (!fs.existsSync(backup)) {
    fs.copyFileSync(liveRules, backup);
  }
  fs.copyFileSync(src, liveRules);
}

function restore() {
  if (fs.existsSync(backup)) {
    fs.copyFileSync(backup, liveRules);
    fs.unlinkSync(backup);
  }
}

module.exports = { useSnapshot, restore };

if (require.main === module) {
  const cmd = process.argv[2];
  if (cmd === "restore") restore();
  else if (cmd) useSnapshot(cmd);
  else {
    console.error("Usage: node emulator-rules-swap.js <snapshot.json>|restore");
    process.exit(1);
  }
}
