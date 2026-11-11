#!/usr/bin/env node
const path = require("path");
const { pathToFileURL } = require("url");

async function main() {
  const mod = await import(pathToFileURL(path.join(__dirname, "..", "js/world/cemetery-job-logic.mjs")).href);
  const { isCemeteryShiftSuccessful } = mod;
  let failed = 0;
  function assert(c, msg) {
    if (!c) {
      console.error("FAIL:", msg);
      failed++;
    }
  }
  assert(!isCemeteryShiftSuccessful(6, 2), "six candles two ghosts fails");
  assert(!isCemeteryShiftSuccessful(5, 3), "five candles three ghosts fails");
  assert(isCemeteryShiftSuccessful(6, 3), "full shift succeeds");
  if (failed) process.exit(1);
  console.log("cemetery-job-unit: PASS");
}

main().catch(e => {
  console.error("cemetery-job-unit: FAIL", e);
  process.exit(1);
});
