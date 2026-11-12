#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

const root = path.join(__dirname, "..");
const cat = JSON.parse(fs.readFileSync(path.join(root, "data/story/avatar-catalog.json"), "utf8"));

let failed = 0;
function assert(c, m) {
  if (!c) {
    console.error("FAIL", m);
    failed++;
  }
}

(async () => {
  const mod = await import(pathToFileURL(path.join(root, "js/avatar/avatar-catalog.mjs")).href);
  global.window = {};
  const def = mod.defaultAvatarConfig();
  const v = mod.validateAvatarConfig(def, cat);
  assert(v.ok, "default config valid");
  assert(cat.skinTones.length >= 12, "12+ skin tones");
  assert(cat.hairStyles.length >= 15, "15+ hair styles");
  assert(cat.hairColors.length >= 20, "20+ hair colors");
  assert(cat.facePresets.length >= 8, "8+ face presets");
  assert(cat.bodyPresets.length >= 6, "6+ body presets");
  assert(cat.clothingStyles.length >= 5, "clothing styles");
  assert(cat.accessories.length >= 10, "10+ accessories");
  const look = mod.buildLookFromConfig(def, cat);
  assert(look.hairStyle && look.tint, "look built");
  const r = mod.randomizeConfig(def, cat);
  assert(mod.validateAvatarConfig(r, cat).ok, "randomize valid");
  if (failed) process.exit(1);
  console.log("test-avatar-catalog: PASS");
})();
