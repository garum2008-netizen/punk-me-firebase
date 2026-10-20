const { chromium } = require("playwright");
const base = process.env.PUNK_BASE || "http://127.0.0.1:8765";
const HOWTO_KEY = "punkme_howto_seen";
const HEROES = ["vienna", "cobalt", "mohawk", "razor"];
const LOCS = ["room", "kitchen", "toilet", "elevator", "street", "city", "cemetery", "roof", "parkour"];
const MOBILE_LOCS = ["room", "street", "cemetery"];
const LANGS = ["en", "ru", "da"];

async function prep(page) {
  await page.addInitScript(k => {
    try { localStorage.setItem(k, "1"); } catch (e) {}
  }, HOWTO_KEY);
}

async function boot(page, hero) {
  const errors = [];
  page.on("pageerror", e => errors.push(String(e)));
  page.on("console", msg => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  await page.goto(`${base}/?dev=1&solo=1&v=qapass`, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForSelector("#charSelect.active", { timeout: 30000 }).catch(() => {});
  const c = page.locator("#charSelectConfirm");
  if (await c.isVisible({ timeout: 8000 }).catch(() => false)) {
    await page.click(`.char-pick[data-id="${hero}"]`);
    await c.click();
  }
  await page.waitForFunction(() => window.World3D?.isReady?.(), { timeout: 120000 });
  await page.evaluate(() => {
    me.onboarding = { step: 6, progress: {}, done: true };
    saveMe?.();
  });
  return errors;
}

(async () => {
  const report = { heroes: {}, langs: {}, consoleErrors: [] };
  const browser = await chromium.launch();

  for (const hero of HEROES) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await prep(page);
    const errs = await boot(page, hero);
    const locOk = {};
    for (const loc of LOCS) {
      await page.evaluate(id => {
        goLocation(id);
        syncStage3D?.();
      }, loc);
      await page.waitForTimeout(1200);
      const ok = await page.evaluate(
        id => World3D?.getLocation?.() === id,
        loc
      );
      locOk[loc] = ok;
      await page.evaluate(() => {
        for (let i = 0; i < 12; i++) World3D?.nudgePlayer?.(0, -0.15, 1);
      });
      await page.waitForTimeout(400);
    }
    const dogLocs = {};
    await page.evaluate(() => {
      me.owned = me.owned || [];
      if (!me.owned.includes("pet_dog")) me.owned.push("pet_dog");
      me.pet = "pet_dog";
    });
    for (const loc of LOCS) {
      await page.evaluate(id => {
        goLocation(id);
        syncStage3D?.();
      }, loc);
      await page.waitForTimeout(900);
      dogLocs[loc] = await page.evaluate(() => World3D?.isDogActive?.() === true);
    }
    report.heroes[hero] = { locOk, errors: errs, dogLocs };
    report.consoleErrors.push(...errs.map(e => ({ hero, e })));
    await page.close();
  }

  for (const lang of LANGS) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await prep(page);
    await boot(page, "cobalt");
    await page.evaluate(l => setLanguage(l, true), lang);
    await page.waitForTimeout(300);
    const title = await page.evaluate(() => document.getElementById("locTitle")?.textContent || "");
    report.langs[lang] = { locTitle: title };
    await page.close();
  }

  const mob = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await prep(mob);
  await boot(mob, "cobalt");
  report.mobile = {};
  for (const loc of MOBILE_LOCS) {
    await mob.evaluate(id => {
      goLocation(id);
      syncStage3D?.();
    }, loc);
    await mob.waitForTimeout(1500);
    report.mobile[loc] = await mob.evaluate(() => World3D.getLocation());
  }
  await mob.close();
  await browser.close();

  const uniqueErrs = [...new Set(report.consoleErrors.map(x => x.e))].filter(
    e => !/favicon|404|Firebase|ERR_/i.test(e)
  );
  report.uniqueConsoleErrors = uniqueErrs;
  report.pass = uniqueErrs.length === 0;
  console.log(JSON.stringify(report, null, 2));
  process.exit(uniqueErrs.length ? 1 : 0);
})();
