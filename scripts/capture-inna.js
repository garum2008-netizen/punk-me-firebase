require("./lib/require-local-capture.js");
const { chromium } = require("playwright");
const fs = require("fs");
const out = "/opt/cursor/artifacts";
fs.mkdirSync(out, { recursive: true });
const base = process.env.PUNK_BASE || "http://127.0.0.1:8765";
const VERSION = "living3d-v8";
const LOCS = ["room", "kitchen", "toilet", "elevator", "street", "roof", "cemetery", "city", "parkour"];
const HOWTO_KEY = "punkme_howto_seen";

async function prepCapture(page) {
  await page.addInitScript(key => {
    try { localStorage.setItem(key, "1"); } catch (e) {}
  }, HOWTO_KEY);
}

async function dismissHowTo(page) {
  await page.evaluate(() => {
    document.getElementById("howToOverlay")?.classList.remove("active");
    document.querySelector(".howto-overlay")?.classList.remove("active");
  });
}

async function enter(page, hero = "vienna") {
  await page.waitForSelector("#charSelect.active", { timeout: 25000 }).catch(() => {});
  const c = page.locator("#charSelectConfirm");
  if (await c.isVisible({ timeout: 8000 }).catch(() => false)) {
    await page.click(`.char-pick[data-id="${hero}"]`);
    await c.click();
  }
  await page.waitForFunction(() => !document.getElementById("charSelect")?.classList.contains("active"), { timeout: 25000 });
  await page.waitForFunction(() => window.World3D?.isReady?.(), { timeout: 90000 });
  await dismissHowTo(page);
  await page.evaluate(() => {
    if (!window.me) return;
    me.owned = me.owned || [];
    if (!me.owned.includes("pet_dog")) me.owned.push("pet_dog");
    me.pet = "pet_dog";
    if (saveMe) saveMe();
  });
  await page.waitForTimeout(900);
}

async function centerAndSnap(page) {
  await page.evaluate(() => {
    if (window.me) {
      me.x = 50;
      me.y = 50;
      if (saveMe) saveMe();
      syncStage3D?.();
    }
    window.World3D?.snapScreenshotView?.();
  });
  await page.waitForTimeout(350);
}

async function shot(page, path) {
  await centerAndSnap(page);
  await page.screenshot({ path, fullPage: false });
  await page.evaluate(() => window.World3D?.releaseCaptureFrame?.());
}

(async () => {
  const browser = await chromium.launch();
  const errs = [];
  const files = [];
  const track = p => {
    p.on("pageerror", e => errs.push(e.message));
    p.on("console", m => {
      if (m.type() === "error" && !/permission_denied|FIREBASE/i.test(m.text())) errs.push(m.text());
    });
  };

  const desk = await browser.newPage({ viewport: { width: 1024, height: 576 } });
  track(desk);
  await prepCapture(desk);
  await desk.goto(`${base}/?dev=1&solo=1&v=inna-cap`, { waitUntil: "networkidle", timeout: 120000 });
  await desk.waitForFunction(v => document.getElementById("gameVersion")?.textContent?.includes(v), VERSION, { timeout: 120000 });
  await enter(desk, "vienna");
  await desk.evaluate(() => {
    if (window.me?.onboarding) window.me.onboarding.done = true;
    window.Onboarding?.render?.();
  });

  for (const loc of LOCS) {
    await desk.evaluate(id => goLocation(id), loc);
    await desk.waitForTimeout(2600);
    await dismissHowTo(desk);
    const f = `${out}/inna-loc-${loc}.png`;
    await shot(desk, f);
    files.push(f);
  }

  await desk.evaluate(() => {
    if (window.me) {
      me.onboarding = { step: 0, progress: {}, done: false };
      goLocation("room");
      window.Onboarding?.init?.();
      window.Onboarding?.syncGuideTarget?.();
    }
  });
  await desk.waitForTimeout(2200);
  await dismissHowTo(desk);
  const questF = `${out}/inna-quest-beacon.png`;
  await shot(desk, questF);
  files.push(questF);

  await desk.evaluate(() => {
    if (window.openHowToPlay) openHowToPlay();
  });
  await desk.waitForTimeout(700);
  const howtoDesk = `${out}/inna-howto-desktop.png`;
  await desk.screenshot({ path: howtoDesk, fullPage: false });
  files.push(howtoDesk);
  await dismissHowTo(desk);

  async function charSelectHero(page, heroId, file) {
    await page.evaluate(() => { if (window.changeCharacter) changeCharacter(); });
    await page.waitForSelector("#charSelect.active", { timeout: 15000 });
    await page.click(`.char-pick[data-id="${heroId}"]`);
    await page.waitForTimeout(2000);
    await page.screenshot({ path: file, fullPage: false });
  }

  await charSelectHero(desk, "cobalt", `${out}/cobalt-char-select.png`);
  files.push(`${out}/cobalt-char-select.png`);

  await desk.evaluate(() => {
    if (window.changeCharacter) changeCharacter();
  });
  await desk.waitForSelector("#charSelect.active", { timeout: 15000 });
  await desk.click('.char-pick[data-id="mohawk"]');
  await desk.waitForTimeout(2000);
  const mohawkChar = `${out}/mohawk-char-select.png`;
  await desk.screenshot({ path: mohawkChar });
  files.push(mohawkChar);
  await desk.click("#charSelectConfirm");
  await desk.waitForFunction(() => !document.getElementById("charSelect")?.classList.contains("active"), { timeout: 20000 });
  await desk.waitForFunction(() => window.World3D?.isReady?.(), { timeout: 90000 });
  await dismissHowTo(desk);
  await desk.waitForTimeout(1000);
  await desk.evaluate(() => goLocation("street"));
  await desk.waitForTimeout(3200);
  await shot(desk, `${out}/gang-cobalt-mohawk-street.png`);
  files.push(`${out}/gang-cobalt-mohawk-street.png`);
  await shot(desk, `${out}/mohawk-street-walk.png`);
  files.push(`${out}/mohawk-street-walk.png`);
  await desk.evaluate(() => goLocation("room"));
  await desk.waitForTimeout(2500);
  await shot(desk, `${out}/mohawk-vienna-home.png`);
  files.push(`${out}/mohawk-vienna-home.png`);
  await desk.evaluate(() => goLocation("roof"));
  await desk.waitForTimeout(2800);
  await shot(desk, `${out}/mohawk-roof.png`);
  files.push(`${out}/mohawk-roof.png`);
  await desk.close();

  const mob = await browser.newPage({ viewport: { width: 390, height: 844 } });
  track(mob);
  await prepCapture(mob);
  await mob.goto(`${base}/?dev=1&solo=1&v=inna-m-cap`, { waitUntil: "networkidle", timeout: 120000 });
  await mob.waitForFunction(v => document.getElementById("gameVersion")?.textContent?.includes(v), VERSION, { timeout: 120000 });
  await enter(mob, "vienna");
  await mob.evaluate(() => goLocation("room"));
  await mob.waitForTimeout(2200);
  await dismissHowTo(mob);
  await centerAndSnap(mob);
  const mobRoom = `${out}/inna-mobile-room.png`;
  await mob.screenshot({ path: mobRoom });
  files.push(mobRoom);
  await mob.evaluate(() => World3D?.releaseCaptureFrame?.());
  await mob.evaluate(() => goLocation("street"));
  await mob.waitForTimeout(2400);
  await dismissHowTo(mob);
  await centerAndSnap(mob);
  const mobStreet = `${out}/inna-mobile-street.png`;
  await mob.screenshot({ path: mobStreet });
  files.push(mobStreet);
  await mob.evaluate(() => World3D?.releaseCaptureFrame?.());
  await mob.close();

  const manifest = files.map(f => f.replace(`${out}/`, ""));
  const reportPath = `${out}/inna-capture-manifest.json`;
  fs.writeFileSync(reportPath, JSON.stringify({ version: VERSION, capturedAt: new Date().toISOString(), screenshots: manifest, consoleErrors: [...new Set(errs)] }, null, 2));
  console.log(JSON.stringify({ version: VERSION, manifest: reportPath, screenshots: manifest, consoleErrors: [...new Set(errs)] }, null, 2));
  await browser.close();
})();
