#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

(async () => {
  const root = path.join(__dirname, "..");
  const cat = JSON.parse(fs.readFileSync(path.join(root, "data/story/avatar-catalog.json"), "utf8"));
  const mod = await import(pathToFileURL(path.join(root, "js/avatar/avatar-catalog.mjs")).href);
  const samples = [];
  const names = ["Nova", "Rix", "Yuki", "Zef", "MiraHero", "Ash"];
  for (let i = 0; i < 6; i++) {
  const base = mod.defaultAvatarConfig();
    base.name = names[i];
    const cfg = i < 2 ? base : mod.randomizeConfig(base, cat);
    cfg.name = names[i];
    samples.push(cfg);
  }
  const out = path.join(root, "docs/game-design/sample-avatars-t204.json");
  fs.writeFileSync(out, JSON.stringify(samples, null, 2));
  console.log("wrote", out);
})();
