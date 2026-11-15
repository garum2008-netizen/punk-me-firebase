#!/usr/bin/env node
/** Fail if 3D player root Y drops below floor after city travel (district void). */
const { spawnSync } = require("child_process");
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const http = require("http");
const { assertFirebaseEmulatorTestEnv, installProdFirebaseRouteBlock } = require("./firebase-test-emulator-guard");
const { configureCyberPunkBlueStudio, QA_CYBER_PUNK_BLUE } = require("./confirm-character-studio");

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

async function main() {
  runBuild();
  const port = 8780 + Math.floor(Math.random() * 80);
  const server = serveDist(port);
  const base = `http://127.0.0.1:${port}`;
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
    await page.goto(`${base}/?v=t209-floor`, { waitUntil: "load", timeout: 120000 });
    await page.waitForFunction(() => window.__PUNK_PREVIEW__ === true, undefined, { timeout: 15000 });
    await configureCyberPunkBlueStudio(page, QA_CYBER_PUNK_BLUE.name);
    await page.locator('[data-testid="character-studio-confirm"]').click();
    await page.waitForFunction(() => window.__playerLoaded === true, undefined, { timeout: 120000 });
    await page.evaluate(() => {
      window.goLocation?.("city");
    });
    await page.waitForFunction(() => window.me?.location === "city", undefined, { timeout: 45000 });
    await page.waitForTimeout(800);
    const floor = await page.evaluate(() => window.World3D?.getPlayerFloorSnapshot?.());
    if (!floor) throw new Error("floor snapshot missing");
    if (floor.belowFloor) throw new Error(`player below floor: ${JSON.stringify(floor)}`);
    if (floor.rootY < -0.02) throw new Error(`rootY too low: ${JSON.stringify(floor)}`);
    console.log("t209-player-floor: PASS", floor);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch(err => {
  console.error("t209-player-floor: FAIL", err.message || err);
  process.exit(1);
});