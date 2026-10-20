const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const outDir = "/opt/cursor/artifacts/authority-stages";
fs.mkdirSync(outDir, { recursive: true });
const base = process.env.PUNK_BASE || "http://127.0.0.1:8765";

async function enter(page) {
  await page.waitForSelector("#charSelect.active", { timeout: 30000 }).catch(() => {});
  const c = page.locator("#charSelectConfirm");
  if (await c.isVisible({ timeout: 8000 }).catch(() => false)) {
    await page.click('.char-pick[data-id="cobalt"]');
    await c.click();
  }
  await page.waitForFunction(() => window.World3D?.isReady?.() && window.StoryEngine?.Authority, { timeout: 120000 });
  await page.evaluate(() => {
    setLanguage("en", true);
    me.onboarding = { step: 6, progress: {}, done: true };
    me.coins = 200;
    StoryEngine.onOnboardingComplete?.();
    saveMe?.();
  });
}

async function snap(page, name) {
  const p = path.join(outDir, name);
  await page.screenshot({ path: p });
  await sharp(p).metadata();
  console.log("saved", name);
}

(async () => {
  const browser = await chromium.launch();
  const desk = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await desk.goto(`${base}/?dev=1&solo=1&v=auth-cap`, { waitUntil: "networkidle", timeout: 120000 });
  await enter(desk);

  await desk.evaluate(() => {
    goLocation("street");
    syncStage3D?.();
    StoryEngine.Authority.openStage1Dialog();
  });
  await desk.waitForTimeout(800);
  await snap(desk, "desktop-stage1-teasing.png");

  await desk.evaluate(() => {
    document.getElementById("storyDialog")?.classList.remove("active");
    const st = StoryEngine.ensureStoryState(me);
    st.auth.s1Done = true;
    st.auth.stage = 2;
    st.authority = 25;
    st.gang_rank = "watched";
    StoryEngine.Authority.syncGangRank(me);
    StoryEngine.renderObjectivePanel?.();
  });
  await snap(desk, "desktop-stage2-tests.png");

  await desk.evaluate(() => {
    const st = StoryEngine.ensureStoryState(me);
    st.auth.tasks = { pizza: true, no_rat: true, cobalt_item: true, ghost_prank: true };
    st.auth.stage = 3;
    st.authority = 50;
    st.gang_rank = "trial";
    StoryEngine.Authority.syncGangRank(me);
    StoryEngine.renderObjectivePanel?.();
  });
  await snap(desk, "desktop-stage3-trials.png");

  await desk.evaluate(() => {
    const st = StoryEngine.ensureStoryState(me);
    st.auth.trials = { cemetery: true, roof_parkour: true, duel_mohawk: true };
    st.auth.stage = 4;
    st.authority = 85;
    st.gang_rank = "one_of_us";
    StoryEngine.Authority.syncGangRank(me);
    StoryEngine.renderObjectivePanel?.();
    StoryEngine.Authority.runInitiationCeremony();
  });
  await desk.waitForTimeout(600);
  await snap(desk, "desktop-stage4-initiation.png");

  const mob = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mob.goto(`${base}/?dev=1&solo=1&v=auth-cap-m`, { waitUntil: "networkidle", timeout: 120000 });
  await enter(mob);
  for (const [stage, file] of [
    [1, "mobile-stage1.png"],
    [2, "mobile-stage2.png"],
    [3, "mobile-stage3.png"],
    [4, "mobile-stage4.png"]
  ]) {
    await mob.evaluate(s => {
      const st = StoryEngine.ensureStoryState(me);
      st.auth.stage = s;
      st.auth.s1Done = s > 1;
      st.authority = [10, 30, 55, 90][s - 1];
      StoryEngine.Authority.syncGangRank(me);
      StoryEngine.renderObjectivePanel?.();
      if (s === 1) {
        goLocation("street");
        StoryEngine.Authority.openStage1Dialog();
      }
    }, stage);
    await mob.waitForTimeout(700);
    await snap(mob, file);
    await mob.evaluate(() => document.getElementById("storyDialog")?.classList.remove("active"));
  }

  await browser.close();
  process.exit(0);
})().catch(e => {
  console.error(e);
  process.exit(1);
});
