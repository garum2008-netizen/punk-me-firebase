const { chromium } = require("playwright");
const fs = require("fs");
const out = "/opt/cursor/artifacts";
fs.mkdirSync(out, { recursive: true });
const base = process.env.PUNK_BASE || "http://127.0.0.1:8765";

async function waitGame(page) {
  const URL = `${base}/?dev=1&v=living3d2`;
  await page.goto(URL, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForFunction(
    () => document.getElementById("gameVersion")?.textContent?.includes("living3d-v2"),
    { timeout: 120000 }
  );
  const sel = page.locator("#charSelectConfirm");
  if (await sel.isVisible({ timeout: 8000 }).catch(() => false)) {
    await page.click('.char-pick[data-id="razor"]').catch(() => {});
    await sel.click();
    await page.waitForTimeout(2500);
  }
  await page.waitForFunction(() => document.body.classList.contains("mode-world3d"), { timeout: 60000 });
  await page.waitForFunction(
    () => window.World3D?.isReady?.(),
    { timeout: 90000 }
  );
  await page.waitForTimeout(2000);
}

async function goLoc(page, locId) {
  await page.evaluate(id => {
    if (typeof goLocation === "function") goLocation(id);
  }, locId);
  await page.waitForFunction(
    id => window.World3D?.getLocation?.() === id,
    locId,
    { timeout: 20000 }
  );
  await page.waitForTimeout(3500);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await waitGame(page);

  const locs = ["room", "kitchen", "roof", "street", "cemetery"];
  for (const loc of locs) {
    await goLoc(page, loc);
    const info = await page.evaluate(id => ({
      loc: window.World3D?.getLocation?.(),
      title: document.getElementById("locTitle")?.textContent
    }), loc);
    console.log("shot", loc, info);
    await page.screenshot({ path: `${out}/living3d-v2-${loc}.png` });
  }

  await page.goto(`${base}/?dev=1&demo3=1&v=living3d2party`, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForFunction(() => window.World3D?.isReady?.(), { timeout: 90000 });
  await page.evaluate(() => {
    if (typeof buyItem === "function") buyItem("pet_dog");
  });
  await goLoc(page, "street");
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${out}/living3d-v2-street-party-dog.png` });

  const summary = await page.evaluate(() => ({
    version: document.getElementById("gameVersion")?.textContent,
    loc: window.World3D?.getLocation?.()
  }));
  console.log(JSON.stringify(summary, null, 2));
  await browser.close();
})();
