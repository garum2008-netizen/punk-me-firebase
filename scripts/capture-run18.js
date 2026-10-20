const { chromium } = require("playwright");
const fs = require("fs");
const out = "/opt/cursor/artifacts";
fs.mkdirSync(out, { recursive: true });
const base = process.env.PUNK_BASE || "http://127.0.0.1:8765";
const HOWTO_KEY = "punkme_howto_seen";

async function prep(page) {
  await page.addInitScript(k => { try { localStorage.setItem(k, "1"); } catch (e) {} }, HOWTO_KEY);
}

async function dismissHowto(page) {
  await page.evaluate(() => document.getElementById("howToOverlay")?.classList.remove("active"));
}

(async () => {
  const browser = await chromium.launch();
  const files = [];

  const desk = await browser.newPage({ viewport: { width: 1024, height: 576 } });
  await prep(desk);
  await desk.goto(`${base}/?dev=1&solo=1&v=run18`, { waitUntil: "networkidle", timeout: 120000 });
  await desk.waitForSelector("#charSelect.active", { timeout: 30000 });
  await desk.evaluate(() => typeof setLanguage === "function" && setLanguage("en", true));
  await desk.click('.char-pick[data-id="razor"]');
  await desk.waitForTimeout(1200);
  const charSel = `${out}/run18-char-razor.png`;
  await desk.screenshot({ path: charSel });
  files.push(charSel);

  await desk.click('.char-pick[data-id="cobalt"]');
  await desk.locator("#charSelectConfirm").click();
  await desk.waitForFunction(() => !document.getElementById("charSelect")?.classList.contains("active"), { timeout: 25000 });
  await desk.waitForFunction(() => window.World3D?.isReady?.(), { timeout: 120000 });
  await desk.evaluate(() => {
    if (!window.me) return;
    me.owned = me.owned || [];
    if (!me.owned.includes("pet_dog")) me.owned.push("pet_dog");
    me.pet = "pet_dog";
    me.onboarding = { step: 6, progress: {}, done: true };
    saveMe?.();
    syncStage3D?.();
  });
  await dismissHowto(desk);
  await desk.waitForTimeout(800);

  await desk.evaluate(() => {
    goLocation("street");
    World3D?.setGuideTarget?.({ npcId: "razor" });
  });
  await desk.waitForTimeout(3200);
  await desk.evaluate(() => {
    const a = { x: 50, y: 52 };
    me.x = a.x; me.y = a.y;
    syncStage3D?.();
    World3D?.snapScreenshotView?.();
  });
  await desk.waitForTimeout(350);
  const street = `${out}/run18-street-razor.png`;
  await desk.screenshot({ path: street });
  files.push(street);
  await desk.evaluate(() => World3D?.releaseCaptureFrame?.());

  await desk.evaluate(() => goLocation("room"));
  await desk.waitForTimeout(2200);
  await desk.evaluate(async () => {
    syncStage3D?.();
    World3D?.captureDogCloseup?.();
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
  await desk.waitForTimeout(200);
  const dogSide = `${out}/run18-dog-side.png`;
  await desk.screenshot({ path: dogSide });
  files.push(dogSide);
  await desk.evaluate(() => World3D?.releaseCaptureFrame?.());

  await desk.evaluate(async () => {
    World3D?.captureDogThreeQuarter?.();
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
  await desk.waitForTimeout(200);
  const dog34 = `${out}/run18-dog-34.png`;
  await desk.screenshot({ path: dog34 });
  files.push(dog34);
  await desk.evaluate(() => World3D?.releaseCaptureFrame?.());

  await desk.evaluate(() => goLocation("room"));
  await desk.waitForTimeout(2800);
  await desk.evaluate(() => {
    me.x = 50; me.y = 50;
    syncStage3D?.();
    World3D?.snapScreenshotView?.();
  });
  await desk.waitForTimeout(350);
  const home = `${out}/run18-home-gang.png`;
  await desk.screenshot({ path: home });
  files.push(home);
  await desk.evaluate(() => World3D?.releaseCaptureFrame?.());

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await prep(mobile);
  await mobile.goto(`${base}/?dev=1&solo=1&v=run18m`, { waitUntil: "networkidle", timeout: 120000 });
  await mobile.waitForSelector("#charSelect.active", { timeout: 30000 }).catch(() => {});
  const confirm = mobile.locator("#charSelectConfirm");
  if (await confirm.isVisible({ timeout: 8000 }).catch(() => false)) {
    await mobile.click('.char-pick[data-id="cobalt"]');
    await confirm.click();
  }
  await mobile.waitForFunction(() => window.World3D?.isReady?.(), { timeout: 120000 });
  await mobile.evaluate(() => {
    typeof setLanguage === "function" && setLanguage("en", true);
    me.onboarding = { step: 6, progress: {}, done: true };
    me.owned = me.owned || [];
    if (!me.owned.includes("pet_dog")) me.owned.push("pet_dog");
    me.pet = "pet_dog";
    saveMe?.();
    goLocation("street");
    World3D?.setGuideTarget?.({ npcId: "razor" });
    syncStage3D?.();
  });
  await dismissHowto(mobile);
  await mobile.waitForTimeout(3000);
  await mobile.evaluate(() => World3D?.snapScreenshotView?.());
  await mobile.waitForTimeout(300);
  const mobStreet = `${out}/run18-street-mobile.png`;
  await mobile.screenshot({ path: mobStreet });
  files.push(mobStreet);

  const errs = await desk.evaluate(() => window.__pageErrors || []);
  console.log(JSON.stringify({ screenshots: files.map(f => f.replace(`${out}/`, "")), consoleErrors: errs }, null, 2));
  await browser.close();
})();
