#!/usr/bin/env node
/** City build mode canvas must stay lit after closing a live dialogue framing. */
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
    ".css": "text/css",
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

async function canvasMeanLuma(page) {
  return page.evaluate(() => {
    const canvas = document.getElementById("stage3d");
    const gl = canvas?.getContext("webgl2") || canvas?.getContext("webgl");
    if (!gl) return { ok: false };
    const w = canvas.width;
    const h = canvas.height;
    const buf = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    let sum = 0;
    const n = w * h;
    for (let i = 0; i < n; i++) {
      const o = i * 4;
      sum += buf[o] * 0.299 + buf[o + 1] * 0.587 + buf[o + 2] * 0.114;
    }
    return { ok: true, luma: sum / n, diag: window.World3D?.getRenderDiag?.() };
  });
}

async function main() {
  runBuild();
  const port = 8790 + Math.floor(Math.random() * 30);
  const server = serveDist(port);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await installProdFirebaseRouteBlock(page);
  try {
    await page.goto(`http://127.0.0.1:${port}/?v=t209-city`, { waitUntil: "load", timeout: 120000 });
    await page.waitForFunction(() => window.__PUNK_PREVIEW__ === true, undefined, { timeout: 15000 });
    await configureCyberPunkBlueStudio(page, QA_CYBER_PUNK_BLUE.name);
    await page.locator('[data-testid="character-studio-confirm"]').click();
    await page.waitForFunction(() => window.__playerLoaded === true, undefined, { timeout: 120000 });
    await page.evaluate(() => {
      const p = window.me;
      if (!p) return;
      p.onboarding = { done: true, step: 8, progress: {} };
      p.inventory = p.inventory || { materials: { crypt: 3 }, spells: [] };
      p.cityBuilds = [];
      window.goLocation?.("city");
      window.saveMe?.();
    });
    await page.waitForFunction(() => window.me?.location === "city", undefined, { timeout: 30000 });
    await page.waitForTimeout(600);
    await page.evaluate(() => window.World3D?.engageDialogueFraming?.("tony", { live: true }));
    await page.waitForTimeout(350);
    await page.evaluate(() => {
      document.getElementById("storyDialog")?.classList.remove("active");
    });
    await page.waitForTimeout(500);
    await page.evaluate(() => window.toggleBuildMode?.());
    await page.waitForTimeout(400);
    await page.evaluate(() => window.World3D?.renderCaptureFrame?.());
    const snap = await canvasMeanLuma(page);
    if (!snap.ok || snap.luma < 48) {
      throw new Error(`city build canvas dark: luma=${snap.luma} diag=${JSON.stringify(snap.diag)}`);
    }
    console.log("t209-city-build-luma: PASS", { luma: +snap.luma.toFixed(2), diag: snap.diag });
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch(e => {
  console.error("t209-city-build-luma: FAIL", e.message || e);
  process.exit(1);
});