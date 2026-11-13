require('./lib/require-local-capture.js');
const { chromium } = require("playwright");
const fs = require("fs");
const out = "/opt/cursor/artifacts";
fs.mkdirSync(out, { recursive: true });
const base = process.env.PUNK_BASE || "http://127.0.0.1:8765";
const HOWTO_KEY = "punkme_howto_seen";

async function prep(page) {
  await page.addInitScript(k => { try { localStorage.setItem(k, "1"); } catch (e) {} }, HOWTO_KEY);
}

async function enter(page) {
  await page.waitForSelector("#charSelect.active", { timeout: 30000 }).catch(() => {});
  const c = page.locator("#charSelectConfirm");
  if (await c.isVisible({ timeout: 8000 }).catch(() => false)) {
    await page.click('.char-pick[data-id="cobalt"]');
    await c.click();
  }
  await page.waitForFunction(() => window.World3D?.isReady?.(), { timeout: 120000 });
  await page.evaluate(() => {
    typeof setLanguage === "function" && setLanguage("en", true);
    document.getElementById("howToOverlay")?.classList.remove("active");
    me.onboarding = { step: 6, progress: {}, done: true };
    saveMe?.();
    World3D?.setGuideTarget?.(null);
  });
}

async function snap(page) {
  await page.evaluate(() => World3D?.snapScreenshotView?.());
  await page.waitForTimeout(500);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await prep(page);
  await page.goto(`${base}/?dev=1&solo=1&v=run20`, { waitUntil: "networkidle", timeout: 120000 });
  await enter(page);
  const files = [];
  for (const [loc, name] of [
    ["elevator", "qa-run20-elevator.png"],
    ["toilet", "qa-run20-toilet.png"],
    ["kitchen", "qa-run20-kitchen.png"],
    ["room", "qa-run20-home.png"]
  ]) {
    await page.evaluate(id => {
      goLocation(id);
      syncStage3D?.();
    }, loc);
    await page.waitForTimeout(2800);
    await snap(page);
    const f = `${out}/${name}`;
    await page.screenshot({ path: f });
    files.push(f);
    await page.evaluate(() => World3D?.releaseCaptureFrame?.());
  }
  console.log(JSON.stringify({ screenshots: files.map(f => f.replace(`${out}/`, "")) }, null, 2));
  await browser.close();
})();
