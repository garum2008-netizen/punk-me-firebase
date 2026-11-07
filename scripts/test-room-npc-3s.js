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
  firebaseEmulatorQueryString,
  prepareProdHostSimContext,
  installProdFirebaseRouteBlock
} = require("./firebase-test-emulator-guard");

exitIfMissingFirebaseEmulatorEnv();

const ROOT = path.join(__dirname, "..");
const HOWTO = "punkme_howto_seen";
const MAX_MS = 3000;
const PROD_HOST = "punk-me-40605.web.app";
const emulatorQs = firebaseEmulatorQueryString();

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
      const meshOk = ["vienna", "mohawk", "cobalt"].every(id => {
        const row = n[id];
        if (!row?.visible) return false;
        const u = row.meshUrl || "";
        if (id === "vienna") return u.includes("punk_pink.glb");
        if (id === "mohawk") return u.includes("mohawk.glb");
        if (id === "cobalt") return u.includes("cobalt.glb");
        return false;
      });
      if (!meshOk) return false;
      const onScreen = window.World3D?.getRoomNpcsOnScreenSnapshot?.()?.onScreen || {};
      return ["vienna", "mohawk", "cobalt"].every(id => onScreen[id] === true);
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
  const ctx = await browser.newContext({
    viewport: { width, height }
  });
  await prepareProdHostSimContext(ctx, { prodHostSim: false, firebaseStub: true });
  await ctx.addInitScript(k => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem(k, "1");
    } catch (_) {}
  }, HOWTO);
  const page = await ctx.newPage();
  await installProdFirebaseRouteBlock(page);
  try {
    await page.goto(
      `http://127.0.0.1:${port}/?solo=1&lifeCh1Slice=1&lifeCh1Local=1&lifeCh1E2e=1&v=room3s-cold-${tag}${emulatorQs}`,
      { waitUntil: "load", timeout: 120000 }
    );
    await page.waitForSelector(
      '#charSelectPortraits #charSelectConfirm, [data-testid="char-select-angelina"], #charSelectConfirm',
      { timeout: 120000 }
    );
    await page.click("#charSelectConfirm");
    await page.waitForFunction(() => window.__playerLoaded === true, undefined, { timeout: 120000 });
    await page.waitForFunction(() => window.World3D?.isReady?.(), undefined, { timeout: 30000 });
    const navMs = await coldRoomNavMs(page, `${tag}@${PROD_HOST}`);
    console.log("test-room-npc-3s: PASS", { sim: "localhost-stub-cold", viewport: tag, navMs });
  } finally {
    await page.close();
    await ctx.close();
  }
}

(async () => {
  const srv = await serveStaticDir(ROOT, 0);
  const port = srv.address().port;
  try {
    const browser = await chromium.launch();
    try {
      await runViewport(browser, port, 1280, 800, "1280");
      await runViewport(browser, port, 390, 844, "390");
    } finally {
      await browser.close();
    }
  } finally {
    srv.close();
  }
})().catch(e => {
  console.error("test-room-npc-3s: FAIL", e);
  process.exit(1);
});
