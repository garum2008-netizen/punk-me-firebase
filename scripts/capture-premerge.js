const { chromium } = require("playwright");
const fs = require("fs");
const out = "/opt/cursor/artifacts";
fs.mkdirSync(out, { recursive: true });
const base = process.env.PUNK_BASE || "http://127.0.0.1:8765";

async function boot(page, qs, skipConfirm = false) {
  const errors = [];
  page.on("pageerror", e => errors.push(`pageerror: ${e.message}`));
  page.on("console", m => {
    if (m.type() === "error" && !/permission_denied|FIREBASE WARNING/i.test(m.text())) {
      errors.push(`console: ${m.text()}`);
    }
  });
  await page.goto(`${base}/${qs}`, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForFunction(
    () => document.getElementById("gameVersion")?.textContent?.includes("living3d-v6"),
    { timeout: 120000 }
  );
  if (!skipConfirm) {
    const sel = page.locator("#charSelectConfirm");
    if (await sel.isVisible({ timeout: 8000 }).catch(() => false)) {
      await page.click('.char-pick[data-id="vienna"]').catch(() => {});
      await sel.click();
      await page.waitForTimeout(2000);
    }
  }
  if (!skipConfirm) {
    await page.waitForFunction(() => window.World3D?.isReady?.(), { timeout: 90000 });
  }
  await page.waitForTimeout(1500);
  return errors;
}

async function goLoc(page, locId) {
  await page.evaluate(id => goLocation(id), locId);
  await page.waitForFunction(
    id => window.World3D?.getLocation?.() === id,
    locId,
    { timeout: 20000 }
  );
  await page.waitForTimeout(2500);
}

async function shot(page, pose, file) {
  await page.evaluate(p => World3D.captureCloseup(p), pose);
  await page.waitForTimeout(150);
  await page.screenshot({ path: file });
  await page.evaluate(() => World3D.releaseCaptureFrame());
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const allErrors = [];

  allErrors.push(...await boot(page, "?dev=1&solo=1&v=pre", true));
  await page.waitForSelector("#charSelect.active", { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${out}/pr5-char-select.png` });

  allErrors.push(...await boot(page, "?dev=1&solo=1&v=pre2"));
  await goLoc(page, "room");
  await shot(page, "front", `${out}/pr5-closeup-front.png`);

  await goLoc(page, "kitchen");
  await page.screenshot({ path: `${out}/pr5-kitchen.png` });

  await boot(page, "?dev=1&demo3=1&solo=1&v=street");
  await goLoc(page, "street");
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `${out}/pr5-street.png` });

  console.log(JSON.stringify({
    version: await page.textContent("#gameVersion"),
    consoleErrors: [...new Set(allErrors)]
  }, null, 2));
  await browser.close();
})();
