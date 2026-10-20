const { chromium } = require("playwright");
const fs = require("fs");
const out = "/opt/cursor/artifacts";
fs.mkdirSync(out, { recursive: true });
const base = process.env.PUNK_BASE || "http://127.0.0.1:8765";
const VERSION = "living3d-v8";
const LOCS = ["room", "kitchen", "toilet", "elevator", "street", "roof", "cemetery", "city", "parkour"];

async function enter(page) {
  await page.waitForSelector("#charSelect.active", { timeout: 25000 }).catch(() => {});
  const c = page.locator("#charSelectConfirm");
  if (await c.isVisible({ timeout: 8000 }).catch(() => false)) {
    await page.click('.char-pick[data-id="vienna"]');
    await c.click();
  }
  await page.waitForFunction(() => !document.getElementById("charSelect")?.classList.contains("active"), { timeout: 25000 });
  await page.waitForFunction(() => window.World3D?.isReady?.(), { timeout: 90000 });
  await page.waitForTimeout(1200);
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
  await desk.goto(`${base}/?dev=1&solo=1&v=inna`, { waitUntil: "networkidle", timeout: 120000 });
  await desk.waitForFunction(v => document.getElementById("gameVersion")?.textContent?.includes(v), VERSION, { timeout: 120000 });
  await enter(desk);
  for (const loc of LOCS) {
    await desk.evaluate(id => goLocation(id), loc);
    await desk.waitForTimeout(2200);
    const f = `${out}/inna-loc-${loc}.png`;
    await desk.screenshot({ path: f });
    files.push(f);
  }
  await desk.screenshot({ path: `${out}/inna-quest-tracker.png` });
  files.push(`${out}/inna-quest-tracker.png`);
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
  await desk.waitForTimeout(1200);
  await desk.evaluate(() => { me.characterId = "mohawk"; if (saveMe) saveMe(); syncStage3D?.(); });
  await desk.evaluate(() => goLocation("street"));
  await desk.waitForTimeout(2800);
  const mohawkStreet = `${out}/mohawk-street-walk.png`;
  await desk.screenshot({ path: mohawkStreet });
  files.push(mohawkStreet);
  await desk.evaluate(() => goLocation("room"));
  await desk.waitForTimeout(2500);
  const homeDuo = `${out}/mohawk-vienna-home.png`;
  await desk.screenshot({ path: homeDuo });
  files.push(homeDuo);
  await desk.evaluate(() => goLocation("roof"));
  await desk.waitForTimeout(2800);
  const mohawkRoof = `${out}/mohawk-roof.png`;
  await desk.screenshot({ path: mohawkRoof });
  files.push(mohawkRoof);
  await desk.close();

  const mob = await browser.newPage({ viewport: { width: 390, height: 844 } });
  track(mob);
  await mob.goto(`${base}/?dev=1&solo=1&v=inna-m`, { waitUntil: "networkidle", timeout: 120000 });
  await mob.waitForFunction(v => document.getElementById("gameVersion")?.textContent?.includes(v), VERSION, { timeout: 120000 });
  await enter(mob);
  await mob.evaluate(() => goLocation("room"));
  await mob.waitForTimeout(2000);
  await mob.screenshot({ path: `${out}/inna-mobile-room.png` });
  files.push(`${out}/inna-mobile-room.png`);
  await mob.evaluate(() => goLocation("street"));
  await mob.waitForTimeout(2200);
  await mob.screenshot({ path: `${out}/inna-mobile-street.png` });
  files.push(`${out}/inna-mobile-street.png`);
  await mob.evaluate(() => document.getElementById("btnHowTo")?.click());
  await mob.waitForTimeout(600);
  const howto = `${out}/inna-howto-mobile.png`;
  await mob.screenshot({ path: howto });
  files.push(howto);
  await mob.evaluate(() => document.querySelector(".howto-close")?.click());
  await mob.close();

  console.log(JSON.stringify({ version: VERSION, screenshots: files.map(f => f.replace(`${out}/`, "")), consoleErrors: [...new Set(errs)] }, null, 2));
  await browser.close();
})();
