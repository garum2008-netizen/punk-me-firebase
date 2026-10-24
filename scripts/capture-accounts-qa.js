#!/usr/bin/env node
const { chromium, webkit } = require("playwright");
const fs = require("fs");
const path = require("path");

const OUT = path.join("/workspace/qa", "accounts");
const BASE = process.env.PUNK_BASE || "http://127.0.0.1:8765";
const V = "living3d-v22r5-accounts";
fs.mkdirSync(OUT, { recursive: true });

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, name), fullPage: false });
}

(async () => {
  const browser = await chromium.launch();
  const desk = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await desk.goto(`${BASE}/?solo=1&v=${V}`, { waitUntil: "domcontentloaded" });
  await desk.waitForSelector("#loading", { timeout: 30000 });
  await shot(desk, "desktop-loading-signin.png");
  await desk.waitForSelector(".char-pick", { timeout: 90000 });
  await shot(desk, "desktop-char-select-signin.png");
  await desk.click('.char-pick[data-id="cobalt"]');
  await desk.click("#charSelectConfirm");
  await desk.waitForFunction(() => window.me?.characterId, undefined, { timeout: 120000 });
  await desk.waitForTimeout(1500);
  await desk.locator("#game").screenshot({ path: path.join(OUT, "desktop-hud-signin.png") });
  await desk.evaluate(() => document.getElementById("accountModal")?.classList.add("active"));
  await shot(desk, "desktop-account-modal.png");
  await desk.goto(`${BASE}/owner.html?v=${V}`);
  await desk.waitForTimeout(1200);
  await shot(desk, "desktop-owner-signin.png");
  await desk.goto(`${BASE}/subscribe.html?v=${V}`);
  await desk.waitForTimeout(800);
  await shot(desk, "desktop-subscribe-account-link.png");
  await browser.close();

  try {
    const wb = await webkit.launch();
    const mob = await wb.newPage({ viewport: { width: 390, height: 844 } });
    await mob.goto(`${BASE}/?solo=1&v=${V}`);
    await mob.waitForSelector(".char-pick", { timeout: 90000 });
    await mob.click('.char-pick[data-id="cobalt"]');
    await mob.click("#charSelectConfirm");
    await mob.waitForFunction(() => window.me?.characterId, undefined, { timeout: 120000 });
    await mob.waitForTimeout(1000);
    await mob.locator("#game").screenshot({ path: path.join(OUT, "mobile-ingame-signin.png") });
    await wb.close();
  } catch (e) {
    const mob = await chromium.launch();
    const p = await mob.newPage({ viewport: { width: 390, height: 844 } });
    await p.goto(`${BASE}/?solo=1&v=${V}`);
    await p.waitForSelector(".char-pick", { timeout: 90000 });
    await p.click('.char-pick[data-id="cobalt"]');
    await p.click("#charSelectConfirm");
    await p.waitForFunction(() => window.me?.characterId, undefined, { timeout: 120000 });
    await p.locator("#game").screenshot({ path: path.join(OUT, "mobile-chromium-ingame-signin.png") });
    await mob.close();
  }
  console.log("done", OUT);
})();
