#!/usr/bin/env node
/**
 * t209 — FAIL if in-game hero mesh is not CYBER PUNK BLUE (mohawk + blue accent, not pink Vienna).
 */
const { spawnSync } = require("child_process");
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const http = require("http");
const { assertFirebaseEmulatorTestEnv, installProdFirebaseRouteBlock } = require("./firebase-test-emulator-guard");
const { configureCyberPunkBlueStudio, QA_CYBER_PUNK_BLUE } = require("./confirm-character-studio");
const { scoreHairColorRegion } = require("./hero-hair-pixel-gate");
const os = require("os");

assertFirebaseEmulatorTestEnv();

const ROOT = path.join(__dirname, "..");
const DIST = path.join(ROOT, "dist-preview");
const HOWTO_SEEN_KEY = "punkme_howto_seen";

function runBuild() {
  const r = spawnSync("node", [path.join(__dirname, "build-preview.js")], { cwd: ROOT, stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status || 1);
}

function serveDist(port) {
  const mime = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript",
    ".mjs": "application/javascript",
    ".json": "application/json",
    ".css": "text/css",
    ".webp": "image/webp",
    ".glb": "model/gltf-binary"
  };
  return http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    const rel = urlPath === "/" ? "index.html" : urlPath.replace(/^\//, "");
    const file = path.join(DIST, rel);
    if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    const ext = path.extname(file);
    res.writeHead(200, { "Content-Type": mime[ext] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  }).listen(port);
}

async function assertHeroBinding(base) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.addInitScript(key => {
    try {
      localStorage.setItem(key, "1");
      localStorage.removeItem("punkme_avatar_v1");
    } catch (_) {}
  }, HOWTO_SEEN_KEY);
  const page = await context.newPage();
  await installProdFirebaseRouteBlock(page);
  try {
    await page.goto(`${base}/?lifeCh1E2e=1&v=t209-hero`, { waitUntil: "load", timeout: 120000 });
    await page.waitForFunction(() => window.__PUNK_PREVIEW__ === true, undefined, { timeout: 15000 });
    await configureCyberPunkBlueStudio(page, QA_CYBER_PUNK_BLUE.name);

    await page.locator('[data-testid="character-studio-confirm"]').click();
    await page.waitForFunction(() => window.__playerLoaded === true, undefined, { timeout: 120000 });

    const hero = await page.evaluate(qa => {
      const me = window.me || {};
      const snap = window.World3D?.getPlayerActorSnapshot?.();
      const look = window.getPlayerAvatarLook?.();
      const meshId = window.resolveEffectivePlayerMeshId?.(me);
      return {
        characterId: me.characterId,
        meshId,
        snap,
        lookHair: look?.hair,
        cfgHair: me.avatarConfig?.hairColor,
        matchCfg:
          me.avatarConfig?.hairColor === qa.hairColor &&
          me.avatarConfig?.bodyPreset === qa.bodyPreset &&
          (me.avatarConfig?.accessories || []).includes("wings_01")
      };
    }, QA_CYBER_PUNK_BLUE);

    if (!hero.matchCfg) throw new Error("avatarConfig mismatch: " + JSON.stringify(hero));
    if (hero.meshId !== "mohawk") {
      throw new Error(`expected mesh hero mohawk, got ${hero.meshId} (characterId=${hero.characterId})`);
    }
    if (!hero.snap) throw new Error("player actor snapshot missing");
    if (hero.snap.usesPinkFallback) {
      throw new Error("in-game hero still on pink Vienna fallback GLB");
    }
    if (!hero.snap.meshUrl.includes("mohawk")) {
      throw new Error("player meshUrl is not mohawk: " + hero.snap.meshUrl);
    }
    if (hero.snap.accent !== "blue" && hero.snap.accent !== "teal") {
      throw new Error(`expected blue/teal hair accent on hero, got ${hero.snap.accent}`);
    }
    if (hero.snap.cutoutSpriteVisible) {
      throw new Error("life-ch1 cutout sprite must not hide custom hero mesh");
    }
    if (!hero.snap.meshVisible) {
      throw new Error("hero mesh root not visible");
    }
    if (hero.lookHair !== 0x3399ff && hero.lookHair !== 3381759) {
      throw new Error(`look hair hex mismatch: ${hero.lookHair}`);
    }
    const shotPath = path.join(os.tmpdir(), `t209-hero-hair-${Date.now()}.png`);
    await page.locator("#stage3d").screenshot({ path: shotPath, type: "png" });
    const hairPx = await scoreHairColorRegion(shotPath);
    if (!hairPx.ok) {
      throw new Error(`rendered hair not blue-dominant: ${JSON.stringify(hairPx)}`);
    }
    console.log("t209-hero-binding: PASS", {
      hairPixel: { ratio: hairPx.ratio, blueMean: hairPx.blueMean, greenMean: hairPx.greenMean },
      meshId: hero.meshId,
      accent: hero.snap.accent,
      meshUrl: hero.snap.meshUrl.split("/").pop()
    });
  } finally {
    await browser.close();
  }
}

async function main() {
  runBuild();
  const port = 8765 + Math.floor(Math.random() * 200);
  const server = serveDist(port);
  const base = `http://127.0.0.1:${port}`;
  try {
    await assertHeroBinding(base);
  } finally {
    server.close();
  }
}

main().catch(err => {
  console.error("t209-hero-binding: FAIL", err.message || err);
  process.exit(1);
});