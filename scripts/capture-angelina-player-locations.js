#!/usr/bin/env node
const { installProdFirebaseRouteBlock } = require("./playwright-script-guard");
/** Screenshots: Angelina player (1280×800 + kitchen 390×844) + A/B/C asset zoom crops. */
const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright");
const sharp = require("sharp");

const outDir = process.env.PUNK_ARTIFACTS || "/opt/cursor/artifacts";
const root = path.join(__dirname, "..");
const HOWTO_SEEN_KEY = "punkme_howto_seen";

async function dismissHowTo(page) {
  await page.evaluate(key => {
    try {
      localStorage.setItem(key, "1");
    } catch (_) {}
    document.getElementById("howToPlay")?.classList.remove("active");
  }, HOWTO_SEEN_KEY);
}

async function bootSlice(page, base) {
  await page.goto(`${base}/?lifeCh1E2e=1&v=angelina-capture-r4`, { waitUntil: "load", timeout: 120000 });
  await page.waitForFunction(() => window.__PUNK_PREVIEW__ === true, undefined, { timeout: 15000 });
  await page.waitForSelector("#charSelectConfirm", { timeout: 90000 });
  await page.click("#charSelectConfirm");
  await page.waitForFunction(() => window.__playerLoaded === true, undefined, { timeout: 120000 });
  await page.evaluate(async () => {
    window.me.onboarding = { step: 6, progress: {}, done: true };
    window.LifeCh1Slice?.ensureLifeCh1?.(window.me);
    const st = window.me.lifeCh1;
    if (st) {
      st.playerCutout = true;
      st.angelinaSkin = "A";
      st.stepIndex = 2;
      st.flags = st.flags || {};
      st.flags.outfit_calm = true;
    }
    await window.LifeCh1Slice?.tryStartAfterOnboarding?.();
    window.LifeCh1Slice?.syncPlayerLifeCh1Skin?.();
    window.saveMe?.();
  });
  await dismissHowTo(page);
  await page.waitForTimeout(2000);
}

async function exportSkinZoomCrops() {
  const specs = [
    ["A", "angelina-teen-A-world.webp"],
    ["B", "angelina-teen-B-world.webp"],
    ["C", "angelina-teen-C-v2-world.webp"]
  ];
  for (const [id, file] of specs) {
    const abs = path.join(root, "assets/ui/angelina-skins/shipped", file);
    const meta = await sharp(abs).metadata();
    const w = meta.width;
    const h = meta.height;
    const regions = {
      feet: [0.32, 0.78, 0.68, 1],
      torso: [0.26, 0.2, 0.74, 0.52]
    };
    for (const [name, [x0, y0, x1, y1]] of Object.entries(regions)) {
      const left = Math.max(0, Math.floor(w * x0));
      const top = Math.max(0, Math.floor(h * y0));
      const width = Math.min(w - left, Math.floor(w * (x1 - x0)));
      const height = Math.min(h - top, Math.floor(h * (y1 - y0)));
      const out = path.join(outDir, `angelina-skin-${id}-${name}-zoom.png`);
      await sharp(abs).extract({ left, top, width, height }).png().toFile(out);
      console.log("wrote", path.basename(out));
    }
  }
}

async function main() {
  fs.mkdirSync(outDir, { recursive: true });
  await exportSkinZoomCrops();
  const base = process.env.PUNK_PREVIEW_URL || "http://127.0.0.1:3766";
  const browser = await chromium.launch({ headless: true });

  const desktop = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await desktop.newPage();
  await bootSlice(page, base);
  for (const loc of ["room", "street", "cemetery"]) {
    await page.evaluate(id => goLocation(id), loc);
    await page.waitForFunction(l => window.me?.location === l, loc, { timeout: 20000 });
    await page.waitForTimeout(1200);
    const file = path.join(outDir, `angelina-1280-${loc}.png`);
    await page.screenshot({ path: file });
    console.log("wrote", path.basename(file));
  }
  await desktop.close();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mpage = await mobile.newPage();
  await bootSlice(mpage, base);
  await mpage.evaluate(() => goLocation("kitchen"));
  await mpage.waitForFunction(() => window.me?.location === "kitchen", undefined, { timeout: 20000 });
  await mpage.waitForTimeout(1500);
  await mpage.screenshot({ path: path.join(outDir, "angelina-390-kitchen.png") });
  console.log("wrote angelina-390-kitchen.png");
  await mobile.close();
  await browser.close();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
