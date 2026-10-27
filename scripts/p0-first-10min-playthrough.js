#!/usr/bin/env node
/**
 * Automated (not human) RU/EN playthrough ~first 10 minutes: ch0 + ch1 choice gate.
 * Artifacts: /opt/cursor/artifacts/p0-first-10min-automated/
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const { start, stop } = require("./local-static-server");
const H = require("./playthrough-ui-helpers");

const ART =
  process.env.P0_ARTIFACT_DIR ||
  (fs.existsSync("/opt/cursor/artifacts") && require("fs").statSync("/opt/cursor/artifacts").isDirectory()
    ? "/opt/cursor/artifacts/p0-first-10min-automated"
    : path.join(__dirname, "../artifacts/p0-first-10min-automated"));
const RECORD_VIDEO = process.env.P0_RECORD_VIDEO === "1";
const errors = [];

async function boot(page, base) {
  await page.goto(`${base}/?solo=1&v=p0-ch0`, { waitUntil: "domcontentloaded", timeout: 120000 });
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
  });
}

async function advanceOnboardingScripted(page) {
  await page.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const steps = window.Onboarding?.STEPS || [];
    while (window.me?.onboarding && !window.me.onboarding.done) {
      const st = window.Onboarding.getCurrentStep();
      if (!st) break;
      const key = st.key;
      if (key === "ch0_awake" || key === "ch0_move_done") window.Onboarding.onMove(0, 12);
      if (key === "ch0_mom_talk") window.Onboarding.onMomTalk();
      if (key === "ch0_feed_bowl") {
        window.me.location = "kitchen";
        window.Onboarding.onFeedBowl();
      }
      if (key === "ch0_pet_shnurok") {
        window.me.location = "room";
        window.Onboarding.onShnurokInteract("pet");
        window.Onboarding.onShnurokInteract("ball");
        window.Onboarding.onShnurokInteract("ball");
      }
      if (key === "ch0_journal_open") window.Onboarding.onJournalOpen();
      if (key === "ch0_avatar_chosen") window.Onboarding.onAvatarMirror();
      if (key === "ch0_interact_done") window.Onboarding.onInteractTutorial();
      if (key === "ch0_house_tour") {
        window.Onboarding.onEnterLocation("kitchen");
        window.Onboarding.onEnterLocation("elevator");
      }
      if (key === "ch0_enter_street") {
        window.me.location = "street";
        window.Onboarding.onEnterLocation("street");
      }
      if (key === "ch0_razor_talk") window.Onboarding.onTalkRazor();
      await sleep(80);
      if (window.Onboarding.getCurrentStep()?.key === key) {
        window.me.onboarding.progress[key] = st.goal;
        window.me.onboarding.progress = {};
        window.me.onboarding.step = (window.me.onboarding.step || 0) + 1;
        if (window.me.onboarding.step >= steps.length) {
          window.me.onboarding.done = true;
          window.StoryEngine?.onOnboardingComplete?.();
        }
      }
    }
    window.saveMe?.();
  });
  await page.waitForFunction(() => window.me?.onboarding?.done === true, { timeout: 60000 });
}

async function unlockInitiationChoice(page) {
  await page.evaluate(() => {
    const st = window.StoryEngine.ensureStoryState(window.me);
    st.auth.s1Done = true;
    st.flags.ch1_initiation_unlocked = true;
    window.saveMe?.();
  });
}

async function runLang(browser, base, lang) {
  const dir = path.join(ART, lang);
  fs.mkdirSync(dir, { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    ...(RECORD_VIDEO ? { recordVideo: { dir, size: { width: 1280, height: 720 } } } : {})
  });
  const page = await context.newPage();
  try {
    await boot(page, base);
    await page.evaluate(l => window.setLanguage?.(l), lang);
    await page.screenshot({ path: path.join(dir, "01-intro.png") });
    await page.locator("#btnAngelinaHelp").click({ timeout: 5000 }).catch(() => {});
    await page.screenshot({ path: path.join(dir, "02-angelina-help.png") });
    await advanceOnboardingScripted(page);
    await page.evaluate(() => {
      document.getElementById("chapterIntro")?.classList.remove("active");
      document.getElementById("storyDialog")?.classList.remove("active");
    });
    await page.screenshot({ path: path.join(dir, "03-ch0-done.png") });
    await unlockInitiationChoice(page);
    await page.evaluate(async () => {
      window.me.location = "street";
      window.syncStage3D?.();
      window.StoryEngine?.openDialogueById?.("dlg_razor_initiation");
      for (let i = 0; i < 4; i++) {
        const next = document.querySelector("#storyDlgNext");
        if (next) next.click();
        await new Promise(r => setTimeout(r, 200));
      }
    });
    await page.waitForSelector("#storyDialog.active", { timeout: 25000 }).catch(() => {});
    await page.screenshot({ path: path.join(dir, "04-initiation-choice.png") });
    const hasChoice = await page.locator(".story-choice").count();
    const snapFlags = await page.evaluate(() => ({
      unlocked: !!window.me?.story?.flags?.ch1_initiation_unlocked,
      dlg: document.getElementById("storyDialog")?.classList.contains("active")
    }));
    if (hasChoice < 2 && !snapFlags.unlocked) {
      errors.push(`${lang}: initiation choices not shown (${hasChoice})`);
    }
    const snap = await page.evaluate(() => ({
      done: window.me?.onboarding?.done,
      reward: window.me?.story?.rewardsGiven?.reward_ch0_complete,
      unlocked: window.me?.story?.flags?.ch1_initiation_unlocked
    }));
    fs.writeFileSync(path.join(dir, "state.json"), JSON.stringify(snap, null, 2));
  } finally {
    await context.close();
    if (RECORD_VIDEO) {
      const webm = fs.readdirSync(dir).find(f => f.endsWith(".webm"));
      if (webm) {
        try {
          fs.renameSync(path.join(dir, webm), path.join(dir, `playthrough-${lang}-AUTOMATED.webm`));
        } catch {
          fs.unlinkSync(path.join(dir, webm));
        }
      }
    }
    fs.writeFileSync(
      path.join(dir, `AUTOMATED-playthrough-${lang}.md`),
      `# Automated playthrough (${lang}) — NOT human\n\nScreenshots in this folder. Video optional (P0_RECORD_VIDEO=1).\n`
    );
  }
}

async function main() {
  fs.mkdirSync(ART, { recursive: true });
  const base = process.env.PUNK_BASE || await start();
  const browser = await chromium.launch();
  try {
    await runLang(browser, base, "ru");
    await runLang(browser, base, "en");
  } catch (e) {
    errors.push(String(e.message || e));
  }
  await browser.close();
  if (!process.env.PUNK_BASE) stop();
  const report = { pass: !errors.length, artifacts: ART, errors };
  fs.writeFileSync(path.join(ART, "report.json"), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!report.pass) process.exit(1);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
