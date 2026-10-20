const { chromium } = require("playwright");
const fs = require("fs");
const out = "/opt/cursor/artifacts";
fs.mkdirSync(out, { recursive: true });
const base = process.env.PUNK_BASE || "http://127.0.0.1:8765";
const HOWTO_KEY = "punkme_howto_seen";
const LOCS = ["room", "street", "cemetery", "city", "kitchen", "elevator"];

async function prep(page) {
  await page.addInitScript(k => { try { localStorage.setItem(k, "1"); } catch (e) {} }, HOWTO_KEY);
}

async function enter(page) {
  await page.waitForSelector("#charSelect.active", { timeout: 25000 }).catch(() => {});
  const c = page.locator("#charSelectConfirm");
  if (await c.isVisible({ timeout: 8000 }).catch(() => false)) {
    await page.click('.char-pick[data-id="cobalt"]');
    await c.click();
  }
  await page.waitForFunction(() => !document.getElementById("charSelect")?.classList.contains("active"), { timeout: 25000 });
  await page.waitForFunction(() => window.World3D?.isReady?.(), { timeout: 120000 });
  await page.evaluate(() => {
    document.getElementById("howToOverlay")?.classList.remove("active");
    if (!window.me) return;
    me.owned = me.owned || [];
    if (!me.owned.includes("pet_dog")) me.owned.push("pet_dog");
    me.pet = "pet_dog";
    me.onboarding = { step: 6, progress: {}, done: true };
    if (saveMe) saveMe();
    syncStage3D?.();
  });
  await page.waitForTimeout(1000);
}

async function snap(page) {
  await page.evaluate(() => {
    me.x = 50; me.y = 50;
    syncStage3D?.();
    World3D?.snapScreenshotView?.();
  });
  await page.waitForTimeout(400);
}

(async () => {
  const browser = await chromium.launch();
  const files = [];
  const page = await browser.newPage({ viewport: { width: 1024, height: 576 } });
  await prep(page);
  await page.goto(`${base}/?dev=1&solo=1&v=review`, { waitUntil: "networkidle", timeout: 120000 });
  await enter(page);
  for (const loc of LOCS) {
    await page.evaluate(id => goLocation(id), loc);
    await page.waitForTimeout(2800);
    const f = `${out}/review-${loc}.png`;
    await snap(page);
    await page.screenshot({ path: f });
    files.push(f);
    await page.evaluate(() => World3D?.releaseCaptureFrame?.());
  }
  await page.evaluate(() => {
    me.onboarding = { step: 0, progress: {}, done: false };
    goLocation("room");
    Onboarding?.init?.();
  });
  await page.waitForTimeout(2000);
  await snap(page);
  const quest = `${out}/review-quest-beacon.png`;
  await page.screenshot({ path: quest });
  files.push(quest);
  console.log(JSON.stringify({ screenshots: files.map(f => f.replace(`${out}/`, "")) }, null, 2));
  await browser.close();
})();
