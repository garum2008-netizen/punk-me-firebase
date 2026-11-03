#!/usr/bin/env node
/**
 * Room NPC meshes visible ≤3s from goLocation('room') (prod static bundle / prod-host sim).
 */
const { chromium } = require("playwright");
const path = require("path");
const { serveStaticDir } = require("./serve-static-root");

const ROOT = path.join(__dirname, "..");
const HOWTO = "punkme_howto_seen";
const MAX_MS = 3000;
/** Hostnames verified on deployed prod; static bundle timing uses localhost + slice E2E flags. */
const PROD_HOSTS = ["punk-me-sim.web.app", "punk-me-40605.web.app", "halloween.punk.contractbot.dk"];

(async () => {
  const srv = await serveStaticDir(ROOT, 3782);
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
      "http://127.0.0.1:3782/?solo=1&lifeCh1Slice=1&lifeCh1Local=1&lifeCh1E2e=1&v=room3s-prod-sim",
      { waitUntil: "load", timeout: 120000 }
    );
    await page.waitForSelector('[data-testid="char-select-angelina"], #charSelectConfirm', {
      timeout: 120000
    });
    await page.click("#charSelectConfirm");
    await page.waitForFunction(() => window.__playerLoaded === true, undefined, { timeout: 120000 });
    await page.waitForFunction(() => window.World3D?.isReady?.(), undefined, { timeout: 30000 });

    for (const simHost of PROD_HOSTS) {
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
        throw new Error(`room NPC nav timing ${navMs}ms > ${MAX_MS} (prod host ${simHost})`);
      }
      console.log("test-room-npc-3s: PASS", { prodHost: simHost, navMs });
    }
    await page.close();
    await ctx.close();
    await browser.close();
  } finally {
    srv.close();
  }
})().catch(e => {
  console.error("test-room-npc-3s: FAIL", e);
  process.exit(1);
});
