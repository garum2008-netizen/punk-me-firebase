#!/usr/bin/env node
/**
 * Room NPC meshes visible ≤3s from cold goLocation('room') (prod-host sim, Firebase stubbed).
 * Measures navigation from cemetery with empty cache at 1280×800 and 390×844.
 */
const { chromium } = require("playwright");
const path = require("path");
const { serveStaticDir } = require("./serve-static-root");
const {
  exitIfMissingFirebaseEmulatorEnv,
  prodHostFirebaseStubQueryString,
  prepareProdHostSimContext,
  installProdFirebaseRouteBlock
} = require("./firebase-test-emulator-guard");

exitIfMissingFirebaseEmulatorEnv();

const ROOT = path.join(__dirname, "..");
const HOWTO = "punkme_howto_seen";
const MAX_MS = 3000;
const PROD_HOSTS = ["punk-me-sim.web.app", "punk-me-40605.web.app", "halloween.punk.contractbot.dk"];
const stubQs = prodHostFirebaseStubQueryString();

async function coldRoomNavMs(page, viewportLabel) {
  await page.evaluate(() => {
    if (window.me.location !== "cemetery") window.goLocation("cemetery");
  });
  await page.waitForFunction(() => window.me?.location === "cemetery", undefined, { timeout: 15000 });
  await page.waitForFunction(
    () => window.World3D?.getNpcMeshVertexSnapshot?.()?.location === "cemetery",
    undefined,
    { timeout: 10000 }
  );
  const t0 = Date.now();
  await page.evaluate(() => window.goLocation("room"));
  await page.waitForFunction(
    () => {
      const snap = window.World3D?.getNpcMeshVertexSnapshot?.();
      if (snap?.location !== "room") return false;
      const n = snap.npcs || {};
      return ["vienna", "mohawk", "cobalt"].every(id => {
        const row = n[id];
        if (!row?.visible) return false;
        const u = row.meshUrl || "";
        if (id === "vienna") return u.includes("punk_pink.glb");
        if (id === "mohawk") return u.includes("mohawk.glb");
        if (id === "cobalt") return u.includes("cobalt.glb");
        return false;
      });
    },
    undefined,
    { timeout: MAX_MS, polling: 50 }
  );
  const navMs = Date.now() - t0;
  if (navMs > MAX_MS) {
    throw new Error(`room NPC cold nav ${navMs}ms > ${MAX_MS} (${viewportLabel})`);
  }
  return navMs;
}

async function runViewport(browser, port, width, height, tag) {
  for (const simHost of PROD_HOSTS) {
    const ctx = await browser.newContext({ viewport: { width, height } });
    await prepareProdHostSimContext(ctx);
    await ctx.addInitScript(k => {
      try {
        localStorage.clear();
        sessionStorage.clear();
        localStorage.setItem(k, "1");
      } catch (_) {}
    }, HOWTO);
    const page = await ctx.newPage();
    await installProdFirebaseRouteBlock(page);
    await page.goto(
      `http://127.0.0.1:${port}/?solo=1&lifeCh1Slice=1&lifeCh1Local=1&lifeCh1E2e=1&v=room3s-${tag}${stubQs}`,
      { waitUntil: "load", timeout: 120000 }
    );
    await page.waitForSelector(
      '#charSelectPortraits #charSelectConfirm, [data-testid="char-select-angelina"], #charSelectConfirm',
      { timeout: 120000 }
    );
    await page.click("#charSelectConfirm");
    await page.waitForFunction(() => window.__playerLoaded === true, undefined, { timeout: 120000 });
    await page.waitForFunction(() => window.World3D?.isReady?.(), undefined, { timeout: 30000 });
    const navMs = await coldRoomNavMs(page, `${tag}@${simHost}`);
    console.log("test-room-npc-3s: PASS", { prodHost: simHost, viewport: tag, navMs });
    await page.close();
    await ctx.close();
  }
}

(async () => {
  const srv = await serveStaticDir(ROOT, 3782);
  try {
    const browser = await chromium.launch();
    await runViewport(browser, 3782, 1280, 800, "1280");
    await runViewport(browser, 3782, 390, 844, "390");
    await browser.close();
  } finally {
    srv.close();
  }
})().catch(e => {
  console.error("test-room-npc-3s: FAIL", e);
  process.exit(1);
});
