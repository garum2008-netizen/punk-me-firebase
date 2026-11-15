#!/usr/bin/env node
/** Ordinary path must open 3D duel, never 2D fightOverlay in world3d preview. */
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
    ".css": "text/css"
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
    res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  }).listen(port);
}

async function main() {
  runBuild();
  const port = 8770 + Math.floor(Math.random() * 50);
  const server = serveDist(port);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await installProdFirebaseRouteBlock(page);
  try {
    await page.goto(`http://127.0.0.1:${port}/?v=t209-duel`, { waitUntil: "load", timeout: 120000 });
    await page.waitForFunction(() => window.__PUNK_PREVIEW__ === true, undefined, { timeout: 15000 });
    await configureCyberPunkBlueStudio(page, QA_CYBER_PUNK_BLUE.name);
    await page.locator('[data-testid="character-studio-confirm"]').click();
    await page.waitForFunction(() => window.__playerLoaded === true, undefined, { timeout: 120000 });
    await page.evaluate(() => {
      window.goLocation?.("street");
    });
    await page.waitForFunction(() => window.me?.location === "street", undefined, { timeout: 30000 });
    await page.waitForTimeout(400);
    await page.evaluate(() => window.startNpcFight?.("razor"));
    await page.waitForTimeout(800);
    const snap = await page.evaluate(() => ({
      duel3d: !document.getElementById("duel3dHud")?.classList.contains("hidden"),
      fight2d: document.getElementById("fightOverlay")?.classList.contains("active"),
      duelDbg: window.World3D?.getDuelDebug?.()
    }));
    if (snap.fight2d) throw new Error("2D fightOverlay active in world3d");
    if (!snap.duel3d) throw new Error("duel3dHud not visible: " + JSON.stringify(snap));
    console.log("t209-duel-3d: PASS", snap.duelDbg);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch(e => {
  console.error("t209-duel-3d: FAIL", e.message || e);
  process.exit(1);
});