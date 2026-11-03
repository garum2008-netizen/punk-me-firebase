#!/usr/bin/env node
/**
 * Build dist-preview/ and verify: no prod Firebase traffic, slice playable (390×844), reload persists.
 */
const { spawnSync } = require("child_process");
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const http = require("http");
const { isProdFirebaseRequest } = require("./firebase-prod-guard");
const {
  waitUntilSkinRendered,
  assertSkinRenderNow,
  assertSkinAfterReloadSchedule
} = require("./life-ch1-skin-render-assert");

const ROOT = path.join(__dirname, "..");
const DIST = path.join(ROOT, "dist-preview");
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

const PROD_HOST_RE =
  /(?:firebaseio\.com|firebasedatabase\.app|firebaseapp\.com|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com|AIzaSy)/i;

function isProdFirebaseUrl(url) {
  return isProdFirebaseRequest(url);
}

function assertBundleNoProdSecrets() {
  const hits = [];
  function walk(dir) {
    for (const name of fs.readdirSync(dir)) {
      const abs = path.join(dir, name);
      if (fs.statSync(abs).isDirectory()) walk(abs);
      else if (/\.(js|html|json|mjs)$/i.test(name)) {
        const txt = fs.readFileSync(abs, "utf8");
        if (/AIzaSy|firebaseapp\.com|firebasedatabase\.app/.test(txt)) {
          hits.push(path.relative(DIST, abs));
        }
      }
    }
  }
  walk(DIST);
  if (hits.length) throw new Error("prod firebase strings in dist-preview: " + hits.join(", "));
  if (fs.existsSync(path.join(DIST, "js/owner-admin.mjs"))) {
    throw new Error("owner-admin.mjs must not ship in preview");
  }
  if (fs.existsSync(path.join(DIST, "functions"))) {
    throw new Error("dist-preview must not contain functions/ (use repo-root functions/ on deploy)");
  }
  const headers = fs.readFileSync(path.join(DIST, "_headers"), "utf8");
  if (!/X-Robots-Tag:\s*noindex/i.test(headers)) {
    throw new Error("_headers must set X-Robots-Tag noindex");
  }
  console.log("preview-bundle-secrets: PASS (0 prod config hits)");
}

async function dismissHowToPlay(page) {
  await page.evaluate(() => {
    try {
      localStorage.setItem("punkme_howto_seen", "1");
    } catch (_) {}
  });
  const close = page.locator(".howto-close");
  if (await close.isVisible({ timeout: 2500 }).catch(() => false)) await close.click();
  await page.waitForFunction(
    () => !document.getElementById("howToOverlay")?.classList.contains("active"),
    undefined,
    { timeout: 8000 }
  );
}

async function dismissOverlays(page) {
  await dismissHowToPlay(page);
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
  const consoleErrors = [];
  page.on("pageerror", err => consoleErrors.push(String(err)));
  page.on("console", msg => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  await page.route("**/*", route => {
    const url = route.request().url();
    const rt = route.request().resourceType();
    if (isProdFirebaseRequest(url) || (rt === "websocket" && isProdFirebaseRequest(url))) {
      prodAttempts += 1;
      return route.abort();
    }
    return route.continue();
  });

  try {
    await page.goto(`${base}/?lifeCh1E2e=1&v=preview-build-test`, {
      waitUntil: "load",
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
    await waitUntilSkinRendered(page, "A");

    const beforeReload = await page.evaluate(() => ({
      coins: window.me.coins,
      step: window.me?.lifeCh1?.stepIndex,
      skin: window.me?.lifeCh1?.angelinaSkin
    }));
    const coinsAfterWardrobe = beforeReload.coins;
    for (let r = 0; r < 3; r++) {
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => window.__playerLoaded === true, undefined, { timeout: 120000 });
      await dismissHowToPlay(page);
      const coins = await page.evaluate(() => window.me.coins);
      if (coins !== coinsAfterWardrobe) {
        throw new Error(`preview coins reset reload ${r + 1}: ${coinsAfterWardrobe} -> ${coins}`);
      }
      const skin = await page.evaluate(() => window.me?.lifeCh1?.angelinaSkin);
      if (skin !== "A") throw new Error("reload lost skin " + skin);
      await assertSkinAfterReloadSchedule(page, "A");
      await walkNear(page, -3.2, 2.5);
      await assertSkinRenderNow(page, "A", `preview after walk reload ${r + 1}`);
    }

    const afterReload = await page.evaluate(() => ({
      step: window.me?.lifeCh1?.stepIndex,
      skin: window.me?.lifeCh1?.angelinaSkin,
      coins: window.me?.coins,
      flags: window.me?.lifeCh1?.flags
    }));
    if (afterReload.step < 2) throw new Error("reload regressed step: " + JSON.stringify(afterReload));
    if (!afterReload.flags?.outfit_calm) throw new Error("reload lost outfit flag");
    if (afterReload.skin !== "A") throw new Error("reload lost skin");

    const chatHidden = await page.evaluate(() => {
      const p = document.getElementById("chatPanel");
      return p?.hidden === true || getComputedStyle(p).display === "none";
    });
    if (!chatHidden) throw new Error("chat must stay off in preview");

    const travelErrorsBefore = consoleErrors.length;
    await page.evaluate(() => {
      if (window.me.location !== "room") goLocation("room");
    });
    await page.waitForFunction(() => window.me?.location === "room", undefined, { timeout: 15000 });
    const roomLoc = await page.evaluate(() => window.me?.location);
    await page.evaluate(() => goLocation("street"));
    await page.waitForFunction(() => window.me?.location === "street", undefined, { timeout: 15000 });
    const streetLoc = await page.evaluate(() => window.me?.location);
    const cemeteryClick = await page.evaluate(() => {
      const nav = document.getElementById("navQuick");
      const btn = nav?.querySelector('button[onclick*="cemetery"]');
      if (!btn) {
        return { ok: false, html: nav?.innerHTML?.slice(0, 400) || "" };
      }
      btn.click();
      return { ok: true, label: btn.textContent || "" };
    });
    if (!cemeteryClick.ok) {
      throw new Error("preview cemetery nav button missing: " + JSON.stringify(cemeteryClick));
    }
    await page.waitForFunction(() => window.me?.location === "cemetery", undefined, { timeout: 15000 });
    const cemeteryScene = await page.evaluate(() => ({
      meLoc: window.me?.location,
      w3Loc: window.World3D?.countVisiblePropsInScene?.()?.location || null
    }));
    if (cemeteryScene.meLoc !== "cemetery") {
      throw new Error("preview cemetery travel failed me.location: " + JSON.stringify(cemeteryScene));
    }
    if (cemeteryScene.w3Loc !== "cemetery") {
      throw new Error("preview cemetery 3D scene mismatch: " + JSON.stringify(cemeteryScene));
    }
    if (streetLoc !== "street" || roomLoc !== "room") {
      throw new Error(`preview travel path bad room=${roomLoc} street=${streetLoc}`);
    }
    const travelErrors = consoleErrors.slice(travelErrorsBefore);
    if (travelErrors.length) {
      throw new Error("console errors during preview travel: " + travelErrors.join(" | "));
    }
    console.log("preview-cemetery-travel: PASS", JSON.stringify(cemeteryScene));

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
  assertBundleNoProdSecrets();
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
