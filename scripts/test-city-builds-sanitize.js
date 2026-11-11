#!/usr/bin/env node
const path = require("path");
const { pathToFileURL } = require("url");

async function main() {
  const mod = await import(
    pathToFileURL(path.join(__dirname, "..", "js/city-builds-sanitize.mjs")).href
  );
  const {
    CITY_BUILDS_MAX,
    sanitizeCityBuildsList,
    normalizeCityBuildEntry,
    clampBuildPlacement,
    isAllowedBuildType
  } = mod;

  let failed = 0;
  function assert(c, msg) {
    if (!c) {
      console.error("FAIL:", msg);
      failed++;
    }
  }

  assert(CITY_BUILDS_MAX === 200, "max 200");
  assert(isAllowedBuildType("crypt") && !isAllowedBuildType("nope"), "type whitelist");

  const ok = normalizeCityBuildEntry({
    type: "neon_sign",
    x: 50.5,
    y: 12,
    id: "local_abc123",
    ts: 1_700_000_000_000
  });
  assert(ok && ok.type === "neon_sign" && ok.x === 50.5, "valid entry");

  assert(normalizeCityBuildEntry({ type: "crypt", x: NaN, y: 1, id: "a", ts: 1 }) === null, "drop NaN x");
  assert(normalizeCityBuildEntry({ type: "crypt", x: 1, y: 1, id: "bad id!", ts: 1 }) === null, "drop bad id");
  assert(normalizeCityBuildEntry({ type: "crypt", x: -5, y: 50, id: "x1", ts: 1 })?.x === 0, "clamp x");
  assert(normalizeCityBuildEntry({ type: "crypt", x: 50, y: 150, id: "x1", ts: 1 })?.y === 100, "clamp y");

  const many = Array.from({ length: 250 }, (_, i) => ({
    type: "shack",
    x: i % 100,
    y: 10,
    id: "b" + i,
    ts: i + 1
  }));
  many.push({ type: "evil", x: 1, y: 1, id: "x", ts: 1 });
  const trimmed = sanitizeCityBuildsList(many);
  assert(trimmed.length === 200, "cap at 200");
  assert(trimmed.every(r => r.type === "shack"), "drops invalid types");

  const clamped = clampBuildPlacement(200, -3);
  assert(clamped.x === 100 && clamped.y === 0, "clampBuildPlacement");

  if (failed) {
    console.error(`test-city-builds-sanitize: ${failed} failed`);
    process.exit(1);
  }
  console.log("test-city-builds-sanitize: PASS");
}

main().catch(e => {
  console.error("test-city-builds-sanitize: FAIL", e);
  process.exit(1);
});
