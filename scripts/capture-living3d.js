require('./lib/require-local-capture.js');
const { chromium } = require("playwright");
const fs = require("fs");
const out = "/opt/cursor/artifacts";
fs.mkdirSync(out, { recursive: true });
const base = process.env.PUNK_BASE || "http://127.0.0.1:8765";

async function boot(page, qs) {
  await page.goto(`${base}/${qs}`, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForFunction(
    () => document.getElementById("gameVersion")?.textContent?.includes("living3d-v6"),
    { timeout: 120000 }
  );
  const sel = page.locator("#charSelectConfirm");
  if (await sel.isVisible({ timeout: 8000 }).catch(() => false)) {
    await page.click('.char-pick[data-id="vienna"]').catch(() => {});
    await sel.click();
    await page.waitForTimeout(2000);
  }
  await page.waitForFunction(() => window.World3D?.isReady?.(), { timeout: 90000 });
  await page.waitForTimeout(1500);
}

async function goLoc(page, locId) {
  await page.evaluate(id => goLocation(id), locId);
  await page.waitForFunction(
    id => window.World3D?.getLocation?.() === id,
    locId,
    { timeout: 20000 }
  );
  await page.waitForTimeout(3000);
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

  await boot(page, "?dev=1&solo=1&v=cap");
  await goLoc(page, "room");

  await shot(page, "front", `${out}/living3d-v6-closeup-front.png`);
  await shot(page, "idle", `${out}/living3d-v6-closeup-idle.png`);
  await shot(page, "walk", `${out}/living3d-v6-closeup-walk.png`);
  await page.evaluate(() => World3D.nudgePlayer(0.12, 0, 12));
  await shot(page, "run", `${out}/living3d-v6-closeup-run.png`);
  for (const loc of ["kitchen", "street"]) {
    await goLoc(page, loc);
    await page.screenshot({ path: `${out}/living3d-v6-${loc}.png` });
  }

  await boot(page, "?dev=1&demo3=1&solo=1&v=party");
  await page.evaluate(() => { if (typeof buyItem === "function") buyItem("pet_dog"); });
  await goLoc(page, "room");
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${out}/living3d-v6-room-party-dog.png` });

  console.log(JSON.stringify({
    version: await page.textContent("#gameVersion"),
    loc: await page.evaluate(() => World3D.getLocation())
  }, null, 2));
  await browser.close();
})();
