#!/usr/bin/env node
/** After live dialogue closes, world camera must resume (canvas luma > threshold). */
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
    if (!canvas) return { ok: false, reason: "no canvas" };
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!gl) return { ok: false, reason: "no gl" };
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
  const port = 8780 + Math.floor(Math.random() * 40);
  const server = serveDist(port);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await installProdFirebaseRouteBlock(page);
  try {
    await page.goto(`http://127.0.0.1:${port}/?v=t209-locks`, { waitUntil: "load", timeout: 120000 });
    await page.waitForFunction(() => window.__PUNK_PREVIEW__ === true, undefined, { timeout: 15000 });
    await configureCyberPunkBlueStudio(page, QA_CYBER_PUNK_BLUE.name);
    await page.locator('[data-testid="character-studio-confirm"]').click();
    await page.waitForFunction(() => window.__playerLoaded === true, undefined, { timeout: 120000 });
    await page.evaluate(() => window.goLocation?.("street"));
    await page.waitForFunction(() => window.me?.location === "street", undefined, { timeout: 30000 });
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      window.World3D?.engageDialogueFraming?.("razor", { live: true });
    });
    await page.waitForTimeout(400);
    await page.evaluate(() => {
      document.getElementById("storyDialog")?.classList.remove("active");
      document.getElementById("gangModal")?.classList.add("active");
      /* stale locks while gang sheet open (2D overlay must not pin 3D dialogue camera) */
    });
    await page.waitForTimeout(800);
    const afterStale = await canvasMeanLuma(page);
    if (!afterStale.ok) throw new Error(afterStale.reason);
    if (afterStale.luma < 48) {
      throw new Error(`canvas still dark after stale dialog: luma=${afterStale.luma} diag=${JSON.stringify(afterStale.diag)}`);
    }
    console.log("t209-world-render-locks: PASS", { luma: +afterStale.luma.toFixed(2), diag: afterStale.diag });
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch(e => {
  console.error("t209-world-render-locks: FAIL", e.message || e);
  process.exit(1);
});