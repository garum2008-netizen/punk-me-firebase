#!/usr/bin/env node
const { chromium, devices } = require("playwright");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const OUT = path.join("/workspace/qa", "v22r5-pwa");
const BASE = process.env.PUNK_BASE || "http://127.0.0.1:8765";
fs.mkdirSync(OUT, { recursive: true });

async function enter(page) {
  await page.addInitScript(() => { try { localStorage.setItem("punkme_howto_seen", "1"); } catch (e) {} });
  await page.goto(`${BASE}/index.html?solo=1&test=1`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForSelector(".char-pick", { timeout: 60000 });
  await page.evaluate(() => {
    document.querySelector('.char-pick[data-id="cobalt"]')?.click();
    document.getElementById("charSelectConfirm")?.click();
  });
  await page.waitForFunction(() => window.me?.characterId && window.World3D?.isReady?.(), undefined, { timeout: 120000 });
  await page.waitForTimeout(800);
  await page.evaluate(() => window.dispatchEvent(new CustomEvent("punkme-game-ready")));
  await page.waitForTimeout(500);
}

(async () => {
  const browser = await chromium.launch();
  const desk = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await enter(desk);
  await desk.locator("#game").screenshot({ path: path.join(OUT, "desktop-tester-panel.png") });
  await desk.evaluate(() => {
    const url = location.origin + "/index.html";
    const link = document.getElementById("shareLinkField");
    if (link) link.value = url;
    document.getElementById("shareModal")?.classList.add("active");
  });
  await desk.waitForSelector("#shareModal.active", { timeout: 5000 });
  await desk.locator("#shareModal .share-modal-panel").screenshot({ path: path.join(OUT, "desktop-share-dialog.png") });
  await desk.evaluate(() => document.getElementById("shareCloseBtn")?.click());

  const mob = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await enter(mob);
  await mob.locator("#game").screenshot({ path: path.join(OUT, "mobile-tester-panel.png") });
  await mob.evaluate(() => {
    const link = document.getElementById("shareLinkField");
    if (link) link.value = location.origin + "/index.html";
    const m = document.getElementById("shareModal");
    if (m) { m.classList.add("active"); m.style.display = "block"; }
  });
  await mob.waitForTimeout(400);
  await mob.screenshot({ path: path.join(OUT, "mobile-share-dialog.png") });

  // Install button visible state (manual install fallback toast path)
  await desk.evaluate(() => {
    const b = document.getElementById("btnInstallApp");
    if (b) { b.hidden = false; b.textContent = "Install (test)"; }
  });
  await desk.locator("#pwaActions").screenshot({ path: path.join(OUT, "desktop-install-prompt-ui.png") });

  await browser.close();

  try {
    execSync(
      `npx --yes lighthouse@11.7.1 ${BASE}/index.html?solo=1 --only-categories=pwa --chrome-flags="--headless --no-sandbox" --output=json --output-path=${path.join(OUT, "lighthouse-pwa.json")} --quiet`,
      { timeout: 180000, encoding: "utf8" }
    );
  } catch (e) {
    fs.writeFileSync(path.join(OUT, "lighthouse-pwa.err.txt"), String(e.stdout || e.message));
  }
  console.log("done", OUT);
})().catch(e => {
  console.error(e);
  process.exit(1);
});
