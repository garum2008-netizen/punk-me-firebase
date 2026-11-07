#!/usr/bin/env node
/**
 * RC1 evidence: desktop 1280×800 + mobile 390×844 screenshots (local-save entry, emulator guard).
 * Writes PNGs under /opt/cursor/artifacts/rc1-ch1-capture/
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const http = require("http");
const { isProdFirebaseRequest } = require("./firebase-prod-guard");
const {
  assertFirebaseEmulatorTestEnv,
  firebaseEmulatorQueryString,
  installProdFirebaseRouteBlock
} = require("./firebase-test-emulator-guard");

assertFirebaseEmulatorTestEnv();

const ROOT = path.join(__dirname, "..");
const OUT = process.env.PUNK_RC1_CAPTURE_OUT || path.join("/opt/cursor/artifacts", "rc1-ch1-capture");
const PORT = Number(process.env.PUNK_PORT || "3460");

function serveRoot() {
  return new Promise(resolve => {
    const child = require("child_process").spawn("npx", ["--yes", "serve", "-l", String(PORT), "."], {
      cwd: ROOT,
      stdio: "ignore",
      detached: true
    });
    const deadline = Date.now() + 45000;
    const poll = () => {
      http.get(`http://127.0.0.1:${PORT}/`, res => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) resolve(child);
        else if (Date.now() < deadline) setTimeout(poll, 400);
        else {
          try {
            process.kill(-child.pid, "SIGTERM");
          } catch (_) {}
          throw new Error("serve not ready");
        }
      }).on("error", () => {
        if (Date.now() < deadline) setTimeout(poll, 400);
        else throw new Error("serve not ready");
      });
    };
    setTimeout(poll, 500);
  });
}

async function dismissHowTo(page) {
  await page.evaluate(() => {
    try {
      localStorage.setItem("punkme_howto_seen", "1");
    } catch (_) {}
  });
  const close = page.locator(".howto-close");
  if (await close.isVisible({ timeout: 2000 }).catch(() => false)) await close.click();
}

async function bootSlice(page, baseUrl) {
  const emulatorQs = firebaseEmulatorQueryString();
  await page.goto(
    `${baseUrl}/?solo=1${emulatorQs}&lifeCh1Slice=1&lifeCh1E2e=1&v=rc1-capture`,
    { waitUntil: "domcontentloaded", timeout: 120000 }
  );
  await page.waitForSelector("#charSelectConfirm", { timeout: 120000 });
  await page.click("#charSelectConfirm");
  await page.waitForFunction(() => window.__playerLoaded === true, undefined, { timeout: 120000 });
  await dismissHowTo(page);
  await page.evaluate(async () => {
    window.me.onboarding = { step: 6, progress: {}, done: true };
    window.LifeCh1Slice?.ensureLifeCh1?.(window.me);
    await window.LifeCh1Slice?.tryStartAfterOnboarding?.();
    window.saveMe?.();
  });
  await page.waitForFunction(() => window.World3D?.isReady?.(), undefined, { timeout: 60000 });
}

async function screenshotLoc(page, locId, fileName) {
  await page.evaluate(id => {
    if (typeof goLocation === "function") goLocation(id);
  }, locId);
  await page.waitForTimeout(1800);
  await page.screenshot({ path: path.join(OUT, fileName), fullPage: false });
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  let prodHits = 0;
  const serveChild = await serveRoot();
  const baseUrl = `http://127.0.0.1:${PORT}`;
  const browser = await chromium.launch();

  try {
    for (const [vw, vh, tag] of [
      [1280, 800, "desktop1280"],
      [390, 844, "mobile390"]
    ]) {
      const context = await browser.newContext({ viewport: { width: vw, height: vh } });
      const page = await context.newPage();
      await installProdFirebaseRouteBlock(page);
      await page.route("**/*", route => {
        const url = route.request().url();
        if (isProdFirebaseRequest(url)) {
          prodHits += 1;
          return route.abort();
        }
        return route.continue();
      });
      await bootSlice(page, baseUrl);
      await page.evaluate(() => goLocation("room"));
      await page.waitForTimeout(1200);
      await page.screenshot({ path: path.join(OUT, `${tag}-room-angelina-cobalt.png`) });
      for (const loc of ["alley", "roof", "park"]) {
        await screenshotLoc(page, loc, `${tag}-loc-${loc}.png`);
      }
      await context.close();
    }

    fs.writeFileSync(
      path.join(OUT, "capture-meta.json"),
      JSON.stringify(
        {
          prodFirebaseBlocks: prodHits,
          outDir: OUT,
          port: PORT,
          entry: "default __PUNK_LIFE_CH1_LOCAL__ + lifeCh1Slice/E2e on localhost"
        },
        null,
        2
      )
    );
    console.log("rc1-ch1-capture: saved", OUT, "prodBlocks", prodHits);
  } finally {
    await browser.close();
    try {
      process.kill(-serveChild.pid, "SIGTERM");
    } catch (_) {}
  }
})().catch(e => {
  console.error(e);
  process.exit(1);
});
