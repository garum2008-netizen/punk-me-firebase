const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const outDir = "/opt/cursor/artifacts/authority-stages";
fs.mkdirSync(outDir, { recursive: true });
const base = process.env.PUNK_BASE || "http://127.0.0.1:8765";

async function prep(page) {
  await page.addInitScript(() => {
    try {
      localStorage.setItem("punkme_howto_seen", "1");
    } catch (e) {}
  });
}

async function dismissUi(page) {
  await page.evaluate(() => {
    try {
      localStorage.setItem("punkme_howto_seen", "1");
    } catch (e) {}
    document.getElementById("howToOverlay")?.classList.remove("active");
    document.getElementById("loading")?.style.setProperty("display", "none");
    document.getElementById("charSelect")?.classList.remove("active");
    document.querySelectorAll(".modal.active").forEach(el => el.classList.remove("active"));
    document.getElementById("storyConstructionHud")?.classList.remove("active");
  });
}

async function enter(page) {
  await page.waitForSelector("#charSelect.active", { timeout: 30000 }).catch(() => {});
  const c = page.locator("#charSelectConfirm");
  if (await c.isVisible({ timeout: 8000 }).catch(() => false)) {
    await page.evaluate(() => {
      document.querySelector('.char-pick[data-id="cobalt"]')?.click();
      document.getElementById("charSelectConfirm")?.click();
    });
  }
  await page.waitForFunction(() => window.World3D?.isReady?.() && window.StoryEngine?.Authority, { timeout: 120000 });
  await dismissUi(page);
  await page.evaluate(() => {
    typeof setLanguage === "function" && setLanguage("en", true);
    me.onboarding = { step: 6, progress: {}, done: true };
    me.coins = 200;
    me.energy = 100;
    StoryEngine.onOnboardingComplete?.();
    saveMe?.();
    World3D?.resize?.();
  });
  await dismissUi(page);
}

async function prepareScene(page, loc) {
  await dismissUi(page);
  await page.evaluate(id => {
    goLocation(id);
    syncStage3D?.();
  }, loc);
  await page.waitForTimeout(3000);
  await page.evaluate(async () => {
    document.querySelector(".vignette")?.style.setProperty("opacity", "0.15");
    document.querySelector(".night-fx")?.style.setProperty("opacity", "0.25");
    const storyDlg = document.getElementById("storyDialog");
    if (storyDlg) storyDlg.style.background = "rgba(4, 2, 12, 0.45)";
    World3D?.resize?.();
    syncStage3D?.();
    World3D?.releaseCaptureFrame?.();
    World3D?.snapScreenshotView?.();
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    World3D?.snapScreenshotView?.();
  });
  await page.waitForTimeout(600);
  await dismissUi(page);
}

async function assertReady(page) {
  const ok = await page.evaluate(() => {
    const how = document.getElementById("howToOverlay");
    if (how?.classList.contains("active")) return "howto_active";
    const dlg = document.getElementById("storyDialog");
    if (!dlg?.classList.contains("active")) return "story_dialog_missing";
    const auth = document.getElementById("authorityStat");
    if (!auth || auth.textContent === "…") return "authority_hud_missing";
    return "ok";
  });
  if (ok !== "ok") throw new Error("pre-snap check failed: " + ok);
}

async function validatePng(filePath, minMean = 22) {
  const stats = await sharp(filePath).stats();
  const mean =
    stats.channels.reduce((s, c) => s + c.mean, 0) / Math.max(1, stats.channels.length);
  const meta = await sharp(filePath).metadata();
  if (mean < minMean) {
    throw new Error(`${path.basename(filePath)} too dark (mean ${mean.toFixed(1)} < ${minMean})`);
  }
  console.log(`verified ${path.basename(filePath)} ${meta.width}x${meta.height} mean=${mean.toFixed(1)}`);
  return { mean, meta };
}

async function snap(page, name, opts = {}) {
  if (!opts.skipAssert) await assertReady(page);
  await dismissUi(page);
  const p = path.join(outDir, name);
  await page.screenshot({ path: p, fullPage: false });
  await validatePng(p, opts.minMean ?? 22);
  return p;
}

async function setupStage(page, stage) {
  await page.evaluate(s => {
    const st = StoryEngine.ensureStoryState(me);
    st.flags.joined_gang = false;
    st.auth.s1Done = s > 1;
    st.auth.stage = s;
    st.auth.tasks = {};
    st.auth.trials = {};
    if (s >= 2) {
      st.auth.s1Done = true;
      st.authority = 28;
    }
    if (s >= 3) {
      st.auth.tasks = { pizza: true, no_rat: true, cobalt_item: true, ghost_prank: true };
      st.authority = 52;
    }
    if (s >= 4) {
      st.auth.trials = { cemetery: true, roof_parkour: true, duel_mohawk: true };
      st.authority = 88;
    }
    if (s === 1) st.authority = 8;
    StoryEngine.Authority.syncGangRank(me);
    StoryEngine.Authority.renderAuthorityHud(me);
    StoryEngine.renderObjectivePanel?.();
  }, stage);
}

async function captureStage(page, stage, prefix) {
  await setupStage(page, stage);
  if (stage === 1) {
    await prepareScene(page, "street");
    await page.evaluate(() => {
      const st = StoryEngine.ensureStoryState(me);
      st.auth.s1Done = false;
      StoryEngine.dismissAllStoryUi?.();
      StoryEngine.Authority.openStage1Dialog({ force: true });
      World3D?.snapDialogueNpcShot?.("mohawk");
    });
  } else if (stage === 2) {
    await prepareScene(page, "cemetery");
    await page.evaluate(() => {
      const dlg = document.getElementById("storyDialog");
      dlg.classList.add("active");
      dlg.querySelector(".story-dialog-title").textContent = "Stage 2: Character tests";
      const body = dlg.querySelector(".story-dialog-body");
      body.innerHTML = `
        <p class="story-line"><b>Keeper:</b> Tell me everything about the gang on the street…</p>
        <button type="button" class="btn story-choice"><span class="choice-text">Won't rat them out</span><small class="choice-hint">Authority +7</small></button>
        <button type="button" class="btn story-choice"><span class="choice-text">Tell about the gang</span><small class="choice-hint">Authority −10</small></button>`;
    });
  } else if (stage === 3) {
    await prepareScene(page, "street");
    await page.evaluate(() => {
      const dlg = document.getElementById("storyDialog");
      dlg.classList.add("active");
      dlg.querySelector(".story-dialog-title").textContent = "Stage 3: Trials";
      const body = dlg.querySelector(".story-dialog-body");
      body.innerHTML = `
        <p class="story-line">Three trials — retry if you fail.</p>
        <button type="button" class="btn story-choice"><span class="choice-text">Courage: night shift</span><small class="choice-hint">Cemetery</small></button>
        <button type="button" class="btn story-choice"><span class="choice-text">Agility: roof parkour</span><small class="choice-hint">Timed run</small></button>
        <button type="button" class="btn story-choice"><span class="choice-text">Strength: training duel</span><small class="choice-hint">Mohawk — first to 3</small></button>`;
    });
  } else if (stage === 4) {
    await prepareScene(page, "street");
    await page.evaluate(() => {
      const st = StoryEngine.ensureStoryState(me);
      st.auth.stage = 4;
      st.auth.trials = { cemetery: true, roof_parkour: true, duel_mohawk: true };
      st.authority = 88;
      StoryEngine.Authority.syncGangRank(me);
      StoryEngine.dismissAllStoryUi?.();
      StoryEngine.Authority.runInitiationCeremony({ force: true });
      World3D?.snapDialogueNpcShot?.("razor");
    });
  }
  await page.waitForTimeout(900);
  await dismissUi(page);
  await snap(page, `${prefix}-stage${stage}.png`);
  await page.evaluate(() => document.getElementById("storyDialog")?.classList.remove("active"));
}

(async () => {
  const bust = `auth-cap-${Date.now()}`;
  const browser = await chromium.launch();
  const desk = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await prep(desk);
  await desk.goto(`${base}/?dev=1&solo=1&v=${bust}`, { waitUntil: "networkidle", timeout: 120000 });
  await enter(desk);

  for (let s = 1; s <= 4; s++) await captureStage(desk, s, "desktop");

  await prepareScene(desk, "street");
  await desk.evaluate(() => {
    const st = StoryEngine.ensureStoryState(me);
    st.flags.joined_gang = true;
    st.gang_rank = "gang_member";
    st.authority = 100;
    st.chapter = 2;
    st.auth.ch2Done = false;
    me.authority = 100;
    StoryEngine.Authority.renderAuthorityHud(me);
    StoryEngine.Authority.maybeChapter2Bullying();
  });
  await desk.waitForTimeout(700);
  await snap(desk, "desktop-ch2-antibullying.png");

  await prepareScene(desk, "street");
  await desk.evaluate(() => {
    const st = StoryEngine.ensureStoryState(me);
    st.auth.stage = 4;
    st.auth.trials = { cemetery: true, roof_parkour: true, duel_mohawk: true };
    st.authority = 92;
    st.flags.joined_gang = false;
    StoryEngine.Authority.syncGangRank(me);
    StoryEngine.dismissAllStoryUi?.();
    StoryEngine.Authority.runInitiationCeremony({ force: true });
    World3D?.snapDialogueNpcShot?.("razor");
  });
  await desk.waitForTimeout(900);
  await snap(desk, "desktop-razor-initiation-patch.png");

  const mob = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await prep(mob);
  await mob.goto(`${base}/?dev=1&solo=1&v=${bust}-m`, { waitUntil: "networkidle", timeout: 120000 });
  await enter(mob);
  for (let s = 1; s <= 4; s++) await captureStage(mob, s, "mobile");

  await browser.close();
  const files = fs.readdirSync(outDir).filter(f => f.endsWith(".png"));
  console.log("total PNGs", files.length, files.sort().join(", "));
  process.exit(0);
})().catch(e => {
  console.error(e);
  process.exit(1);
});
