require("./lib/require-local-capture.js");
const { chromium } = require("playwright");
const fs = require("fs");
const out = "/opt/cursor/artifacts";
fs.mkdirSync(out, { recursive: true });
const base = process.env.PUNK_BASE || "http://127.0.0.1:8765";
const VERSION = "living3d-v8";
const HEROES = ["vienna", "razor", "cobalt", "mohawk"];

function trackErrors(page, bucket) {
  page.on("pageerror", e => bucket.push(`pageerror: ${e.message}`));
  page.on("console", m => {
    if (m.type() === "error" && !/permission_denied|FIREBASE WARNING/i.test(m.text())) {
      bucket.push(`console: ${m.text()}`);
    }
  });
}

async function waitVersion(page) {
  await page.waitForFunction(
    v => document.getElementById("gameVersion")?.textContent?.includes(v),
    VERSION,
    { timeout: 120000 }
  );
}

async function enterGame(page, hero = "vienna") {
  await page.waitForSelector("#charSelect.active", { timeout: 25000 }).catch(() => {});
  const confirm = page.locator("#charSelectConfirm");
  if (await confirm.isVisible({ timeout: 10000 }).catch(() => false)) {
    await page.click(`.char-pick[data-id="${hero}"]`).catch(() => {});
    await confirm.click();
  }
  await page.waitForFunction(
    () => !document.getElementById("charSelect")?.classList.contains("active"),
    { timeout: 25000 }
  );
  await page.waitForFunction(() => window.World3D?.isReady?.(), { timeout: 90000 });
  await page.waitForTimeout(1200);
}

async function hubRoom(page) {
  await page.evaluate(() => {
    if (typeof goLocation === "function") goLocation("room");
  });
  await page.waitForTimeout(2200);
}

async function charSelectShot(page, heroId, file) {
  await page.evaluate(() => CharSelect.open(() => {}));
  await page.waitForSelector("#charSelect.active", { timeout: 15000 });
  await page.click(`.char-pick[data-id="${heroId}"]`);
  await page.waitForTimeout(2600);
  await page.screenshot({ path: file, fullPage: false });
}

(async () => {
  const browser = await chromium.launch();
  const allErrors = [];
  const files = [];

  const desk = await browser.newPage({ viewport: { width: 1024, height: 576 } });
  const dErr = [];
  trackErrors(desk, dErr);
  await desk.goto(`${base}/?dev=1&solo=1&v=cap-desk`, { waitUntil: "networkidle", timeout: 120000 });
  await waitVersion(desk);
  for (const id of HEROES) {
    const f = `${out}/polish-char-${id}.png`;
    await charSelectShot(desk, id, f);
    files.push(f);
  }
  await enterGame(desk, "vienna");
  await hubRoom(desk);
  const deskHub = `${out}/polish-hub-desktop.png`;
  await desk.screenshot({ path: deskHub, fullPage: false });
  files.push(deskHub);
  allErrors.push(...dErr);
  await desk.close();

  const mob = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const mErr = [];
  trackErrors(mob, mErr);
  await mob.goto(`${base}/?dev=1&solo=1&v=cap-mob`, { waitUntil: "networkidle", timeout: 120000 });
  await waitVersion(mob);
  const mobVienna = `${out}/polish-char-vienna-mobile.png`;
  await charSelectShot(mob, "vienna", mobVienna);
  files.push(mobVienna);
  await enterGame(mob, "vienna");
  await hubRoom(mob);
  const mobHub = `${out}/polish-hub-mobile.png`;
  await mob.screenshot({ path: mobHub, fullPage: false });
  files.push(mobHub);
  await mob.click("#chatToggle");
  await mob.waitForTimeout(500);
  const mobChat = `${out}/polish-hub-mobile-chat.png`;
  await mob.screenshot({ path: mobChat, fullPage: false });
  files.push(mobChat);
  await mob.click("#playersToggle");
  await mob.waitForTimeout(500);
  const mobHere = `${out}/polish-hub-mobile-here.png`;
  await mob.screenshot({ path: mobHere, fullPage: false });
  files.push(mobHere);
  allErrors.push(...mErr);
  await mob.close();

  const tab = await browser.newPage({ viewport: { width: 768, height: 1024 } });
  const tErr = [];
  trackErrors(tab, tErr);
  await tab.goto(`${base}/?dev=1&solo=1&v=cap-tab`, { waitUntil: "networkidle", timeout: 120000 });
  await waitVersion(tab);
  await enterGame(tab, "vienna");
  await hubRoom(tab);
  const tabHub = `${out}/polish-hub-tablet.png`;
  await tab.screenshot({ path: tabHub, fullPage: false });
  files.push(tabHub);
  allErrors.push(...tErr);
  await tab.close();

  console.log(JSON.stringify({
    version: VERSION,
    screenshots: files.map(f => f.replace(`${out}/`, "")),
    consoleErrors: [...new Set(allErrors)]
  }, null, 2));
  await browser.close();
})();
