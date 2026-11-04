#!/usr/bin/env node
const { installProdFirebaseRouteBlock } = require("./playwright-script-guard");
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const { spawnSync } = require("child_process");
const { serveStaticDir } = require("./serve-static-root");

const ROOT = path.join(__dirname, "..");
const DIST = path.join(ROOT, "dist-preview");
const OUT = process.env.M1_CAPTURE_OUT || path.join("/opt/cursor/artifacts", "m1-r9");
const HOWTO = "punkme_howto_seen";

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
  await page.waitForFunction(() => window.World3D?.isReady?.(), undefined, { timeout: 30000 });
}

spawnSync("node", [path.join(__dirname, "build-preview.js")], { cwd: ROOT, stdio: "inherit" });
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const prodSrv = await serveStaticDir(ROOT, 3775);
  const prevSrv = await serveStaticDir(DIST, 3776);
  try {
    const browser = await chromium.launch();
    const page = const page = await browser.newPage({ viewport: { width: 1280, height: 800 } }); await installProdFirebaseRouteBlock(page);
  await installProdFirebaseRouteBlock(page);
    await page.addInitScript(k => {
      try {
        localStorage.setItem(k, "1");
      } catch (_) {}
    }, HOWTO);
    await page.goto("http://127.0.0.1:3775/?solo=1&lifeCh1Slice=1&lifeCh1Local=1&lifeCh1E2e=1", {
      waitUntil: "load",
      timeout: 120000
    });
    await enterSlice(page);
    await page.evaluate(() => goLocation("room"));
    await page.waitForFunction(
      () => {
        const s = window.World3D?.getNpcMeshVertexSnapshot?.();
        if (s?.location !== "room") return false;
        return ["vienna", "mohawk", "cobalt"].every(id => s.npcs?.[id]?.visible && s.npcs[id].meshUrl);
      },
      undefined,
      { timeout: 3000, polling: 80 }
    );
    await page.screenshot({ path: path.join(OUT, "prod-room-1280-3npc-3s.png") });

    for (const [w, tag] of [
      [390, "390"],
      [360, "360"]
    ]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: 844 } });
      await ctx.addInitScript(k => {
        try {
          localStorage.setItem(k, "1");
        } catch (_) {}
      }, HOWTO);
      const mp = await ctx.newPage();
      await mp.goto("http://127.0.0.1:3775/?solo=1&lifeCh1Slice=1&lifeCh1Local=1&lifeCh1E2e=1", {
        waitUntil: "load",
        timeout: 120000
      });
      await enterSlice(mp);
      await mp.screenshot({ path: path.join(OUT, `prod-mobile-hud-${tag}-closed.png`) });
      await mp.click('[data-testid="mobile-nav-fab"]');
      await mp.waitForSelector(".mobile-nav-sheet.open");
      await mp.screenshot({ path: path.join(OUT, `prod-mobile-nav-open-${tag}.png`) });
      await mp.close();
      await ctx.close();
    }

    await page.close();
    await browser.close();

    const hairSrc = path.join(ROOT, "assets/ui/angelina-skins/shipped/angelina-teen-B-world.webp");
    for (const [bg, name] of [
      [[8, 4, 16], "dark"],
      [[240, 238, 250], "light"]
    ]) {
      await sharp(hairSrc)
        .extract({ left: 88, top: 0, width: 104, height: 150 })
        .extend({ top: 24, bottom: 24, left: 24, right: 24, background: { r: bg[0], g: bg[1], b: bg[2], alpha: 1 } })
        .png()
        .toFile(path.join(OUT, `hair-zoom-${name}.png`));
    }
    console.log("saved", OUT);
  } finally {
    prodSrv.close();
    prevSrv.close();
  }
})().catch(e => {
  console.error(e);
  process.exit(1);
});
