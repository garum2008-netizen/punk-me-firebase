require('./lib/require-local-capture.js');
const { chromium } = require("playwright");
const fs = require("fs");
const out = "/opt/cursor/artifacts";
fs.mkdirSync(out, { recursive: true });
const base = process.env.PUNK_BASE || "http://127.0.0.1:8765";
const URL = `${base}/?dev=1&v=world3d-v1`;

async function waitGame(page) {
  await page.goto(URL, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForFunction(
    () => document.getElementById("gameVersion")?.textContent?.includes("world3d"),
    { timeout: 120000 }
  );
  const sel = page.locator("#charSelectConfirm");
  if (await sel.isVisible({ timeout: 8000 }).catch(() => false)) {
    await page.click('.char-pick[data-id="razor"]').catch(() => {});
    await sel.click();
    await page.waitForTimeout(2500);
  }
  await page.waitForFunction(() => document.body.classList.contains("mode-world3d"), { timeout: 60000 });
  await page.waitForTimeout(3500);
}

async function go(page, loc) {
  await page.evaluate(l => { if (typeof goLocation === "function") goLocation(l); });
  await page.waitForTimeout(4000);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await waitGame(page);
  await page.evaluate(() => buyItem && buyItem("pet_dog"));
  await page.waitForTimeout(500);
  await page.click('button[data-lang="en"]');
  await page.waitForTimeout(400);
  await go(page, "room");
  await page.screenshot({ path: `${out}/world3d-room-en.png` });
  await go(page, "street");
  await page.screenshot({ path: `${out}/world3d-street-en.png` });
  await page.click('button[data-lang="da"]');
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/world3d-street-da.png` });
  const info = await page.evaluate(() => ({
    version: document.getElementById("gameVersion")?.textContent,
    bgHidden: document.querySelector(".bg-stack")?.offsetParent === null,
    entitiesHidden: document.getElementById("entities")?.innerHTML === "",
    mode: document.body.className
  }));
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})();
