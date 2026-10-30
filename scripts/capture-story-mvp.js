require("./lib/require-local-capture.js");
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const outDir = "/opt/cursor/artifacts/story-mvp";
fs.mkdirSync(outDir, { recursive: true });
const base = process.env.PUNK_BASE || "http://127.0.0.1:8765";

const LOCS = ["room", "kitchen", "toilet", "street", "city", "construction", "cemetery", "roof", "parkour"];

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
    typeof setLanguage === "function" && setLanguage("en", true);
    document.getElementById("howToOverlay")?.classList.remove("active");
    me.onboarding = { step: 6, progress: {}, done: true };
    me.coins = 80;
    me.energy = 100;
    StoryEngine.onOnboardingComplete?.();
    saveMe?.();
    World3D?.resize?.();
  });
  await page.waitForTimeout(800);
}

async function snap(page, name) {
  const p = path.join(outDir, name);
  await page.screenshot({ path: p, fullPage: false });
  const meta = await sharp(p).metadata();
  console.log("saved", name, meta.width, meta.height);
  return p;
}

(async () => {
  const browser = await chromium.launch();
  const desk = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await prep(desk);
  await desk.goto(`${base}/?dev=1&solo=1&v=story-mvp`, { waitUntil: "networkidle", timeout: 120000 });
  await enter(desk);

  for (const loc of LOCS) {
    await desk.evaluate(id => {
      goLocation(id);
      syncStage3D?.();
    }, loc);
    await desk.waitForTimeout(2800);
    await desk.evaluate(() => {
      World3D?.snapScreenshotView?.();
    });
    await snap(desk, `callout-${loc}.png`);
  }

  await desk.evaluate(() => {
    goLocation("street");
    syncStage3D?.();
    openNpcDialog("razor");
  });
  await desk.waitForTimeout(1200);
  await snap(desk, "choice-dialog-razor.png");

  await desk.evaluate(() => {
    document.getElementById("storyDialog")?.classList.remove("active");
    StoryEngine.startQuest("q_initiation_pay");
    StoryEngine.renderObjectivePanel?.();
  });
  await desk.waitForTimeout(600);
  await snap(desk, "objective-panel.png");

  await desk.evaluate(() => {
    me.coins = 5;
    StoryEngine.beginEarnCoins(50, { returnBeacon: "npc_bolt", returnLabel: "Bolt" });
    StoryEngine.renderObjectivePanel?.();
  });
  await desk.waitForTimeout(600);
  await snap(desk, "no-money-job-hint.png");

  await desk.evaluate(() => {
    goLocation("construction");
    syncStage3D?.();
    const st = StoryEngine.ensureStoryState(me);
    st.flags.joined_gang = true;
    st.hangoutStage = 0;
    st.materials = { brick: 20, nails: 10, board: 30, chain: 5, spray: 10, neon_tube: 5 };
  });
  for (let stage = 1; stage <= 4; stage++) {
    await desk.evaluate(() => StoryEngine.buildHangoutStage());
    await desk.waitForTimeout(1500);
    await snap(desk, `construction-stage-${stage}.png`);
  }

  const mob = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await prep(mob);
  await mob.goto(`${base}/?dev=1&solo=1&v=story-mvp-m`, { waitUntil: "networkidle", timeout: 120000 });
  await enter(mob);
  await mob.evaluate(() => goLocation("street"));
  await mob.waitForTimeout(2500);
  await snap(mob, "mobile-street-objective.png");

  const errs = await desk.evaluate(() => window.__qaErrors || []);
  console.log("qa errors", errs.length);
  await browser.close();
  process.exit(errs.length ? 1 : 0);
})().catch(e => {
  console.error(e);
  process.exit(1);
});
