#!/usr/bin/env node
/** Screenshots: Angelina 2D player in room / street / cemetery (preview slice). */
const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");

const root = path.join(__dirname, "..");
const outDir = process.env.PUNK_ARTIFACTS || "/opt/cursor/artifacts";
const HOWTO_SEEN_KEY = "punkme_howto_seen";

async function dismissHowTo(page) {
  await page.evaluate(key => {
    try {
      localStorage.setItem(key, "1");
    } catch (_) {}
    document.getElementById("howToPlay")?.classList.remove("active");
  }, HOWTO_SEEN_KEY);
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  const base = process.env.PUNK_PREVIEW_URL || "http://127.0.0.1:3765";
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(key => {
    try {
      localStorage.setItem(key, "1");
    } catch (_) {}
  }, HOWTO_SEEN_KEY);
  const page = await context.newPage();
  await page.goto(`${base}/?lifeCh1E2e=1&v=angelina-capture`, { waitUntil: "load", timeout: 120000 });
  await page.waitForFunction(() => window.__PUNK_PREVIEW__ === true, undefined, { timeout: 15000 });
  await page.waitForSelector("#charSelectConfirm", { timeout: 90000 });
  await page.click("#charSelectConfirm");
  await page.waitForFunction(() => window.__playerLoaded === true, undefined, { timeout: 120000 });
  await page.evaluate(async () => {
    window.me.onboarding = { step: 6, progress: {}, done: true };
    window.LifeCh1Slice?.ensureLifeCh1?.(window.me);
    const st = window.me.lifeCh1;
    if (st) {
      st.playerCutout = true;
      st.angelinaSkin = "A";
      st.stepIndex = 2;
      st.flags = st.flags || {};
      st.flags.outfit_calm = true;
    }
    await window.LifeCh1Slice?.tryStartAfterOnboarding?.();
    window.LifeCh1Slice?.syncPlayerLifeCh1Skin?.();
    window.saveMe?.();
  });
  await dismissHowTo(page);
  await page.waitForTimeout(1500);

  const locs = ["room", "street", "cemetery"];
  for (const loc of locs) {
    await page.evaluate(id => goLocation(id), loc);
    await page.waitForFunction(l => window.me?.location === l, loc, { timeout: 15000 });
    await page.waitForTimeout(1200);
    const file = path.join(outDir, `angelina-player-${loc}.png`);
    await page.screenshot({ path: file, fullPage: false });
    console.log("wrote", file);
  }
  await browser.close();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
