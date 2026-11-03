#!/usr/bin/env node
/** Prod: hero NPCs use dedicated meshy GLBs (byte-identical to main); dog present. */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { pathToFileURL } = require("url");

const root = path.join(__dirname, "..");

function assertSameAsMain(rel) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    console.error("FAIL: missing", rel);
    return false;
  }
  try {
    execSync(`git show origin/main:${rel} | cmp -s - "${abs}"`, {
      cwd: root,
      stdio: "pipe"
    });
    return true;
  } catch {
    console.error("FAIL: byte mismatch vs main for", rel);
    return false;
  }
}

async function main() {
  const mod = await import(pathToFileURL(path.join(root, "js/world/meshy-punk.mjs")).href);
  const { meshyGlbPathForHero } = mod;

  const shipped = JSON.parse(
    fs.readFileSync(path.join(root, "assets/models/meshy/shipped.json"), "utf8")
  );
  let failed = 0;
  for (const id of ["mohawk", "cobalt", "razor", "vienna"]) {
    if (!shipped.includes(id) && id !== "vienna") {
      console.error("FAIL: shipped.json missing", id);
      failed++;
    }
    const rel = meshyGlbPathForHero(id).split("?")[0];
    if (id === "mohawk" && !rel.includes("mohawk.glb")) failed++;
    if (id === "cobalt" && !rel.includes("cobalt.glb")) failed++;
    if (id === "razor" && !rel.includes("razor.glb")) failed++;
    if (id === "vienna" && !rel.includes("punk_pink.glb")) failed++;
  }

  for (const rel of [
    "assets/models/meshy/mohawk.glb",
    "assets/models/meshy/cobalt.glb"
  ]) {
    if (!assertSameAsMain(rel)) failed++;
  }

  const dogPath = path.join(root, "assets/models/pets/punk_dog.glb");
  if (!fs.existsSync(dogPath)) {
    console.error("FAIL: missing punk_dog.glb");
    failed++;
  } else {
    const dogBytes = fs.statSync(dogPath).size;
    if (dogBytes > 600000) {
      console.error("FAIL: punk_dog.glb too large", dogBytes);
      failed++;
    }
  }

  const gameJs = fs.readFileSync(path.join(root, "js/game.js"), "utf8");
  if (/angelina-skins\/shipped.*SHOP|SHOP[\s\S]*angelina-skins\/shipped/.test(gameJs)) {
    console.error("FAIL: SHOP still references Angelina shipped assets");
    failed++;
  }

  if (failed) {
    console.error(`test-npc-mesh-templates: ${failed} failed`);
    process.exit(1);
  }
  console.log("test-npc-mesh-templates: PASS (main-identical GLBs + prod shop icons)");
}

main().catch(e => {
  console.error("test-npc-mesh-templates: FAIL", e);
  process.exit(1);
});
