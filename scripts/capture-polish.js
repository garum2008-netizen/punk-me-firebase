const { chromium } = require("playwright");
const fs = require("fs");
const out = "/opt/cursor/artifacts";
fs.mkdirSync(out, { recursive: true });
const base = process.env.PUNK_BASE || "http://127.0.0.1:8765";
const VERSION = "living3d-v7";

function trackErrors(page, bucket) {
  page.on("pageerror", e => bucket.push(`pageerror: ${e.message}`));
  page.on("console", m => {
    if (m.type() === "error" && !/permission_denied|FIREBASE WARNING/i.test(m.text())) {
      bucket.push(`console: ${m.text()}`);
    }
  });
}

async function waitVersion(page) {
  await page.waitForFunction(
    v => document.getElementById("gameVersion")?.textContent?.includes(v),
    VERSION,
    { timeout: 120000 }
  );
}

async function enterGame(page) {
  await page.waitForSelector("#charSelect.active", { timeout: 20000 }).catch(() => {});
  const confirm = page.locator("#charSelectConfirm");
  if (await confirm.isVisible({ timeout: 8000 }).catch(() => false)) {
    await page.click('.char-pick[data-id="razor"]');
    await confirm.click();
  }
  await page.waitForFunction(
    () => !document.getElementById("charSelect")?.classList.contains("active"),
    { timeout: 20000 }
  );
  await page.waitForFunction(() => window.World3D?.isReady?.(), { timeout: 90000 });
  await page.waitForTimeout(1500);
}

(async () => {
  const browser = await chromium.launch();
  const allErrors = [];

  for (const id of ["razor", "vienna", "cobalt", "mohawk"]) {
    const page = await browser.newPage({ viewport: { width: 1024, height: 576 } });
    const errs = [];
    trackErrors(page, errs);
    await page.goto(`${base}/?dev=1&solo=1&v=${id}`, { waitUntil: "networkidle", timeout: 120000 });
    await waitVersion(page);
    await page.evaluate(() => CharSelect.open(() => {}));
    await page.waitForSelector("#charSelect.active", { timeout: 15000 });
    await page.click(`.char-pick[data-id="${id}"]`);
    await page.waitForTimeout(2200);
    await page.screenshot({ path: `${out}/polish-char-${id}.png` });
    allErrors.push(...errs);
    await page.close();
  }

  const desk = await browser.newPage({ viewport: { width: 1024, height: 576 } });
  const deskErrs = [];
  trackErrors(desk, deskErrs);
  await desk.goto(`${base}/?dev=1&solo=1&v=hub`, { waitUntil: "networkidle", timeout: 120000 });
  await waitVersion(desk);
  await enterGame(desk);
  await desk.evaluate(() => {
    if (typeof goLocation === "function") goLocation("room");
  });
  await desk.waitForTimeout(2500);
  await desk.screenshot({ path: `${out}/polish-hub-desktop.png`, fullPage: false });
  allErrors.push(...deskErrs);
  await desk.close();

  const mob = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const mobErrs = [];
  trackErrors(mob, mobErrs);
  await mob.goto(`${base}/?dev=1&solo=1&v=hubm`, { waitUntil: "networkidle", timeout: 120000 });
  await waitVersion(mob);
  await enterGame(mob);
  await mob.evaluate(() => {
    if (typeof goLocation === "function") goLocation("room");
  });
  await mob.waitForTimeout(2500);
  await mob.screenshot({ path: `${out}/polish-hub-mobile.png`, fullPage: false });
  allErrors.push(...mobErrs);
  await mob.close();

  console.log(JSON.stringify({
    version: VERSION,
    consoleErrors: [...new Set(allErrors)]
  }, null, 2));
  await browser.close();
})();
