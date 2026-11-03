#!/usr/bin/env node
/** Room must show 3 dedicated NPC meshes within 3s after load (prod host). */
const { chromium } = require("playwright");
const path = require("path");
const { serveStaticDir } = require("./serve-static-root");

const ROOT = path.join(__dirname, "..");
const HOWTO = "punkme_howto_seen";
const EXPECT = { vienna: "punk_pink.glb", mohawk: "mohawk.glb", cobalt: "cobalt.glb" };

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
    await page.goto("http://127.0.0.1:3782/?solo=1&lifeCh1Slice=1&lifeCh1Local=1&lifeCh1E2e=1&v=room3s", {
      waitUntil: "load",
      timeout: 120000
    });
    await page.waitForSelector('[data-testid="char-select-angelina"], #charSelectConfirm', { timeout: 120000 });
    const t0 = Date.now();
    await page.click("#charSelectConfirm");
    await page.waitForFunction(() => window.__playerLoaded === true, undefined, { timeout: 120000 });
    await page.evaluate(() => {
      if (window.me.location !== "room") goLocation("room");
    });
    await page.waitForFunction(() => window.World3D?.isReady?.(), undefined, { timeout: 30000 });
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
      { timeout: 3000, polling: 100 }
    );
    const ms = Date.now() - t0;
    await page.waitForFunction(() => typeof window.tryPlaceBuild === "undefined", undefined, { timeout: 5000 });
    console.log("test-room-npc-3s: PASS", { ms, expect: EXPECT });
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
