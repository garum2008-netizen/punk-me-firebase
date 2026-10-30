require("./lib/require-local-capture.js");
const { chromium } = require("playwright");
const fs = require("fs");
const out = "/opt/cursor/artifacts";
fs.mkdirSync(out, { recursive: true });
const base = process.env.PUNK_BASE || "http://127.0.0.1:8765";
const HOWTO_KEY = "punkme_howto_seen";

const DESKTOP_LOCS = [
  ["room", "qa-desktop-home.png"],
  ["kitchen", "qa-desktop-kitchen.png"],
  ["toilet", "qa-desktop-toilet.png"],
  ["elevator", "qa-desktop-elevator.png"],
  ["street", "qa-desktop-street.png"],
  ["city", "qa-desktop-city.png"],
  ["cemetery", "qa-desktop-cemetery.png"],
  ["roof", "qa-desktop-roof.png"],
  ["parkour", "qa-desktop-parkour.png"]
];

async function prep(page) {
  await page.addInitScript(k => {
    try { localStorage.setItem(k, "1"); } catch (e) {}
  }, HOWTO_KEY);
}

async function enterGame(page, hero = "cobalt") {
  await page.waitForSelector("#charSelect.active", { timeout: 30000 }).catch(() => {});
  const c = page.locator("#charSelectConfirm");
  if (await c.isVisible({ timeout: 8000 }).catch(() => false)) {
    await page.click(`.char-pick[data-id="${hero}"]`);
    await c.click();
  }
  await page.waitForFunction(() => window.World3D?.isReady?.(), { timeout: 120000 });
  await page.evaluate(() => {
    typeof setLanguage === "function" && setLanguage("en", true);
    document.getElementById("howToOverlay")?.classList.remove("active");
    me.owned = me.owned || [];
    if (!me.owned.includes("pet_dog")) me.owned.push("pet_dog");
    me.pet = "pet_dog";
    me.onboarding = { step: 6, progress: {}, done: true };
    saveMe?.();
    renderQuest?.();
  });
}

async function snap(page) {
  await page.evaluate(() => World3D?.snapScreenshotView?.());
  await page.waitForTimeout(500);
}

(async () => {
  const browser = await chromium.launch();
  const files = [];
  const desk = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await prep(desk);
  await desk.goto(`${base}/?dev=1&solo=1&v=qa13`, { waitUntil: "networkidle", timeout: 120000 });
  await enterGame(desk, "cobalt");

  for (const [loc, name] of DESKTOP_LOCS) {
    await desk.evaluate(id => {
      goLocation(id);
      syncStage3D?.();
    }, loc);
    await desk.waitForTimeout(2800);
    await snap(desk);
    const f = `${out}/${name}`;
    await desk.screenshot({ path: f });
    files.push(f);
    await desk.evaluate(() => World3D?.releaseCaptureFrame?.());
  }

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await prep(mobile);
  await mobile.goto(`${base}/?dev=1&solo=1&v=qa13m`, { waitUntil: "networkidle", timeout: 120000 });
  await enterGame(mobile, "cobalt");
  await mobile.evaluate(() => {
    goLocation("street");
    me.x = 48;
    me.y = 54;
    syncStage3D?.();
  });
  await mobile.waitForTimeout(3200);
  await snap(mobile);
  const mf = `${out}/qa-mobile-street.png`;
  await mobile.screenshot({ path: mf });
  files.push(mf);

  console.log(JSON.stringify({ screenshots: files.map(f => f.replace(`${out}/`, "")) }, null, 2));
  await browser.close();
})();
