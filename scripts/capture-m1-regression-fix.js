#!/usr/bin/env node
const { installProdFirebaseRouteBlock } = require("./playwright-script-guard");
/** Evidence shots after prod regression fixes. */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawnSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const DIST = path.join(ROOT, "dist-preview");
const OUT = process.env.M1_CAPTURE_OUT || path.join("/opt/cursor/artifacts", "m1-fix");
const PORT = Number(process.env.M1_CAPTURE_PORT) || 3770;
const HOWTO = "punkme_howto_seen";

function serveDist(port) {
  const mime = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".mjs": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".webp": "image/webp",
    ".jpg": "image/jpeg",
    ".glb": "model/gltf-binary"
  };
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
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
    });
    srv.listen(port, "127.0.0.1", () => resolve(srv));
  });
}

async function dismissHowTo(page) {
  await page.evaluate(() => document.getElementById("howToOverlay")?.classList.remove("active"));
}

async function enterSlice(page) {
  await page.waitForSelector("#charSelectConfirm", { timeout: 120000 });
  await page.click("#charSelectConfirm");
  await page.waitForFunction(() => window.__playerLoaded === true, undefined, { timeout: 120000 });
  await dismissHowTo(page);
  await page.evaluate(async () => {
    window.me.onboarding = { step: 6, progress: {}, done: true };
    window.LifeCh1Slice?.ensureLifeCh1?.(window.me);
    await window.LifeCh1Slice?.tryStartAfterOnboarding?.();
    window.saveMe?.();
  });
  await page.waitForTimeout(600);
}

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file });
  console.log("saved", file);
}

spawnSync("node", [path.join(__dirname, "build-preview.js")], { cwd: ROOT, stdio: "inherit" });
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const srv = await serveDist(PORT);
  const base = `http://127.0.0.1:${PORT}`;
  try {
    const browser = await chromium.launch();
    const ctx1280 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await ctx1280.addInitScript(k => {
      try {
        localStorage.setItem(k, "1");
      } catch (_) {}
    }, HOWTO);
    const page = await ctx1280.newPage();
    await page.goto(`${base}/?lifeCh1E2e=1`, { waitUntil: "load", timeout: 120000 });
    await enterSlice(page);
    await page.evaluate(() => goLocation("room"));
    await page.waitForTimeout(900);
    await shot(page, "room-three-npcs-1280.png");
    await page.evaluate(() => goLocation("street"));
    await page.waitForFunction(() => window.me?.location === "street", undefined, { timeout: 20000 });
    await page.waitForTimeout(900);
    await shot(page, "street-mohawk-cobalt-1280.png");
    await page.evaluate(() => openModal("shopModal"));
    await page.waitForTimeout(400);
    await shot(page, "shop-imagine-icons-1280.png");
    await page.evaluate(() => closeModal("shopModal"));
    await page.close();
    await ctx1280.close();

    const ctx390 = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await ctx390.addInitScript(k => {
      try {
        localStorage.setItem(k, "1");
      } catch (_) {}
    }, HOWTO);
    const m = await ctx390.newPage();
    await m.goto(`${base}/?lifeCh1E2e=1`, { waitUntil: "load", timeout: 120000 });
    await enterSlice(m);
    await m.evaluate(() => goLocation("kitchen"));
    await m.waitForFunction(() => window.me?.location === "kitchen", undefined, { timeout: 20000 });
    await m.waitForTimeout(700);
    await shot(m, "kitchen-framing-390.png");
    await m.close();
    await ctx390.close();
    await browser.close();

    spawnSync(
      "python3",
      [
        path.join(__dirname, "capture-angelina-alpha-zooms.py"),
        "--out",
        OUT
      ],
      { cwd: ROOT, stdio: "inherit" }
    );
    console.log("capture-m1-regression-fix: OK", OUT);
  } finally {
    srv.close();
  }
})().catch(e => {
  console.error(e);
  process.exit(1);
});
