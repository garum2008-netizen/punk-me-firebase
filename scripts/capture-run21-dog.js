require("./lib/require-local-capture.js");
const { chromium } = require("playwright");
const fs = require("fs");
const out = "/opt/cursor/artifacts";
fs.mkdirSync(out, { recursive: true });
const base = process.env.PUNK_BASE || "http://127.0.0.1:8765";
const HOWTO_KEY = "punkme_howto_seen";
const LOCS = [
  "room", "kitchen", "toilet", "elevator", "street", "city", "cemetery", "roof", "parkour"
];

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
    me.owned = me.owned || [];
    if (!me.owned.includes("pet_dog")) me.owned.push("pet_dog");
    me.pet = "pet_dog";
    me.onboarding = { step: 6, progress: {}, done: true };
    saveMe?.();
    World3D?.setGuideTarget?.(null);
  });
}

async function snap(page) {
  await page.evaluate(() => {
    syncStage3D?.();
    World3D?.snapScreenshotView?.();
  });
  await page.waitForTimeout(600);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await prep(page);
  await page.goto(`${base}/?dev=1&solo=1&v=run21`, { waitUntil: "networkidle", timeout: 120000 });
  await enter(page);
  const files = [];

  for (const loc of ["elevator", "kitchen"]) {
    await page.evaluate(id => {
      goLocation(id);
      syncStage3D?.();
    }, loc);
    await page.waitForTimeout(3000);
    await snap(page);
    const f = `${out}/qa-run21-${loc}.png`;
    await page.screenshot({ path: f });
    files.push(f);
    await page.evaluate(() => World3D?.releaseCaptureFrame?.());
  }

  const tileDir = `${out}/run21-tiles`;
  fs.mkdirSync(tileDir, { recursive: true });
  const shots = [];
  for (const loc of LOCS) {
    await page.evaluate(id => {
      goLocation(id);
      syncStage3D?.();
    }, loc);
    await page.waitForTimeout(2200);
    await snap(page);
    const tilePath = `${tileDir}/${loc}.png`;
    await page.screenshot({ path: tilePath });
    shots.push({ loc, tilePath });
    await page.evaluate(() => World3D?.releaseCaptureFrame?.());
  }
  const gridPage = await browser.newPage({ viewport: { width: 1284, height: 732 } });
  const cells = shots.map(
    s =>
      `<div style="position:relative"><img src="file://${s.tilePath}" width="420" height="236" style="display:block"/><span style="position:absolute;top:6px;left:8px;color:#0ff;font:bold 13px system-ui">${s.loc}</span></div>`
  ).join("");
  await gridPage.setContent(
    `<body style="margin:0;background:#0a0612"><div style="display:grid;grid-template-columns:repeat(3,420px);gap:6px;padding:6px">${cells}</div></body>`
  );
  await gridPage.waitForTimeout(400);
  const gridPath = `${out}/qa-run21-dog-9loc-grid.png`;
  await gridPage.screenshot({ path: gridPath });
  await gridPage.close();
  files.push(gridPath);

  console.log(JSON.stringify({ screenshots: files.map(f => f.replace(`${out}/`, "")) }, null, 2));
  await browser.close();
})();
