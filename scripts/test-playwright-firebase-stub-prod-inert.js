#!/usr/bin/env node
/** Playwright Firebase stub must be inert on production game hosts (no URL flag bypass). */
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
const PROD_HOST = "punk-me-40605.web.app";
const emulatorQs = firebaseEmulatorQueryString();

(async () => {
  const srv = await serveStaticDir(ROOT, 3791);
  try {
    const browser = await chromium.launch();
    const ctxLocal = await browser.newContext();
    await prepareProdHostSimContext(ctxLocal, { prodHostSim: false, firebaseStub: true });
    const pageLocal = await ctxLocal.newPage();
    await installProdFirebaseRouteBlock(pageLocal);
    await pageLocal.goto(`http://127.0.0.1:3791/?solo=1&lifeCh1Local=1${emulatorQs}`, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });
    await pageLocal.waitForFunction(() => typeof window.firebase !== "undefined", undefined, { timeout: 60000 });
    const localStub = await pageLocal.evaluate(() => ({
      stubFlag: window.__PUNK_PLAYWRIGHT_FIREBASE_STUB__ === true,
      stubSession: typeof window.saveMe === "function" && String(window.uid || "").startsWith("prod-host-sim-")
    }));
    if (!localStub.stubFlag || !localStub.stubSession) {
      throw new Error(`localhost stub session expected with init flag: ${JSON.stringify(localStub)}`);
    }
    await pageLocal.close();
    await ctxLocal.close();

    const ctxProd = await browser.newContext();
    await prepareProdHostSimContext(ctxProd, { prodHostSim: true, firebaseStub: true });
    const pageProd = await ctxProd.newPage();
    await installProdFirebaseRouteBlock(pageProd);
    await pageProd.goto(`http://127.0.0.1:3791/?solo=1&lifeCh1Local=1&punkFirebaseStub=1${emulatorQs}`, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });
    await pageProd.waitForFunction(() => typeof window.firebase !== "undefined", undefined, { timeout: 60000 });
    const prodSim = await pageProd.evaluate(() => ({
      isProdHost: window.LifeCh1Slice?.isProductionGameHost?.() === true,
      stubSession: String(window.uid || "").startsWith("prod-host-sim-"),
      apps: window.firebase?.apps?.length || 0
    }));
    if (!prodSim.isProdHost) {
      throw new Error("expected isProductionGameHost() true with Host header");
    }
    if (prodSim.stubSession) {
      throw new Error("Playwright stub must be inert on prod host (got stub uid)");
    }
    if (prodSim.apps < 1) {
      throw new Error("prod-host sim must initialize Firebase, not stub session");
    }
    console.log("test-playwright-firebase-stub-prod-inert: PASS", { prodHost: PROD_HOST });
    await pageProd.close();
    await ctxProd.close();
    await browser.close();
  } finally {
    srv.close();
  }
})().catch(e => {
  console.error("test-playwright-firebase-stub-prod-inert: FAIL", e);
  process.exit(1);
});
