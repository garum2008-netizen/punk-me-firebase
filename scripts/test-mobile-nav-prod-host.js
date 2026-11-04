#!/usr/bin/env node
/** Prod host mobile HUD regression at 390 and 360 widths (Firebase stubbed — no prod RTDB/auth). */
const { chromium } = require("playwright");
const fs = require("fs");
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
const OUT = process.env.M1_CAPTURE_OUT || path.join("/opt/cursor/artifacts", "m1-prod-mobile");
const HOWTO = "punkme_howto_seen";
const PROD_HOST = "punk-me-40605.web.app";
const emulatorQs = firebaseEmulatorQueryString();

async function checkMobile(page, label) {
  const report = await page.evaluate(() => {
    const dock = document.getElementById("dockScrollRow");
    if (dock) dock.scrollLeft = 0;
    const fab = document.getElementById("mobileNavFab")?.getBoundingClientRect();
    const map = document.querySelector('#panelBottom button[onclick*="mapModal"]')?.getBoundingClientRect();
    const gang = document.querySelector('#panelBottom button[onclick*="gangModal"]')?.getBoundingClientRect();
    return {
      fabOk: fab && fab.height >= 44 && fab.width >= 44,
      mapOk: map && map.left >= 0 && map.right <= window.innerWidth + 1,
      gangOk: gang && gang.left >= 0 && gang.right <= window.innerWidth + 1,
      jumpOk: !!document.getElementById("touchJump")
    };
  });
  if (!report.fabOk || !report.mapOk || !report.gangOk || !report.jumpOk) {
    throw new Error(`${label} mobile HUD regression: ` + JSON.stringify(report));
  }
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const srv = await serveStaticDir(ROOT, 3783);
  try {
    const browser = await chromium.launch();
    for (const [w, h, tag] of [
      [390, 844, "390"],
      [360, 780, "360"]
    ]) {
      const ctx = await browser.newContext({
        viewport: { width: w, height: h }
      });
      await prepareProdHostSimContext(ctx, { prodHostSim: false, firebaseStub: true });
      await ctx.addInitScript(k => {
        try {
          localStorage.setItem(k, "1");
        } catch (_) {}
      }, HOWTO);
      const page = await ctx.newPage();
      await installProdFirebaseRouteBlock(page);
      await page.goto(
        `http://127.0.0.1:3783/?solo=1&lifeCh1Slice=1&lifeCh1Local=1&lifeCh1E2e=1${emulatorQs}`,
        {
          waitUntil: "load",
          timeout: 120000
        }
      );
      await page.waitForSelector('#charSelectPortraits #charSelectConfirm, #charSelectConfirm', {
        timeout: 120000
      });
      await page.click("#charSelectConfirm");
      await page.waitForFunction(() => window.__playerLoaded === true, undefined, { timeout: 120000 });
      await checkMobile(page, tag);
      await page.screenshot({ path: path.join(OUT, `prod-mobile-hud-${tag}-closed.png`) });
      await page.click('[data-testid="mobile-nav-fab"]');
      await page.waitForSelector(".mobile-nav-sheet.open", { timeout: 5000 });
      await page.screenshot({ path: path.join(OUT, `prod-mobile-nav-open-${tag}.png`) });
      await page.close();
      await ctx.close();
      console.log("test-mobile-nav-prod-host: PASS", tag);
    }
    await browser.close();
    console.log("screenshots:", OUT);
  } finally {
    srv.close();
  }
})().catch(e => {
  console.error("test-mobile-nav-prod-host: FAIL", e);
  process.exit(1);
});
