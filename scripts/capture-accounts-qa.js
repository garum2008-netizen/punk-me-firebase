#!/usr/bin/env node
const { chromium, webkit } = require("playwright");
const fs = require("fs");
const path = require("path");

const OUT = path.join("/workspace/qa", "accounts");
const BASE = process.env.PUNK_BASE || "http://127.0.0.1:8765";
const V = "living3d-v22r5-accounts-r1";
fs.mkdirSync(OUT, { recursive: true });

const pageErrors = [];

function trackPage(page, label) {
  page.on("pageerror", err => {
    pageErrors.push({ label, message: err.message });
  });
  page.on("console", msg => {
    if (msg.type() === "error") pageErrors.push({ label, message: msg.text() });
  });
}

async function waitFirebase(page) {
  await page.waitForFunction(
    () => window.firebase?.apps?.length > 0,
    undefined,
    { timeout: 120000 }
  );
}

(async () => {
  const browser = await chromium.launch();
  const desk = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  trackPage(desk, "desktop");
  await desk.goto(`${BASE}/?solo=1&v=${V}`, { waitUntil: "domcontentloaded" });
  await waitFirebase(desk);
  await desk.waitForSelector("#loading", { timeout: 30000 });
  await desk.locator("#loading").screenshot({ path: path.join(OUT, "desktop-loading-signin.png") });
  await desk.waitForSelector(".char-pick", { timeout: 90000 });
  await desk.locator("#charSelect").screenshot({ path: path.join(OUT, "desktop-char-select-signin.png") });
  await desk.click('.char-pick[data-id="cobalt"]');
  await desk.click("#charSelectConfirm");
  await desk.waitForFunction(() => window.me?.characterId, undefined, { timeout: 120000 });
  await desk.waitForTimeout(1200);
  await desk.locator("#game").screenshot({ path: path.join(OUT, "desktop-hud-signin.png") });
  await desk.evaluate(() => {
    document.getElementById("howToOverlay")?.classList.remove("active");
    const m = document.getElementById("accountModal");
    m?.classList.add("active");
    document.body.classList.add("account-modal-open");
  });
  await desk.locator("#accountModal .account-panel").screenshot({ path: path.join(OUT, "desktop-account-modal.png") });
  await desk.goto(`${BASE}/owner.html?v=${V}`);
  await desk.waitForTimeout(1500);
  await desk.locator(".owner-wrap").screenshot({ path: path.join(OUT, "desktop-owner-signin.png") });
  await desk.goto(`${BASE}/subscribe.html?v=${V}`);
  await desk.waitForTimeout(1000);
  await desk.locator(".play-account-row").screenshot({ path: path.join(OUT, "desktop-subscribe-account-link.png") });
  await browser.close();

  async function mobileCapture(browserType, name, file) {
    const browser = await browserType.launch();
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    trackPage(page, name);
    await page.goto(`${BASE}/?solo=1&v=${V}`, { waitUntil: "domcontentloaded" });
    await waitFirebase(page);
    await page.locator("#loading").screenshot({ path: path.join(OUT, `mobile-${name}-loading-signin.png`) });
    await page.waitForSelector(".char-pick", { timeout: 90000 });
    await page.locator("#charSelect").screenshot({ path: path.join(OUT, `mobile-${name}-char-select-signin.png`) });
    await page.click('.char-pick[data-id="cobalt"]');
    await page.click("#charSelectConfirm");
    await page.waitForFunction(() => window.me?.characterId, undefined, { timeout: 120000 });
    await page.waitForTimeout(1000);
    await page.locator("#game").screenshot({ path: path.join(OUT, file) });
    await browser.close();
  }

  try {
    await mobileCapture(webkit, "webkit", "mobile-webkit-ingame-signin.png");
  } catch (e) {
    console.warn("webkit mobile skip", e.message?.slice(0, 80));
    await mobileCapture(chromium, "chromium", "mobile-chromium-ingame-signin.png");
  }

  const firebaseNoApp = pageErrors.filter(e => /no-app|no Firebase App/i.test(e.message));
  fs.writeFileSync(path.join(OUT, "page-errors.json"), JSON.stringify({ pageErrors, firebaseNoAppCount: firebaseNoApp.length }, null, 2));
  console.log("page errors:", pageErrors.length, "no-app:", firebaseNoApp.length);
  console.log("done", OUT);
  if (firebaseNoApp.length > 0) process.exit(1);
})().catch(e => {
  console.error(e);
  process.exit(1);
});
