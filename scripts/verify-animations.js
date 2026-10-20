const { chromium } = require("playwright");
const fs = require("fs");
const out = "/opt/cursor/artifacts";
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto("https://halloween.punk.contractbot.dk/?v=live-anim", { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForFunction(() => {
    const v = document.getElementById("gameVersion");
    return v && v.textContent && v.textContent.includes("mvp-live-anim");
  }, { timeout: 90000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}/live-anim-room.png` });
  // street for night creatures
  await page.locator('.hotspot.door[data-label="Лифт"]').click({ force: true }).catch(() => {});
  await page.waitForTimeout(800);
  await page.locator('.hotspot.door[data-label="Улица"]').click({ force: true }).catch(() => {});
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}/live-anim-street.png` });
  const hasCanvas = await page.$("#lifeCanvas");
  const hasLifeJs = await page.evaluate(() => typeof LifeEngine !== "undefined");
  const ambients = await page.$$(".ambient-life");
  console.log(JSON.stringify({ version: await page.textContent("#gameVersion"), hasCanvas: !!hasCanvas, hasLifeJs, ambients: ambients.length }, null, 2));
  await browser.close();
})();
