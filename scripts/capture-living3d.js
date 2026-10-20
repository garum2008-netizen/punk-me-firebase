const { chromium } = require("playwright");
const fs = require("fs");
const out = "/opt/cursor/artifacts";
fs.mkdirSync(out, { recursive: true });
const base = process.env.PUNK_BASE || "http://127.0.0.1:8765";
const URL = `${base}/?dev=1&solo=1&v=living3d`;

async function waitGame(page) {
  await page.goto(URL, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForFunction(
    () => document.getElementById("gameVersion")?.textContent?.includes("living3d"),
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
    () => window.World3D?.isReady?.() && window.Scene3D?.isReady?.(),
    { timeout: 90000 }
  );
  await page.waitForTimeout(4500);
}

async function go(page, loc) {
  await page.evaluate(l => { if (typeof goLocation === "function") goLocation(l); });
  await page.waitForTimeout(4500);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await waitGame(page);
  await page.evaluate(() => {
    if (typeof buyItem === "function") buyItem("pet_dog");
    window.me = window.me || {};
    window.me._animState = "idle";
  });
  await page.waitForTimeout(800);

  await go(page, "room");
  await page.screenshot({ path: `${out}/living3d-room.png`, fullPage: false });

  await go(page, "kitchen");
  await page.screenshot({ path: `${out}/living3d-kitchen.png` });

  await go(page, "roof");
  await page.screenshot({ path: `${out}/living3d-roof.png` });

  await go(page, "street");
  await page.screenshot({ path: `${out}/living3d-street.png` });

  const info = await page.evaluate(() => {
    const canvas = document.getElementById("stage3d");
    return {
      version: document.getElementById("gameVersion")?.textContent,
      mode: document.body.className,
      worldReady: window.World3D?.isReady?.(),
      canvasW: canvas?.width,
      online: document.getElementById("onlineCount")?.textContent
    };
  });
  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})();
