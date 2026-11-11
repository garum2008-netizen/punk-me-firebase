#!/usr/bin/env node
const { installProdFirebaseRouteBlock } = require("./playwright-script-guard");
/** M1 audit after-screenshots (1280×800 + 390×844). Dismisses How-to first. */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const http = require("http");
const { spawnSync } = require("child_process");

const ROOT = path.join(__dirname, "..");
const DIST = path.join(ROOT, "dist-preview");
const PORT = Number(process.env.M1_CAPTURE_PORT) || 3768;
const OUT = process.env.M1_CAPTURE_OUT || path.join("/opt/cursor/artifacts", "m1-after");
const HOWTO = "punkme_howto_seen";

function serveDist(port) {
  const mime = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".mjs": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".webp": "image/webp",
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
  await page.waitForTimeout(200);
}

async function enterSlice(page) {
  await page.waitForSelector("#charSelectConfirm", { timeout: 120000 });
  const slice = await page.locator('[data-testid="char-select-angelina"]').isVisible().catch(() => false);
  if (!slice) await page.click('.char-pick[data-id="cobalt"]');
  await page.click("#charSelectConfirm");
  await page.waitForFunction(() => window.__playerLoaded === true, undefined, { timeout: 120000 });
  await dismissHowTo(page);
  await page.evaluate(async () => {
    window.me.onboarding = { step: 6, progress: {}, done: true };
    window.LifeCh1Slice?.ensureLifeCh1?.(window.me);
    await window.LifeCh1Slice?.tryStartAfterOnboarding?.();
    window.saveMe?.();
  });
  await page.waitForSelector('[data-testid="life-ch1-quest-panel"]', { timeout: 30000 });
}

async function shot(page, name) {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, fullPage: false });
  console.log("saved", file);
}

async function runViewport(viewport, tag) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport });
  await context.addInitScript(key => {
    try {
      localStorage.setItem(key, "1");
    } catch (_) {}
  }, HOWTO);
  const page = await context.newPage();
  try {
    await page.goto(`http://127.0.0.1:${PORT}/?lifeCh1E2e=1`, { waitUntil: "load", timeout: 120000 });
    await page.waitForFunction(() => window.__PUNK_PREVIEW__ === true, undefined, { timeout: 15000 });

    await page.waitForSelector("#charSelect.active", { timeout: 5000 }).catch(() => {});
    if (await page.locator("#charSelect.active").isVisible().catch(() => false)) {
      await shot(page, `${tag}-01-char-select.png`);
    }

    await enterSlice(page);
    await page.waitForTimeout(400);
    await shot(page, `${tag}-02-room.png`);

    await page.evaluate(() => goLocation("street"));
    await page.waitForFunction(() => window.me?.location === "street", undefined, { timeout: 20000 });
    await page.waitForTimeout(500);
    await shot(page, `${tag}-03-street.png`);

    await page.evaluate(() => goLocation("city"));
    await page.waitForFunction(() => window.me?.location === "city", undefined, { timeout: 20000 });
    await page.waitForTimeout(500);
    await shot(page, `${tag}-04-city.png`);

    if (tag.startsWith("390")) {
      await shot(page, `${tag}-05-mobile-hud.png`);
    }

    await page.evaluate(() => openModal("shopModal"));
    await page.waitForTimeout(300);
    await shot(page, `${tag}-06-shop.png`);
    await page.evaluate(() => closeModal("shopModal"));

    await page.evaluate(async () => {
      const st = window.me.lifeCh1;
      if (!st) return;
      st.stepIndex = 4;
      st.completed = true;
      st.active = false;
      window.LifeCh1Slice?.renderObjectivePanel?.();
    });
    await page.waitForTimeout(200);
    await shot(page, `${tag}-07-ch1-complete.png`);
  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }
}

function main() {
  spawnSync("node", [path.join(__dirname, "build-preview.js")], { cwd: ROOT, stdio: "inherit" });
  fs.mkdirSync(OUT, { recursive: true });
}

main();

(async () => {
  const srv = await serveDist(PORT);
  try {
    await runViewport({ width: 1280, height: 800 }, "1280");
    await runViewport({ width: 390, height: 844 }, "390");
    console.log("capture-m1-audit: OK", OUT);
  } finally {
    srv.close();
  }
})().catch(e => {
  console.error("capture-m1-audit: FAIL", e);
  process.exit(1);
});
