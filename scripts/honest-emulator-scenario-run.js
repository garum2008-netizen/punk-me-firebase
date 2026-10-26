#!/usr/bin/env node
/**
 * Honest scenario capture: firebaseEmulator=1, solo=1, NO ?dev=1 / ?qa=1.
 * Screenshots → SCENARIO_ARTIFACT_DIR (default /opt/cursor/artifacts/scenario-ch01).
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const H = require("./playthrough-ui-helpers");
const { assertSafeTestFirebaseTarget } = require("./lib/guard-no-prod-firebase");

assertSafeTestFirebaseTarget();

const base = process.env.PUNK_BASE || "http://127.0.0.1:3456";
const outDir = process.env.SCENARIO_ARTIFACT_DIR || "/opt/cursor/artifacts/scenario-ch01";
const tag = process.env.SCENARIO_TAG || "honest";
const cache = process.env.SCENARIO_CACHE || "honest-emulator-full";

fs.mkdirSync(outDir, { recursive: true });

const log = [];

function note(msg, data) {
  const line = { t: new Date().toISOString(), msg, ...(data || {}) };
  log.push(line);
  console.log(msg, data ? JSON.stringify(data) : "");
}

async function snap(page, name) {
  const p = path.join(outDir, `${tag}-${name}.png`);
  await page.screenshot({ path: p, fullPage: false });
  note(`screenshot ${name}`, { path: p });
}

async function enterGameHonest(page) {
  const url = `${base}/?solo=1&firebaseEmulator=1&v=${cache}`;
  note("goto", { url });
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
  const qs = await page.evaluate(() => location.search);
  if (qs.includes("dev=1") || qs.includes("qa=1")) throw new Error("dev/qa must not be in URL");
  await page.waitForFunction(() => typeof firebase !== "undefined", undefined, { timeout: 120000 });
  await page.waitForSelector(".char-pick", { timeout: 120000 });
  await snap(page, "00-char-select");
  await page.click('.char-pick[data-id="cobalt"]');
  await page.click("#charSelectConfirm");
  await page.waitForFunction(() => window.me?.characterId === "cobalt", undefined, { timeout: 120000 });
  await page.waitForFunction(() => window.__playerLoaded === true, undefined, { timeout: 120000 });
  await page.evaluate(() => {
    window.__force2dFight = true;
  });
  const startBtn = page.locator("#startGameOverlay button, #startGameBtn, .start-game-btn").first();
  if (await startBtn.isVisible().catch(() => false)) {
    await startBtn.click();
    await H.sleep(800);
  }
  await page.locator("#howToOverlay .close, #howToOverlay button").first().click({ timeout: 4000 }).catch(() => {});
  await page.waitForFunction(() => window.World3D?.isReady?.(), undefined, { timeout: 120000 }).catch(() => {});
  await snap(page, "01-room-boot");
}

async function readOnboarding(page) {
  return page.evaluate(() => ({
    step: window.me?.onboarding?.step,
    done: window.me?.onboarding?.done,
    progress: window.me?.onboarding?.progress,
    location: window.me?.location
  }));
}

async function runOnboardingChain(page) {
  note("onboarding_start", await readOnboarding(page));
  const snaps = new Set();

  for (let guard = 0; guard < 48; guard++) {
    const ob = await readOnboarding(page);
    if (ob.done) break;
    const step = ob.step ?? 0;
    note(`onboard_guard_${guard}`, ob);

    if (step === 0) {
      await H.walkDesktop(page, 3200);
      if (!snaps.has("move")) {
        snaps.add("move");
        await snap(page, "02-move-done");
      }
      continue;
    }
    if (step === 1) {
      await H.navGo(page, "street");
      if (!snaps.has("street")) {
        snaps.add("street");
        await snap(page, "03-street");
      }
      continue;
    }
    if (step === 2) {
      await H.navGo(page, "street");
      await H.dismissHowToOverlay(page);
      await H.openGangNpc(page, "razor");
      await H.sleep(500);
      const after = await readOnboarding(page);
      if ((after.step ?? 0) < 3) {
        throw new Error(`talk_razor did not advance (step=${after.step})`);
      }
      await H.closeGangModal(page);
      if (!snaps.has("razor")) {
        snaps.add("razor");
        await snap(page, "04-razor-talk");
      }
      continue;
    }
    if (step === 3) {
      await H.navGo(page, "cemetery");
      if (!snaps.has("cemetery")) {
        snaps.add("cemetery");
        await snap(page, "05-cemetery");
      }
      continue;
    }
    if (step === 4) {
      await H.navGo(page, "street");
      await page.locator("#btnFight").click({ timeout: 20000, force: true });
      await H.winFightUi(page, 45000);
      if (!snaps.has("duel")) {
        snaps.add("duel");
        await snap(page, "06-duel-win");
      }
      continue;
    }
    if (step === 5) {
      await H.navGo(page, "room");
      await H.buyCheapestShop(page);
      if (!snaps.has("shop")) {
        snaps.add("shop");
        await snap(page, "07-shop");
      }
      continue;
    }
    await H.sleep(400);
  }

  const ob = await readOnboarding(page);
  if (!ob.done) throw new Error(`onboarding not done (step=${ob.step})`);
  note("onboarding_done", ob);
  await snap(page, "08-onboarding-done");
  return ob;
}

async function clearBlockingUi(page) {
  await H.dismissStoryDialog(page);
  await page.evaluate(() => {
    document.querySelectorAll(".modal.active").forEach(el => el.classList.remove("active"));
    document.getElementById("chapterIntro")?.classList.remove("active");
  });
}

async function runAuthorityInitiationHangout(page) {
  await clearBlockingUi(page);

  const auth = await H.completeAuthorityPathUi(page, false, log);
  note("authority_trials", auth.auth);
  await snap(page, "09-ch3-4-authority");

  await clearBlockingUi(page);
  await H.navGo(page, "street");
  await H.openGangNpc(page, "razor");
  await H.advanceStoryNext(page);
  await H.clickFirstStoryChoice(page).catch(() => {});
  await H.dismissStoryDialog(page);
  await snap(page, "10-razor-initiation-dialog");

  await H.finishInitiationUi(page);
  await H.dismissStoryDialog(page);
  await H.clickFirstStoryChoice(page).catch(() => {});
  await H.dismissStoryDialog(page);
  const joined = await page.evaluate(() => !!window.StoryEngine?.ensureStoryState?.(window.me)?.flags?.joined_gang);
  note("joined_gang", { joined });
  if (!joined) throw new Error("joined_gang false after initiation ceremony");
  await snap(page, "11-initiation-patch");

  const hang = await H.buildAllHangoutStages(page, log, { outDir, tag });
  note("hangout", hang);
  if ((hang.hangoutStage ?? 0) < 4) {
    throw new Error(`hangout incomplete stage=${hang.hangoutStage}`);
  }
  await H.snapHangoutBuild(page, outDir, tag, 4);
  await snap(page, "12-hangout-stage-4");
  return { auth, hang, joined };
}

async function runEndings(page) {

  await page.evaluate(() => {
    window.StoryEngine?.fireStoryEvent?.("graph_confession_done");
  });
  await H.sleep(800);
  const endingUi = await page.evaluate(() => ({
    active: document.getElementById("endingChoice")?.classList.contains("active"),
    ending: window.me?.story?.ending
  }));
  note("ending_ui", endingUi);
  await snap(page, "12-ending-choice");

  if (endingUi.active) {
    await page.locator('[data-ending="ending_break_curse"]').click({ timeout: 10000 });
    await H.sleep(1200);
  }
  const finale = await page.evaluate(() => ({
    ending: window.me?.story?.ending,
    chapter: window.me?.story?.chapter,
    flags: window.StoryEngine?.ensureStoryState?.(window.me)?.flags
  }));
  note("finale", finale);
  await snap(page, "13-finale");
  return finale;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  try {
    await enterGameHonest(page);
    const ob = await runOnboardingChain(page);
    const mid = await runAuthorityInitiationHangout(page);
    const finale = await runEndings(page);
    const out = { log, ob, ...mid, finale };
    fs.writeFileSync(path.join(outDir, `${tag}-run-log.json`), JSON.stringify(out, null, 2));
    console.log("honest-emulator-scenario-run: OK");
  } catch (e) {
    await snap(page, "99-error").catch(() => {});
    fs.writeFileSync(
      path.join(outDir, `${tag}-run-log.json`),
      JSON.stringify({ log, error: String(e) }, null, 2)
    );
    console.error(e);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
