#!/usr/bin/env node
/**
 * Build dist-preview/ and verify: no prod Firebase traffic, slice playable (390×844), reload persists.
 */
const { spawnSync } = require("child_process");
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const http = require("http");

const ROOT = path.join(__dirname, "..");
const DIST = path.join(ROOT, "dist-preview");
const PROD_HOST_RE =
  /firebaseio\.com|firebasedatabase\.app|firebaseapp\.com|googleapis\.com\/.*firebase|gstatic\.com\/firebase/i;

function runBuild() {
  const r = spawnSync("node", [path.join(__dirname, "build-preview.js")], {
    cwd: ROOT,
    stdio: "inherit"
  });
  if (r.status !== 0) process.exit(r.status || 1);
}

function listDist() {
  const rows = [];
  function walk(dir, prefix = "") {
    for (const name of fs.readdirSync(dir)) {
      const rel = prefix ? `${prefix}/${name}` : name;
      const abs = path.join(dir, name);
      const st = fs.statSync(abs);
      if (st.isDirectory()) walk(abs, rel);
      else rows.push({ rel, bytes: st.size });
    }
  }
  walk(DIST);
  return rows;
}

function serveDist(port) {
  const mime = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".mjs": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".webp": "image/webp",
    ".jpg": "image/jpeg",
    ".png": "image/png",
    ".glb": "model/gltf-binary"
  };
  const handler = (req, res) => {
    let urlPath = req.url.split("?")[0];
    if (urlPath === "/") urlPath = "/index.html";
    const file = path.join(DIST, decodeURIComponent(urlPath.replace(/^\//, "")));
    if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, { "Content-Type": mime[ext] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  };
  return new Promise(resolve => {
    const srv = http.createServer(handler);
    srv.listen(port, "127.0.0.1", () => resolve(srv));
  });
}

async function dismissOverlays(page) {
  await page.evaluate(() => document.getElementById("howToOverlay")?.classList.remove("active"));
}

async function walkNear(page, tx, tz, radius = 2.6, maxMs = 90000) {
  await dismissOverlays(page);
  const canvas = page.locator("#stage3d");
  await canvas.click({ position: { x: 195, y: 300 } });
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const pos = await page.evaluate(() => window.World3D?.getPlayerWorldPosition?.());
    if (!pos) throw new Error("missing World3D.getPlayerWorldPosition");
    const dist = Math.hypot(tx - pos.x, tz - pos.z);
    if (dist <= radius) return;
    await page.evaluate(
      ({ tx, tz }) => window.World3D?.faceWorldTargetForE2e?.(tx, tz),
      { tx, tz }
    );
    await page.keyboard.down("Shift");
    await page.keyboard.down("w");
    await page.waitForTimeout(380);
    await page.keyboard.up("w");
    await page.keyboard.up("Shift");
  }
  throw new Error("walkNear timeout");
}

async function runBrowserTest(base) {
  let prodAttempts = 0;
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  page.on("pageerror", err => console.error("pageerror:", err.message));
  page.on("console", msg => {
    if (msg.type() === "error") console.error("console:", msg.text());
  });
  page.on("request", req => {
    const url = req.url();
    if (PROD_HOST_RE.test(url) && !url.includes("127.0.0.1")) {
      prodAttempts += 1;
      req.abort("blockedbyclient").catch(() => {});
    }
  });

  try {
    await page.goto(`${base}/?lifeCh1E2e=1&v=preview-build-test`, {
      waitUntil: "domcontentloaded",
      timeout: 120000
    });
    await page.waitForFunction(() => window.__PUNK_PREVIEW__ === true, undefined, { timeout: 10000 });
    await page.waitForFunction(() => typeof firebase === "undefined", undefined, { timeout: 5000 });
    await page.waitForSelector("#previewBuildBanner", { timeout: 10000 });
    const banner = await page.textContent("#previewBuildBanner");
    if (!banner.includes("PREVIEW")) throw new Error("preview banner missing");

    await page.waitForSelector(".char-pick", { timeout: 90000 });
    await page.click('.char-pick[data-id="cobalt"]');
    await page.click("#charSelectConfirm");
    await page.waitForFunction(() => window.__playerLoaded === true, undefined, { timeout: 120000 });

    await page.evaluate(async () => {
      window.me.onboarding = { step: 6, progress: {}, done: true };
      window.LifeCh1Slice?.ensureLifeCh1?.(window.me);
      await window.LifeCh1Slice?.tryStartAfterOnboarding?.();
      window.saveMe?.();
    });
    await page.waitForSelector('[data-testid="life-ch1-quest-panel"]', { timeout: 30000 });

    await dismissOverlays(page);
    const canvas = page.locator("#stage3d");
    await canvas.click({ position: { x: 195, y: 300 } });
    for (let i = 0; i < 10; i++) {
      await page.keyboard.down("w");
      await page.waitForTimeout(350);
      await page.keyboard.up("w");
      if ((await page.evaluate(() => window.me?.lifeCh1?.stepIndex ?? 0)) >= 1) break;
    }
    await page.waitForFunction(() => (window.me?.lifeCh1?.stepIndex || 0) >= 1, undefined, { timeout: 15000 });

    await walkNear(page, -3.2, 2.5);
    await page.locator("#stage3d").click({ position: { x: 195, y: 300 } });
    for (let t = 0; t < 12; t++) {
      await page.keyboard.down("e");
      await page.waitForTimeout(320);
      await page.keyboard.up("e");
      if (await page.locator('[data-testid="life-ch1-skin-A"]').isVisible().catch(() => false)) break;
    }
    await page.click('[data-testid="life-ch1-skin-A"]');
    await page.click(".life-ch1-outfit-pick >> nth=0");
    await page.click("#lifeCh1WardrobeConfirm");
    await page.waitForFunction(
      () => window.me?.lifeCh1?.stepIndex >= 2 && window.me?.lifeCh1?.flags?.outfit_calm,
      undefined,
      { timeout: 15000 }
    );

    const beforeReload = await page.evaluate(() => ({
      step: window.me?.lifeCh1?.stepIndex,
      skin: window.me?.lifeCh1?.angelinaSkin,
      coins: window.me?.coins
    }));
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => window.__playerLoaded === true, undefined, { timeout: 120000 });
    const afterReload = await page.evaluate(() => ({
      step: window.me?.lifeCh1?.stepIndex,
      skin: window.me?.lifeCh1?.angelinaSkin,
      coins: window.me?.coins,
      flags: window.me?.lifeCh1?.flags
    }));
    if (afterReload.step < beforeReload.step) throw new Error("reload regressed step: " + JSON.stringify({ beforeReload, afterReload }));
    if (!afterReload.flags?.outfit_calm) throw new Error("reload lost outfit flag");
    if (afterReload.skin !== "A") throw new Error("reload lost skin");

    const chatHidden = await page.evaluate(() => {
      const p = document.getElementById("chatPanel");
      return p?.hidden === true || getComputedStyle(p).display === "none";
    });
    if (!chatHidden) throw new Error("chat must stay off in preview");

    if (prodAttempts !== 0) {
      throw new Error(`expected 0 prod Firebase requests, saw ${prodAttempts}`);
    }
    console.log(
      "preview-build-test: PASS",
      JSON.stringify({ prodAttempts, beforeReload, afterReload, viewport: "390x844" })
    );
  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }
}

async function main() {
  runBuild();
  const files = listDist();
  const totalBytes = files.reduce((s, f) => s + f.bytes, 0);
  console.log("dist-preview listing:", files.length, "files,", totalBytes, "bytes");
  files.sort((a, b) => b.bytes - a.bytes);
  files.slice(0, 15).forEach(f => console.log(" ", f.rel, f.bytes));

  const srv = await serveDist(3765);
  try {
    await runBrowserTest("http://127.0.0.1:3765");
  } finally {
    srv.close();
  }
}

main().catch(e => {
  console.error("preview-build-test: FAIL", e);
  process.exit(1);
});
