require("./lib/require-local-capture.js");
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const out = "/opt/cursor/artifacts";
fs.mkdirSync(out, { recursive: true });

const base = process.env.PUNK_BASE || "http://127.0.0.1:8765";
const URL = `${base}/?dev=1&v=cartoon-v2`;

async function waitGame(page) {
  await page.goto(URL, { waitUntil: "networkidle", timeout: 120000 });
  await page.waitForFunction(
    () => document.getElementById("gameVersion")?.textContent?.includes("cartoon-v2"),
    { timeout: 120000 }
  );
  await page.waitForFunction(() => document.body.classList.contains("mode-3d"), { timeout: 60000 });
  await page.waitForTimeout(2500);
}

async function goLoc(page, id) {
  await page.evaluate(loc => {
    if (typeof goLocation === "function") goLocation(loc);
  }, id);
  await page.waitForTimeout(3500);
}

async function buyDog(page) {
  await page.evaluate(() => {
    if (typeof buyItem === "function") buyItem("pet_dog");
  });
  await page.waitForTimeout(800);
}

async function captureSet(page, lang, suffix) {
  await page.click(`button[data-lang="${lang}"]`);
  await page.waitForTimeout(600);
  await goLoc(page, "room");
  await page.screenshot({ path: path.join(out, `cartoon-room-${suffix}.png`), fullPage: false });
  await goLoc(page, "street");
  await page.screenshot({ path: path.join(out, `cartoon-street-${suffix}.png`), fullPage: false });
  await goLoc(page, "cemetery");
  await page.screenshot({ path: path.join(out, `cartoon-cemetery-${suffix}.png`), fullPage: false });
}

(async () => {
  const browser = await chromium.launch();
  const desktop = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await waitGame(desktop);
  await buyDog(desktop);
  await captureSet(desktop, "en", "en");
  await captureSet(desktop, "da", "da");

  const ipad = await browser.newPage({ viewport: { width: 820, height: 1180 } });
  await waitGame(ipad);
  await buyDog(ipad);
  await ipad.click('button[data-lang="en"]');
  await goLoc(ipad, "street");
  const fps = await ipad.evaluate(async () => {
    const canvas = document.getElementById("stage3d");
    if (!canvas) return null;
    let frames = 0;
    const start = performance.now();
    await new Promise(resolve => {
      const tick = () => {
        frames++;
        if (performance.now() - start >= 1000) resolve();
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    return frames;
  });
  await ipad.screenshot({ path: path.join(out, "cartoon-street-ipad.png") });

  const info = await desktop.evaluate(() => ({
    version: document.getElementById("gameVersion")?.textContent,
    mode3d: document.body.classList.contains("mode-3d"),
    coins: document.getElementById("coins")?.textContent,
    navSample: document.querySelector("#navQuick button")?.textContent,
    locTitle: document.getElementById("locTitle")?.textContent,
    quest: document.getElementById("questBox")?.textContent?.slice(0, 80)
  }));
  console.log(JSON.stringify({ ...info, ipadFpsApprox: fps }, null, 2));
  await browser.close();
})();
