#!/usr/bin/env node
/** Acceptance screenshots: prod room NPCs, reload, 390 chips, preview shop. */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawnSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const DIST = path.join(ROOT, "dist-preview");
const OUT = process.env.M1_CAPTURE_OUT || path.join("/opt/cursor/artifacts", "m1-fix-r7");
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

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file });
  console.log("saved", file);
}

spawnSync("node", [path.join(__dirname, "build-preview.js")], { cwd: ROOT, stdio: "inherit" });
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const prodSrv = await serveDir(ROOT, 3773);
  const prevSrv = await serveDir(DIST, 3774);
  try {
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await ctx.addInitScript(k => {
      try {
        localStorage.setItem(k, "1");
      } catch (_) {}
    }, HOWTO);
    const page = await ctx.newPage();
    await page.goto(
      "http://127.0.0.1:3773/?solo=1&lifeCh1Slice=1&lifeCh1Local=1&lifeCh1E2e=1",
      { waitUntil: "load", timeout: 120000 }
    );
    await enterSlice(page);
    await page.evaluate(() => goLocation("room"));
    await page.waitForTimeout(1200);
    const snap = await page.evaluate(() => window.World3D?.getNpcMeshVertexSnapshot?.());
    console.log("prod room verts", JSON.stringify(snap));
    await shot(page, "prod-room-first-load-1280.png");
    await page.reload({ waitUntil: "load" });
    await page.waitForFunction(() => window.__playerLoaded === true, undefined, { timeout: 120000 });
    await page.evaluate(() => goLocation("room"));
    await page.waitForTimeout(1200);
    await shot(page, "prod-room-after-reload-1280.png");
    await page.close();
    await ctx.close();

    const mctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await mctx.addInitScript(k => {
      try {
        localStorage.setItem(k, "1");
      } catch (_) {}
    }, HOWTO);
    const mpage = await mctx.newPage();
    await mpage.goto("http://127.0.0.1:3774/?lifeCh1E2e=1", { waitUntil: "load", timeout: 120000 });
    await enterSlice(mpage);
    await mpage.waitForTimeout(400);
    await shot(mpage, "preview-nav-chips-390.png");
    await mpage.evaluate(() => {
      document.getElementById("shopModal")?.classList.add("active");
      if (typeof renderShop === "function") renderShop();
    });
    await mpage.waitForTimeout(500);
    await shot(mpage, "preview-shop-390.png");
    await mpage.close();
    await mctx.close();
    await browser.close();
  } finally {
    prodSrv.close();
    prevSrv.close();
  }
})().catch(e => {
  console.error(e);
  process.exit(1);
});
