const { chromium } = require("playwright");
const fs = require("fs");
const out = "/opt/cursor/artifacts";
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto("https://halloween.punk.contractbot.dk/", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForFunction(() => {
    const el = document.getElementById("loading");
    return !el || el.style.display === "none";
  }, { timeout: 45000 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${out}/live-room-mvp.png` });
  const ver = await page.textContent("#gameVersion");
  console.log("version:", ver);
  await browser.close();
})();
