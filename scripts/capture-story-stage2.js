#!/usr/bin/env node
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const outDir = "/workspace/qa/story-stage2";
const base = process.env.PUNK_BASE || "http://127.0.0.1:8765";
fs.mkdirSync(outDir, { recursive: true });

async function enter(page) {
  await page.waitForFunction(() => window.World3D?.isReady?.() && window.StoryEngine, { timeout: 120000 });
  await page.evaluate(() => {
    me.onboarding = { done: true };
    me.coins = 800;
    me.story = StoryEngine.ensureStoryState(me);
    me.story.flags.joined_gang = true;
    me.story.hangoutStage = 0;
    me.story.materials = { brick: 10, nails: 2, board: 18, chain: 2, spray: 3, neon_tube: 2 };
    StoryEngine.startQuest("q_hangout_build");
    goLocation("construction");
    StoryEngine.renderObjectivePanel?.();
    World3D?.resize?.();
  });
  await page.waitForTimeout(2000);
}

(async () => {
  const browser = await chromium.launch();
  const desk = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await desk.goto(`${base}/?dev=1&solo=1&v=stage2`, { waitUntil: "networkidle", timeout: 120000 });
  await desk.waitForSelector("#charSelect.active", { timeout: 30000 }).catch(() => {});
  const c = desk.locator("#charSelectConfirm");
  if (await c.isVisible({ timeout: 5000 }).catch(() => false)) {
    await desk.click('.char-pick[data-id="cobalt"]');
    await c.click();
  }
  await enter(desk);
  await desk.screenshot({ path: path.join(outDir, "desktop-ch2-hangout-hud.png") });
  await desk.evaluate(() => StoryEngine.buildHangoutStage());
  await desk.waitForTimeout(1500);
  await desk.screenshot({ path: path.join(outDir, "desktop-ch2-stage1-built.png") });

  const mob = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mob.goto(`${base}/?dev=1&solo=1&v=stage2m`, { waitUntil: "networkidle", timeout: 120000 });
  await mob.waitForSelector("#charSelect.active", { timeout: 30000 }).catch(() => {});
  if (await c.isVisible({ timeout: 5000 }).catch(() => false)) {
    await mob.click('.char-pick[data-id="cobalt"]');
    await mob.locator("#charSelectConfirm").click();
  }
  await enter(mob);
  await mob.screenshot({ path: path.join(outDir, "mobile-ch2-construction.png") });
  console.log("captures in", outDir);
  await browser.close();
})().catch(e => {
  console.error(e);
  process.exit(1);
});
