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
  assertFirebaseEmulatorTestEnv,
  installProdFirebaseRouteBlock
} = require("./firebase-test-emulator-guard");
const {
  waitUntilSkinRendered,
  assertSkinRenderNow,
  assertSkinAfterReloadSchedule
} = require("./life-ch1-skin-render-assert");

assertFirebaseEmulatorTestEnv();

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

async function assertSkinAtLocation(page, loc, skinLetter, label) {
  await page.evaluate(id => goLocation(id), loc);
  await page.waitForFunction(l => window.me?.location === l, loc, { timeout: 20000 });
  await page.waitForTimeout(700);
  await clickStage3d(page);
  await assertSkinRenderNow(page, skinLetter, label);
  if (loc === "kitchen") {
    const frame = await page.evaluate(() => window.World3D?.getShowcaseScreenProjection?.());
    if (!frame?.ok || frame.location !== "kitchen") {
      throw new Error(`kitchen framing: bad projection ${JSON.stringify(frame)}`);
    }
    const footY = frame.hero?.y;
    const footX = frame.hero?.x;
    const headY = frame.heroHead?.y;
    if (footY == null || footX == null || headY == null) {
      throw new Error(`kitchen framing: missing hero projection ${JSON.stringify(frame)}`);
    }
    if (footY > 562) {
      throw new Error(`kitchen framing: feet under joystick band y=${footY} ${JSON.stringify(frame)}`);
    }
    if (footX < 132) {
      throw new Error(`kitchen framing: hero overlaps joystick x=${footX}`);
    }
    if (headY < 90) {
      throw new Error(`kitchen framing: head too low y=${headY}`);
    }
    console.log("preview-kitchen-framing: PASS", JSON.stringify({ footX, footY, headY }));
  }
}

async function assertNpcsVisible(page, loc, expectedIds) {
  await page.evaluate(id => goLocation(id), loc);
  await page.waitForFunction(l => window.me?.location === l, loc, { timeout: 20000 });
  await page.waitForTimeout(900);
  const snap = await page.evaluate(() => window.World3D?.getNpcVisibilitySnapshot?.() || []);
  const visible = new Set(snap.filter(n => n.visible).map(n => n.id));
  const missing = expectedIds.filter(id => !visible.has(id));
  if (missing.length) {
    throw new Error(`NPC missing at ${loc}: ${missing.join(", ")} among ${JSON.stringify(snap)}`);
  }
}

const HOWTO_SEEN_KEY = "punkme_howto_seen";

async function dismissHowToPlay(page) {
  await page.evaluate(key => {
    try {
      localStorage.setItem(key, "1");
    } catch (_) {}
  }, HOWTO_SEEN_KEY);
  await page.waitForTimeout(1000);
  const overlayIdle = () =>
    page.waitForFunction(
      () => {
        const ov = document.getElementById("howToOverlay");
        return !ov || !ov.classList.contains("active");
      },
      undefined,
      { timeout: 3000, polling: 150 }
    );

  if (await overlayIdle().catch(() => false)) return;

  const close = page.locator(".howto-close");
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    if (await overlayIdle().catch(() => false)) return;
    if (await close.isVisible({ timeout: 1200 }).catch(() => false)) {
      await close.click({ timeout: 8000, force: false }).catch(() => {});
      await page.waitForTimeout(250);
      if (await overlayIdle().catch(() => false)) return;
    }
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(350);
  }
  await page.waitForFunction(
    () => {
      const ov = document.getElementById("howToOverlay");
      return !ov || !ov.classList.contains("active");
    },
    undefined,
    { timeout: 15000, polling: 200 }
  );
}

async function dismissOverlays(page) {
  await dismissHowToPlay(page);
}

async function clickStage3d(page, position = { x: 195, y: 300 }) {
  await dismissOverlays(page);
  await page.waitForFunction(
    () => {
      const ov = document.getElementById("howToOverlay");
      return !ov?.classList.contains("active");
    },
    undefined,
    { timeout: 15000, polling: 150 }
  );
  await page.locator("#stage3d").click({ position });
}

async function walkNear(page, tx, tz, radius = 2.6, maxMs = 90000) {
  await clickStage3d(page);
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

async function testHowToOverlayFreshProfile(base) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await installProdFirebaseRouteBlock(page);
  try {
    await page.goto(`${base}/?solo=1&v=howto-fresh-test`, { waitUntil: "load", timeout: 120000 });
    await page.waitForFunction(() => window.__PUNK_PREVIEW__ === true, undefined, { timeout: 15000 });
    await page.evaluate(key => {
      try {
        localStorage.removeItem(key);
      } catch (_) {}
    }, HOWTO_SEEN_KEY);
    await page.reload({ waitUntil: "load" });
    await page.waitForFunction(() => window.__PUNK_PREVIEW__ === true, undefined, { timeout: 15000 });
    await page.waitForSelector('[data-testid="char-select-angelina"], #charSelectConfirm', { timeout: 90000 });
    const sliceChar = await page.locator('[data-testid="char-select-angelina"]').isVisible().catch(() => false);
    if (!sliceChar) {
      await page.click('.char-pick[data-id="cobalt"]');
    }
    await page.click("#charSelectConfirm");
    await page.waitForFunction(() => window.__playerLoaded === true, undefined, { timeout: 120000 });
    await page.waitForSelector("#howToOverlay.active", { timeout: 10000 });
    await page.locator(".howto-close").click();
    await page.waitForFunction(
      () => !document.getElementById("howToOverlay")?.classList.contains("active"),
      undefined,
      { timeout: 8000 }
    );
    console.log("preview-howto-fresh-profile: PASS");
  } finally {
    await page.close();
    await context.close();
    await browser.close();
  }
}

async function runBrowserTest(base) {
  let prodAttempts = 0;
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(key => {
    try {
      localStorage.setItem(key, "1");
    } catch (_) {}
  }, HOWTO_SEEN_KEY);
  const page = await context.newPage();
  await installProdFirebaseRouteBlock(page);
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

    await page.waitForSelector('[data-testid="char-select-angelina"], #charSelectConfirm', { timeout: 90000 });
    const sliceChar = await page.locator('[data-testid="char-select-angelina"]').isVisible().catch(() => false);
    if (!sliceChar) {
      await page.click('.char-pick[data-id="cobalt"]');
    }
    await page.click("#charSelectConfirm");
    const tConfirm = Date.now();
    await page.waitForFunction(() => window.__playerLoaded === true, undefined, { timeout: 120000 });
    const msToPlayer = Date.now() - tConfirm;
    if (msToPlayer > 4000) {
      throw new Error(`time-to-player after confirm ${msToPlayer}ms (max 4000)`);
    }
    const jumpVisible = await page.locator("#touchJump").isVisible();
    if (!jumpVisible) throw new Error("touch jump button not visible on 390 viewport");

    await page.evaluate(async () => {
      window.me.onboarding = { step: 6, progress: {}, done: true };
      window.LifeCh1Slice?.ensureLifeCh1?.(window.me);
      await window.LifeCh1Slice?.tryStartAfterOnboarding?.();
      window.saveMe?.();
    });
    await page.waitForSelector('[data-testid="life-ch1-quest-panel"]', { timeout: 30000 });

    await dismissOverlays(page);
    await clickStage3d(page);
    for (let i = 0; i < 10; i++) {
      await page.keyboard.down("w");
      await page.waitForTimeout(350);
      await page.keyboard.up("w");
      if ((await page.evaluate(() => window.me?.lifeCh1?.stepIndex ?? 0)) >= 1) break;
    }
    await page.waitForFunction(() => (window.me?.lifeCh1?.stepIndex || 0) >= 1, undefined, { timeout: 15000 });

    await walkNear(page, -3.2, 2.5);
    await clickStage3d(page);
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

    await assertSkinAtLocation(page, "room", "A", "room after wardrobe");
    await assertNpcsVisible(page, "room", ["vienna", "mohawk", "cobalt"]);
    await assertSkinAtLocation(page, "kitchen", "A", "kitchen mobile framing");
    await assertSkinAtLocation(page, "street", "A", "street");
    await assertNpcsVisible(page, "street", ["razor", "vienna", "cobalt", "mohawk"]);
    await assertSkinAtLocation(page, "cemetery", "A", "cemetery");
    await assertSkinAtLocation(page, "city", "A", "city");
    await assertSkinAtLocation(page, "room", "A", "room return");

    await page.evaluate(() => window.LifeCh1Slice?.setAngelinaSkin?.("B"));
    await waitUntilSkinRendered(page, "B");
    await assertSkinAtLocation(page, "street", "B", "street after skin B");

    const npcAngelinaUi = await page.evaluate(() => {
      const slice = window.LifeCh1Slice?.isLifeCh1SliceEnabled?.();
      if (!slice) return { ok: true };
      const bad = [];
      const q = document.getElementById("questBox");
      const qt = q?.textContent || "";
      if (/Поговори с Ангелиной/i.test(qt)) bad.push("quest:" + qt.slice(0, 80));
      if (/Довериться Ангелине/i.test(qt)) bad.push("quest-trust");
      const charBtn = document.querySelector('[data-i18n="char_change_btn"]');
      if (charBtn && getComputedStyle(charBtn).display !== "none") bad.push("char_change visible");
      const defBtn = document.getElementById("lifeCh1WardrobeDefault");
      if (defBtn && !defBtn.hidden && getComputedStyle(defBtn).display !== "none") bad.push("wardrobe-default visible");
      return { ok: bad.length === 0, bad };
    });
    if (!npcAngelinaUi.ok) {
      throw new Error("slice Angelina player UI: " + JSON.stringify(npcAngelinaUi));
    }

    const beforeReload = await page.evaluate(() => ({
      coins: window.me.coins,
      step: window.me?.lifeCh1?.stepIndex,
      skin: window.me?.lifeCh1?.angelinaSkin
    }));
    const coinsAfterWardrobe = beforeReload.coins;
    const skinAfterTour = beforeReload.skin || "A";
    for (let r = 0; r < 3; r++) {
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => window.__playerLoaded === true, undefined, { timeout: 120000 });
      await dismissHowToPlay(page);
      const coins = await page.evaluate(() => window.me.coins);
      if (coins !== coinsAfterWardrobe) {
        throw new Error(`preview coins reset reload ${r + 1}: ${coinsAfterWardrobe} -> ${coins}`);
      }
      const skin = await page.evaluate(() => window.me?.lifeCh1?.angelinaSkin);
      if (skin !== skinAfterTour) throw new Error("reload lost skin " + skin + " expected " + skinAfterTour);
      await assertSkinAfterReloadSchedule(page, skinAfterTour);
      await walkNear(page, -3.2, 2.5);
      await assertSkinRenderNow(page, skinAfterTour, `preview after walk reload ${r + 1}`);
    }

    const afterReload = await page.evaluate(() => ({
      step: window.me?.lifeCh1?.stepIndex,
      skin: window.me?.lifeCh1?.angelinaSkin,
      coins: window.me?.coins,
      flags: window.me?.lifeCh1?.flags
    }));
    if (afterReload.step < 2) throw new Error("reload regressed step: " + JSON.stringify(afterReload));
    if (!afterReload.flags?.outfit_calm) throw new Error("reload lost outfit flag");
    if (afterReload.skin !== skinAfterTour) throw new Error("reload lost skin");

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
    await page.evaluate(() => goLocation("cemetery"));
    await page.waitForFunction(() => window.me?.location === "cemetery", undefined, { timeout: 15000 });
    await page.waitForTimeout(600);
    await assertSkinRenderNow(page, skinAfterTour, "cemetery travel path");
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

    const cityBuildErrorsBefore = consoleErrors.length;
    await page.evaluate(() => {
      goLocation("city");
      window.me.inventory = window.me.inventory || { materials: {}, spells: [] };
      window.me.inventory.materials = window.me.inventory.materials || {};
      window.me.inventory.materials.crypt = 2;
      window.me.inventory.materials.neon_sign = 2;
      window.setBuildType("crypt");
      window.tryPlaceBuild(42, 55);
      window.setBuildType("neon_sign");
      window.tryPlaceBuild(58, 62);
    });
    const placed = await page.evaluate(() => ({
      saved: window.me?.cityBuilds?.length || 0,
      rendered: document.querySelectorAll("#buildLayer .build-piece").length
    }));
    if (placed.saved < 2 || placed.rendered < 2) {
      throw new Error("preview city builds not placed: " + JSON.stringify(placed));
    }
    await page.reload({ waitUntil: "load" });
    await page.waitForFunction(() => window.__playerLoaded === true, undefined, { timeout: 120000 });
    await dismissHowToPlay(page);
    await page.evaluate(() => {
      goLocation("street");
      goLocation("city");
    });
    await page.waitForFunction(() => window.me?.location === "city", undefined, { timeout: 15000 });
    const afterCityReturn = await page.evaluate(() => ({
      saved: window.me?.cityBuilds?.length || 0,
      rendered: document.querySelectorAll("#buildLayer .build-piece").length
    }));
    if (afterCityReturn.saved < 2 || afterCityReturn.rendered < 2) {
      throw new Error("preview city builds missing after reload/travel: " + JSON.stringify(afterCityReturn));
    }
    const cityBuildErrors = consoleErrors.slice(cityBuildErrorsBefore);
    if (cityBuildErrors.length) {
      throw new Error("console errors during city build e2e: " + cityBuildErrors.join(" | "));
    }
    console.log("preview-city-builds-persist: PASS", JSON.stringify(afterCityReturn));

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

async function testTimeToPlayer1280(base) {
  const samples = [];
  for (let run = 1; run <= 3; run++) {
    const browser = await chromium.launch();
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await context.addInitScript(key => {
      try {
        localStorage.setItem(key, "1");
      } catch (_) {}
    }, HOWTO_SEEN_KEY);
    const page = await context.newPage();
  await installProdFirebaseRouteBlock(page);
    try {
      await page.goto(`${base}/?lifeCh1E2e=1&v=ttp-1280-${run}`, { waitUntil: "load", timeout: 120000 });
      await page.waitForSelector('[data-testid="char-select-angelina"], #charSelectConfirm', { timeout: 90000 });
      const t0 = Date.now();
      await page.click("#charSelectConfirm");
      await page.waitForFunction(() => window.__playerLoaded === true, undefined, { timeout: 120000 });
      samples.push(Date.now() - t0);
    } finally {
      await page.close();
      await context.close();
      await browser.close();
    }
  }
  samples.sort((a, b) => a - b);
  const ms = samples[1];
  if (ms > 4000) throw new Error(`1280 time-to-player median ${ms}ms (max 4000), samples=${samples.join(",")}`);
  console.log("preview-time-to-player-1280: PASS", { medianMs: ms, samples });
}

async function testMobileHud390(base) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(key => {
    try {
      localStorage.setItem(key, "1");
    } catch (_) {}
  }, HOWTO_SEEN_KEY);
  const page = await context.newPage();
  await installProdFirebaseRouteBlock(page);
  try {
    await page.goto(`${base}/?lifeCh1E2e=1`, { waitUntil: "load", timeout: 120000 });
    await page.waitForFunction(() => window.__PUNK_PREVIEW__ === true, undefined, { timeout: 15000 });
    await page.waitForSelector('[data-testid="char-select-angelina"], #charSelectConfirm', { timeout: 90000 });
    await page.click("#charSelectConfirm");
    await page.waitForFunction(() => window.__playerLoaded === true, undefined, { timeout: 120000 });

    const closed = await page.evaluate(() => {
      function rectsOverlap(a, b) {
        return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      }
      const zones = ["touchJoystick", "touchJump", "touchInteract"]
        .map(id => document.getElementById(id))
        .filter(Boolean)
        .map(el => el.getBoundingClientRect());
      const hud = document.querySelector(".hud-column")?.getBoundingClientRect();
      const banner = document.getElementById("previewBuildBanner")?.getBoundingClientRect();
      const navQuick = document.getElementById("navQuick");
      const navHidden = !navQuick || getComputedStyle(navQuick).display === "none" || !navQuick.querySelector("button");
      const fab = document.getElementById("mobileNavFab");
      const fabRect = fab?.getBoundingClientRect();
      const fabOverlap = fabRect && zones.some(z => rectsOverlap(fabRect, z));
      const hudOverlap = fabRect && hud && rectsOverlap(fabRect, hud);
      const bannerOverlap = fabRect && banner && rectsOverlap(fabRect, banner);
      const dock = document.getElementById("dockScrollRow");
      const panel = document.getElementById("panelBottom");
      let mapBtn = panel?.querySelector('button[onclick*="mapModal"]');
      if (dock && mapBtn) {
        dock.scrollLeft = 0;
        for (let i = 0; i < 32; i++) {
          const r = mapBtn.getBoundingClientRect();
          if (r.left >= 0 && r.right <= window.innerWidth + 1) break;
          dock.scrollLeft += 16;
        }
      }
      mapBtn = panel?.querySelector('button[onclick*="mapModal"]');
      const firstBtn = panel?.querySelector("button");
      const firstRect = firstBtn?.getBoundingClientRect();
      const firstVisible = firstRect && firstRect.left >= 0 && firstRect.right <= window.innerWidth + 1;
      const mapRect = mapBtn?.getBoundingClientRect();
      const mapReachable = mapRect && mapRect.left >= 0 && mapRect.right <= window.innerWidth + 1;
      const gangBtn = panel?.querySelector('button[onclick*="gangModal"]');
      const gangRect = gangBtn?.getBoundingClientRect();
      const gangReachable = gangRect && gangRect.left >= 0 && gangRect.right <= window.innerWidth + 1;
      return {
        navHidden,
        fabOverlap,
        hudOverlap,
        bannerOverlap,
        fabH: fabRect?.height || 0,
        fabW: fabRect?.width || 0,
        firstVisible,
        mapReachable,
        gangReachable
      };
    });
    if (!closed.navHidden) throw new Error("navQuick chips must be hidden on mobile: " + JSON.stringify(closed));
    if (closed.fabOverlap) throw new Error("mobile nav fab overlaps controls/dialogue");
    if (closed.hudOverlap) throw new Error("mobile nav fab overlaps hud column");
    if (closed.bannerOverlap) throw new Error("mobile nav fab overlaps preview banner");
    if (closed.fabH < 44 || closed.fabW < 44) throw new Error("mobile nav fab touch target <44px: " + JSON.stringify(closed));
    if (!closed.mapReachable || !closed.gangReachable) {
      throw new Error("bottom bar Map/Gang not reachable at scroll 0: " + JSON.stringify(closed));
    }

    await page.click('[data-testid="mobile-nav-fab"]');
    await page.waitForSelector(".mobile-nav-sheet.open", { timeout: 5000 });
    const openChecks = await page.evaluate(() => {
      const close = document.getElementById("mobileNavClose");
      const cr = close?.getBoundingClientRect();
      const con = document.querySelector('[data-testid="mobile-nav-construction"]');
      const conRaw = /^construction$/i.test((con?.textContent || "").trim());
      return {
        closeH: cr?.height || 0,
        closeW: cr?.width || 0,
        conRaw,
        conLabel: con?.textContent?.trim() || ""
      };
    });
    if (openChecks.closeH < 44 || openChecks.closeW < 44) {
      throw new Error("sheet close touch target <44px: " + JSON.stringify(openChecks));
    }
    if (openChecks.conRaw) throw new Error("construction label not translated: " + openChecks.conLabel);
    await page.keyboard.press("Escape");
    await page.waitForFunction(() => !document.querySelector(".mobile-nav-sheet.open"), undefined, { timeout: 3000 });

    await page.click('[data-testid="mobile-nav-fab"]');
    await page.waitForSelector(".mobile-nav-sheet.open", { timeout: 5000 });
    const open = await page.evaluate(() => {
      const sheetBtns = [...document.querySelectorAll("#mobileNavGrid .mobile-nav-loc")];
      return {
        destCount: sheetBtns.length,
        hasParkour: sheetBtns.some(b => /parkour|паркур/i.test(b.textContent || "")),
        sheetOpen: document.body.classList.contains("mobile-travel-sheet-open")
      };
    });
    if (open.destCount < 10) throw new Error("mobile sheet missing destinations: " + JSON.stringify(open));
    if (!open.hasParkour) throw new Error("parkour missing from mobile sheet");
    if (!open.sheetOpen) throw new Error("mobile travel sheet must disable bottom controls while open");

    await page.click('[data-testid="mobile-nav-cemetery"]');
    await page.waitForFunction(() => window.me?.location === "cemetery", undefined, { timeout: 15000 });
    console.log("preview-mobile-hud-390: PASS", JSON.stringify({ closed, open, loc: "cemetery" }));
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
    await testHowToOverlayFreshProfile("http://127.0.0.1:3765");
    await runBrowserTest("http://127.0.0.1:3765");
    await testMobileHud390("http://127.0.0.1:3765");
    await testTimeToPlayer1280("http://127.0.0.1:3765");
  } finally {
    srv.close();
  }
}

main().catch(e => {
  console.error("preview-build-test: FAIL", e);
  process.exit(1);
});
