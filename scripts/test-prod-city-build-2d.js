#!/usr/bin/env node
/** Prod bundle: 2D city build path via placeBuildAt (no window.tryPlaceBuild on prod). */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const gameJs = fs.readFileSync(path.join(root, "js/game.js"), "utf8");

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    console.error("FAIL:", msg);
    failed++;
  }
}

assert(/buildMode && LOCATIONS\[me\.location\]\.buildZone === "city"/.test(gameJs), "onRoomClick city build branch");
assert(gameJs.includes("placeBuildAt(x, y);"), "onRoomClick calls placeBuildAt");
assert(gameJs.includes("function exposePreviewBuildHooks"), "preview-only tryPlaceBuild hook");
assert(!/window\.tryPlaceBuild\s*=\s*function/.test(gameJs), "prod must not assign window.tryPlaceBuild directly");

if (failed) process.exit(1);
console.log("test-prod-city-build-2d: PASS");
