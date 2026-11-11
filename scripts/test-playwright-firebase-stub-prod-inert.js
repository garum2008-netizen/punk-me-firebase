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

const CONTRACTBOT_HOSTS = ["punk.contractbot.dk", "halloween.punk.contractbot.dk"];

async function assertStubInertOnHost(browser, host, port) {
  const ctx = await browser.newContext();
  await prepareProdHostSimContext(ctx, { prodHostSim: false, firebaseStub: true });
  const page = await ctx.newPage();
  await installProdFirebaseRouteBlock(page);
  try {
    await page.goto(`http://${host}:${port}/?solo=1&lifeCh1Local=1&punkFirebaseStub=1${emulatorQs}`, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    });
    await page.waitForFunction(() => typeof window.firebase !== "undefined", undefined, { timeout: 60000 });
    const state = await page.evaluate(() => ({
      hostname: location.hostname,
      stubFlag: window.__PUNK_PLAYWRIGHT_FIREBASE_STUB__ === true,
      stubSession: String(window.uid || "").startsWith("prod-host-sim-"),
      localHostCheck:
        location.hostname === "localhost" ||
        location.hostname === "127.0.0.1" ||
        location.hostname.endsWith(".localhost")
    }));
    if (state.stubSession) {
      throw new Error(`Playwright stub session must be inert on ${host}: ${JSON.stringify(state)}`);
    }
    if (state.localHostCheck) {
      throw new Error(`host-resolver expected real prod hostname, got ${state.hostname}`);
    }
    console.log(`OK stub inert on ${host}`, state);
  } finally {
    await page.close();
    await ctx.close();
  }
}

(async () => {
  const srv = await serveStaticDir(ROOT, 3791);
  const addr = srv.address();
  const port = addr.port;
  try {
    const browser = await chromium.launch();
    const ctxLocal = await browser.newContext();
    await prepareProdHostSimContext(ctxLocal, { prodHostSim: false, firebaseStub: true });
    const pageLocal = await ctxLocal.newPage();
    await installProdFirebaseRouteBlock(pageLocal);
    await pageLocal.goto(`http://127.0.0.1:${port}/?solo=1&lifeCh1Local=1${emulatorQs}`, {
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
    await pageProd.goto(`http://127.0.0.1:${port}/?solo=1&lifeCh1Local=1&punkFirebaseStub=1${emulatorQs}`, {
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
    await pageProd.close();
    await ctxProd.close();

    const resolverRules = CONTRACTBOT_HOSTS.map(h => `MAP ${h} 127.0.0.1`).join(",");
    const resolverBrowser = await chromium.launch({
      args: [`--host-resolver-rules=${resolverRules}`]
    });
    try {
      for (const host of CONTRACTBOT_HOSTS) {
        await assertStubInertOnHost(resolverBrowser, host, port);
      }
    } finally {
      await resolverBrowser.close();
    }

    console.log("test-playwright-firebase-stub-prod-inert: PASS", { prodHost: PROD_HOST });
    await browser.close();
  } finally {
    srv.close();
  }
})().catch(e => {
  console.error("test-playwright-firebase-stub-prod-inert: FAIL", e);
  process.exit(1);
});
