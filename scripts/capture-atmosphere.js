require("./lib/require-local-capture.js");
const { chromium } = require("playwright");
const fs = require("fs");
const out = "/opt/cursor/artifacts";
fs.mkdirSync(out, { recursive: true });
const base = process.env.PUNK_BASE || "http://127.0.0.1:8765";
const HOWTO_KEY = "punkme_howto_seen";

async function prep(page) {
  await page.addInitScript(k => { try { localStorage.setItem(k, "1"); } catch (e) {} }, HOWTO_KEY);
}

async function enterDesktop(page, hero = "cobalt") {
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
  });
}

async function snap(page) {
  await page.evaluate(() => World3D?.snapScreenshotView?.());
  await page.waitForTimeout(450);
}

(async () => {
  const browser = await chromium.launch();
  const files = [];
  const desk = await browser.newPage({ viewport: { width: 1024, height: 576 } });
  await prep(desk);
  await desk.goto(`${base}/?dev=1&solo=1&v=atmo12`, { waitUntil: "networkidle", timeout: 120000 });
  await enterDesktop(desk, "cobalt");

  await desk.evaluate(() => {
    goLocation("street");
    World3D?.setGuideTarget?.({ npcId: "razor" });
    me.x = 46; me.y = 62;
    syncStage3D?.();
  });
  await desk.waitForTimeout(4000);
  await snap(desk);
  const streetNpc = `${out}/atmo-street-razor-npc.png`;
  await desk.screenshot({ path: streetNpc });
  files.push(streetNpc);
  await desk.evaluate(() => World3D?.releaseCaptureFrame?.());

  await desk.evaluate(() => {
    me.characterId = "razor";
    me.avatar = getCharacterDef("razor").poster;
    goLocation("street");
    me.x = 50; me.y = 50;
    syncStage3D?.();
  });
  await desk.waitForTimeout(1500);
  await desk.evaluate(() => {
    for (let i = 0; i < 24; i++) World3D?.nudgePlayer?.(0, -0.22, 1);
  });
  await desk.waitForTimeout(600);
  await snap(desk);
  const streetWalk = `${out}/atmo-street-razor-walk.png`;
  await desk.screenshot({ path: streetWalk });
  files.push(streetWalk);
  await desk.evaluate(() => World3D?.releaseCaptureFrame?.());

  for (const [loc, name] of [
    ["cemetery", "atmo-cemetery.png"],
    ["room", "atmo-home-bloom.png"],
    ["roof", "atmo-roof.png"],
    ["parkour", "atmo-parkour.png"]
  ]) {
    await desk.evaluate(id => goLocation(id), loc);
    await desk.waitForTimeout(3200);
    await snap(desk);
    const f = `${out}/${name}`;
    await desk.screenshot({ path: f });
    files.push(f);
    await desk.evaluate(() => World3D?.releaseCaptureFrame?.());
  }

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await prep(mobile);
  await mobile.goto(`${base}/?dev=1&solo=1&v=atmo12m`, { waitUntil: "networkidle", timeout: 120000 });
  await enterDesktop(mobile, "cobalt");
  await mobile.evaluate(() => {
    goLocation("street");
    World3D?.setGuideTarget?.({ npcId: "razor" });
    me.x = 48; me.y = 54;
    syncStage3D?.();
  });
  await mobile.waitForTimeout(3200);
  await mobile.evaluate(() => World3D?.snapScreenshotView?.());
  await mobile.waitForTimeout(400);
  const mf = `${out}/atmo-street-mobile.png`;
  await mobile.screenshot({ path: mf });
  files.push(mf);

  console.log(JSON.stringify({ screenshots: files.map(f => f.replace(`${out}/`, "")) }, null, 2));
  await browser.close();
})();
