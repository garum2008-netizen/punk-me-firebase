const { chromium } = require("playwright");
const fs = require("fs");
const out = "/opt/cursor/artifacts";
fs.mkdirSync(out, { recursive: true });

const URL = "https://halloween.punk.contractbot.dk/";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const logs = [];
  page.on("console", (m) => logs.push(m.type() + ": " + m.text()));
  page.on("pageerror", (e) => logs.push("PAGEERROR: " + e.message));

  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 });

  const hasGameJs = await page.evaluate(() => typeof firebase !== "undefined" && !!document.querySelector('script[src*="game.js"]'));
  const hasCss = await page.evaluate(() => !!document.querySelector('link[href*="game.css"]'));

  await page.waitForFunction(
    () => {
      const loading = document.getElementById("loading");
      const coins = document.getElementById("coins");
      return loading && loading.style.display === "none" && coins && coins.textContent && coins.textContent !== "…";
    },
    { timeout: 90000 }
  );

  const version = await page.textContent("#gameVersion");
  const coins = await page.textContent("#coins");
  const loc = await page.textContent("#locTitle");
  const online = await page.textContent("#onlineCount");

  await page.screenshot({ path: `${out}/live-verify-playable.png`, fullPage: false });

  await page.click('button.btn:has-text("Лавка")');
  await page.waitForSelector("#shopModal.active", { timeout: 5000 });
  await page.screenshot({ path: `${out}/live-verify-shop.png` });

  const roomLayer = await page.$("#roomLayer");
  const box = await roomLayer.boundingBox();
  if (box) {
    await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.5);
    await page.waitForTimeout(800);
  }
  await page.screenshot({ path: `${out}/live-verify-movement.png` });

  let changedLoc = loc;
  const kitchen = page.locator('.hotspot.door[data-label="Кухня"]');
  if (await kitchen.count()) {
    await kitchen.click({ force: true });
    await page.waitForTimeout(1200);
    changedLoc = await page.textContent("#locTitle");
  }

  const report = {
    url: URL,
    playable: hasGameJs && hasCss && version && version.includes("mvp-2026-10-20") && coins !== "…" && changedLoc !== loc,
    noPageErrors: !logs.some((l) => l.startsWith("PAGEERROR")),
    version,
    coins,
    locBefore: loc,
    locAfter: changedLoc,
    online,
    console: logs.slice(-15)
  };
  fs.writeFileSync(`${out}/live-verify-report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));

  if (!report.playable) process.exit(1);
  await browser.close();
})();
