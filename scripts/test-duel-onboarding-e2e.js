#!/usr/bin/env node
/** Legacy: duel is no longer an onboarding step; smoke that initiation duel quest can start after choice. */
const { assertNoProductionBase } = require("./lib/guard-no-prod-firebase");
assertNoProductionBase();
const { chromium } = require("playwright");
const { start, stop } = require("./local-static-server");
const H = require("./playthrough-ui-helpers");

async function boot(page, base) {
  await page.goto(`${base}/?solo=1&v=duel-e2e`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForFunction(() => window.__punkFinishLoadMeFlow, { timeout: 120000 });
  await page.evaluate(() => {
    window.__punkApplyFirebaseSnapshot({ exists: () => false, val: () => null });
    window.__punkFinishLoadMeFlow();
  });
  await page.locator('.char-pick[data-id="cobalt"]').click();
  await page.locator("#charSelectConfirm").click();
  await page.waitForFunction(() => window.__playerLoaded && window.World3D?.isReady?.(), { timeout: 120000 });
  await H.dismissHowToOverlay(page);
  await page.evaluate(() => {
    document.getElementById("chapterIntro")?.classList.remove("active");
    window.me.onboarding = { step: 0, progress: {}, done: true };
    const st = window.StoryEngine.ensureStoryState(window.me);
    st.flags.ch1_initiation_unlocked = true;
    window.StoryEngine.startQuest("q_initiation_duel");
    window.me.location = "street";
    window.goLocation?.("street");
    window.syncStage3D?.();
  });
  await page.waitForFunction(() => window.me?.location === "street", { timeout: 30000 });
}

async function main() {
  const base = process.env.PUNK_BASE || await start();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const errors = [];
  try {
    await boot(page, base);
    await H.dismissHowToOverlay(page);
    await page.locator("#btnFight").click({ timeout: 15000, force: true });
    await page.waitForSelector("#duel3dHud:not(.hidden)", { timeout: 20000 });
    const won = await H.winFightUi(page, 55000);
    const snap = await page.evaluate(() => ({
      quest: window.StoryEngine?.ensureStoryState?.(window.me)?.quest?.activeId,
      duel: !document.getElementById("duel3dHud")?.classList.contains("hidden")
    }));
    if (!won || snap.quest !== "q_initiation_duel") {
      errors.push(`initiation duel quest not satisfied: ${JSON.stringify(snap)}`);
    }
    if (snap.duel) errors.push("duel HUD still visible after win");
  } catch (e) {
    errors.push(String(e.message || e));
  }
  await browser.close();
  if (!process.env.PUNK_BASE) stop();
  const report = { pass: !errors.length, errors };
  console.log(JSON.stringify(report, null, 2));
  if (!report.pass) process.exit(1);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
