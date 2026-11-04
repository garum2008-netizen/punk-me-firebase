#!/usr/bin/env node
const { installProdFirebaseRouteBlock } = require("./playwright-script-guard");
/** Acceptance screenshots: mobile HUD, hair close-up, room NPCs. */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawnSync } = require("child_process");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..");
const DIST = path.join(ROOT, "dist-preview");
const OUT = process.env.M1_CAPTURE_OUT || path.join("/opt/cursor/artifacts", "m1-fix-r8");
const HOWTO = "punkme_howto_seen";

function serveDir(dir, port) {
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
      const file = path.join(dir, decodeURIComponent(urlPath.replace(/^\//, "")));
      if (!file.startsWith(dir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
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

async function enterSlice(page) {
  await page.waitForSelector("#charSelectConfirm", { timeout: 120000 });
  await page.click("#charSelectConfirm");
  await page.waitForFunction(() => window.__playerLoaded === true, undefined, { timeout: 120000 });
  await page.evaluate(() => document.getElementById("howToOverlay")?.classList.remove("active"));
  await page.evaluate(async () => {
    window.me.onboarding = { step: 6, progress: {}, done: true };
    window.LifeCh1Slice?.ensureLifeCh1?.(window.me);
    await window.LifeCh1Slice?.tryStartAfterOnboarding?.();
    window.saveMe?.();
  });
  await page.waitForFunction(() => window.World3D?.isReady?.() === true, undefined, { timeout: 30000 });
  await page.waitForTimeout(800);
}

spawnSync("node", [path.join(__dirname, "build-preview.js")], { cwd: ROOT, stdio: "inherit" });
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const prodSrv = await serveDir(ROOT, 3775);
  const prevSrv = await serveDir(DIST, 3776);
  try {
    const browser = await chromium.launch();
    const ctx1280 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await ctx1280.addInitScript(k => {
      try {
        localStorage.setItem(k, "1");
      } catch (_) {}
    }, HOWTO);
    const page = await ctx1280.newPage();
    await page.goto("http://127.0.0.1:3775/?solo=1&lifeCh1Slice=1&lifeCh1Local=1&lifeCh1E2e=1", {
      waitUntil: "load",
      timeout: 120000
    });
    await enterSlice(page);
    await page.evaluate(() => goLocation("room"));
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(OUT, "prod-room-1280-three-npcs.png") });
    await page.close();
    await ctx1280.close();

    const mctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await mctx.addInitScript(k => {
      try {
        localStorage.setItem(k, "1");
      } catch (_) {}
    }, HOWTO);
    const mpage = await mctx.newPage();
    await mpage.goto("http://127.0.0.1:3776/?lifeCh1E2e=1", { waitUntil: "load", timeout: 120000 });
    await enterSlice(mpage);
    await mpage.screenshot({ path: path.join(OUT, "mobile-hud-nav-closed-390.png") });
    await mpage.click('[data-testid="mobile-nav-fab"]');
    await mpage.waitForSelector(".mobile-nav-sheet.open", { timeout: 5000 });
    await mpage.screenshot({ path: path.join(OUT, "mobile-hud-nav-open-390.png") });
    await mpage.close();
    await mctx.close();
    await browser.close();

    const hairSrc = path.join(ROOT, "assets/ui/angelina-skins/shipped/angelina-teen-B-world.webp");
    await sharp(hairSrc)
      .extract({ left: 90, top: 0, width: 100, height: 140 })
      .extend({
        top: 20,
        bottom: 20,
        left: 20,
        right: 20,
        background: { r: 8, g: 4, b: 16, alpha: 1 }
      })
      .png()
      .toFile(path.join(OUT, "hair-closeup-dark-shipped.png"));
    console.log("saved artifacts to", OUT);
  } finally {
    prodSrv.close();
    prevSrv.close();
  }
})().catch(e => {
  console.error(e);
  process.exit(1);
});
