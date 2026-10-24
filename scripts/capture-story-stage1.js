#!/usr/bin/env node
/** QA captures for story stage 1 — desktop 1280x800 + mobile 390x844 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const outDir = "/workspace/qa/story-stage1";
const base = process.env.PUNK_BASE || "http://127.0.0.1:8765";

fs.mkdirSync(outDir, { recursive: true });

async function prep(page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("punkme_howto_seen", "1");
    } catch (e) {}
  });
}

async function enter(page) {
  await page.waitForSelector("#charSelect.active", { timeout: 30000 }).catch(() => {});
  const c = page.locator("#charSelectConfirm");
  if (await c.isVisible({ timeout: 8000 }).catch(() => false)) {
    await page.click('.char-pick[data-id="cobalt"]');
    await c.click();
  }
  await page.waitForFunction(() => window.World3D?.isReady?.() && window.StoryEngine, { timeout: 120000 });
  await page.evaluate(() => {
    typeof setLanguage === "function" && setLanguage("ru", true);
    document.getElementById("howToOverlay")?.classList.remove("active");
    me.onboarding = { step: 6, progress: {}, done: true };
    me.coins = 80;
    me.energy = 100;
    me.location = "street";
    StoryEngine.onOnboardingComplete?.();
    StoryEngine.renderObjectivePanel?.();
    saveMe?.();
    World3D?.resize?.();
  });
  await page.waitForTimeout(900);
}

async function snap(page, name) {
  const p = path.join(outDir, name);
  await page.screenshot({ path: p, fullPage: false });
  console.log("saved", p);
}

(async () => {
  const browser = await chromium.launch();
  const desk = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await prep(desk);
  await desk.goto(`${base}/?dev=1&solo=1&v=stage1`, { waitUntil: "networkidle", timeout: 120000 });
  await enter(desk);
  await snap(desk, "desktop-ch1-razor-objective.png");

  await desk.evaluate(() => {
    StoryEngine.startQuest("q_initiation_pay");
    me.coins = 40;
    StoryEngine.beginEarnCoins(110, { returnBeacon: "npc_tony", returnLabel: "Рейзор" });
    StoryEngine.renderObjectivePanel?.();
  });
  await desk.waitForTimeout(600);
  await snap(desk, "desktop-ch1-earn-guidance.png");

  await desk.evaluate(() => {
    goLocation("city");
    syncStage3D?.();
    StoryEngine.renderObjectivePanel?.();
  });
  await desk.waitForTimeout(2000);
  await snap(desk, "desktop-ch1-city-job-beacon.png");

  const mob = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await prep(mob);
  await mob.goto(`${base}/?dev=1&solo=1&v=stage1m`, { waitUntil: "networkidle", timeout: 120000 });
  await enter(mob);
  await mob.evaluate(() => goLocation("street"));
  await mob.waitForTimeout(2200);
  await snap(mob, "mobile-ch1-street-objective.png");

  await browser.close();
})().catch(e => {
  console.error(e);
  process.exit(1);
});
