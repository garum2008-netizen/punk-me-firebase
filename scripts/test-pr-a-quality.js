#!/usr/bin/env node
/** PR A smoke: Chromium + WebKit + mobile viewport. */
const { chromium, webkit } = require("playwright");
const fs = require("fs");
const path = require("path");
const { start, stop } = require("./local-static-server");

const outDir = path.join(__dirname, "../qa/pr-a");
fs.mkdirSync(outDir, { recursive: true });

async function boot(page, base) {
  await page.goto(`${base}/?solo=1&v=pr-a-test`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForFunction(() => window.__punkFinishLoadMeFlow, { timeout: 120000 });
  await page.evaluate(() => {
    window.__punkApplyFirebaseSnapshot({ exists: () => false, val: () => null });
    window.__punkFinishLoadMeFlow();
  });
  await page.locator('.char-pick[data-id="cobalt"]').click();
  await page.locator("#charSelectConfirm").click();
  await page.waitForFunction(() => window.__playerLoaded, { timeout: 120000 });
  await page.locator("#howToOverlay .close, #howToOverlay button").first().click({ timeout: 3000 }).catch(() => {});
  await page.evaluate(() => {
    document.getElementById("chapterIntro")?.classList.remove("active");
    window.me.story = window.me.story || {};
    window.me.story.flags = window.me.story.flags || {};
    window.me.story.flags.intro_seen = true;
  });
}

async function runBrowser(name, launcher, viewport, base) {
  const browser = await launcher.launch();
  const page = await browser.newPage({ viewport });
  const errors = [];
  try {
    await boot(page, base);
    const hud = await page.evaluate(() => ({
      goal: document.getElementById("storyGoalBar")?.classList.contains("visible"),
      audio: !!window.AudioManager?.setLocationMusic,
      mapBrand: true
    }));
    if (!hud.audio) errors.push("AudioManager missing");
    await page.evaluate(() => window.openModal("mapModal"));
    await page.waitForTimeout(400);
    const brand = await page.evaluate(() => !!document.querySelector(".map-brand-logo"));
    if (!brand) errors.push("map PUNK ME brand missing");
    await page.screenshot({ path: path.join(outDir, `${name}-${viewport.width}x${viewport.height}-map.png`) });
    await page.keyboard.press("Escape");
    const duel = await page.evaluate(() => {
      window.me.location = "street";
      window.me.onboarding = { step: 4, progress: {}, done: false };
      return typeof window.startNpcFight === "function";
    });
    if (!duel) errors.push("startNpcFight missing");
  } catch (e) {
    errors.push(String(e.message || e));
  }
  await browser.close();
  return { browser: name, viewport, ok: !errors.length, errors };
}

async function main() {
  const base = process.env.PUNK_BASE || await start();
  const results = [];
  results.push(await runBrowser("chromium", chromium, { width: 1280, height: 720 }, base));
  results.push(await runBrowser("webkit", webkit, { width: 1280, height: 720 }, base));
  results.push(await runBrowser("chromium-mobile", chromium, { width: 390, height: 844 }, base));
  if (!process.env.PUNK_BASE) stop();
  const report = { at: new Date().toISOString(), results, pass: results.every(r => r.ok) };
  fs.writeFileSync(path.join(outDir, "pr-a-quality-report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!report.pass) process.exit(1);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
