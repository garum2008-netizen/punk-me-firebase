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

async function hubShot(page, file) {
  await page.evaluate(() => {
    if (typeof goLocation === "function") goLocation("room");
  });
  await page.waitForTimeout(2200);
  await page.screenshot({ path: file, fullPage: false });
}

(async () => {
  const browser = await chromium.launch();
  const allErrors = [];

  const desk = await browser.newPage({ viewport: { width: 1024, height: 576 } });
  const deskErrs = [];
  trackErrors(desk, deskErrs);
  await desk.goto(`${base}/?dev=1&solo=1&v=hub`, { waitUntil: "networkidle", timeout: 120000 });
  await waitVersion(desk);
  await enterGame(desk);
  await hubShot(desk, `${out}/polish-hub-desktop.png`);
  allErrors.push(...deskErrs);
  await desk.close();

  const mob = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const mobErrs = [];
  trackErrors(mob, mobErrs);
  await mob.goto(`${base}/?dev=1&solo=1&v=hubm`, { waitUntil: "networkidle", timeout: 120000 });
  await waitVersion(mob);
  await enterGame(mob);
  await hubShot(mob, `${out}/polish-hub-mobile.png`);
  await mob.click("#chatToggle");
  await mob.waitForTimeout(600);
  await mob.screenshot({ path: `${out}/polish-hub-mobile-chat.png`, fullPage: false });
  allErrors.push(...mobErrs);
  await mob.close();

  const tab = await browser.newPage({ viewport: { width: 768, height: 1024 } });
  const tabErrs = [];
  trackErrors(tab, tabErrs);
  await tab.goto(`${base}/?dev=1&solo=1&v=hubt`, { waitUntil: "networkidle", timeout: 120000 });
  await waitVersion(tab);
  await enterGame(tab);
  await hubShot(tab, `${out}/polish-hub-tablet.png`);
  allErrors.push(...tabErrs);
  await tab.close();

  console.log(JSON.stringify({
    version: VERSION,
    consoleErrors: [...new Set(allErrors)]
  }, null, 2));
  await browser.close();
})();
