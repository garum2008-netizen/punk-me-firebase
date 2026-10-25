#!/usr/bin/env node
/**
 * Honest scenario capture: firebaseEmulator=1, solo=1, NO ?dev=1 / ?qa=1.
 * Screenshots → /opt/cursor/artifacts/scenario-ch01 (not committed).
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
const cache = "honest-emulator-ch01";

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
    location: window.me?.location,
    quest: window.me?.story?.quest,
    chapter: window.me?.story?.chapter
  }));
}

async function runCh01(page) {
  let ob = await readOnboarding(page);
  note("onboarding_start", ob);

  for (let round = 0; round < 8 && !ob.done; round++) {
    await H.walkDesktop(page, 2800);
    ob = await readOnboarding(page);
    note(`after_walk_${round}`, ob);
    await snap(page, `02-walk-r${round}-step${ob.step ?? "?"}`);

    if ((ob.step ?? 0) >= 1 || ob.progress?.visit_street) {
      await H.navGo(page, "street");
      await snap(page, "03-street");
    }
    if ((ob.step ?? 0) === 2) {
      await H.openGangNpc(page, "razor");
      await H.clickFirstStoryChoice(page).catch(() => {});
      await H.dismissStoryDialog(page);
      await snap(page, "03b-razor-talk");
    }
    if ((ob.step ?? 0) >= 1) {
      await H.pressTalk(page, false);
      await H.dismissStoryDialog(page);
      await H.sleep(500);
    }
    if ((ob.step ?? 0) >= 4) {
      await H.winFightUi(page).catch(() => {});
    }
    if ((ob.step ?? 0) >= 5) {
      await H.buyCheapestShop(page).catch(() => {});
    }
    ob = await readOnboarding(page);
    if (ob.done) break;
  }

  await snap(page, "04-ch0-end");
  return await readOnboarding(page);
}

async function runHangoutAndLateChapters(page) {
  const story = await page.evaluate(() => {
    const st = window.StoryEngine?.ensureStoryState?.(window.me);
    return {
      chapter: window.me?.story?.chapter,
      quest: window.me?.story?.quest,
      hangoutStage: st?.hangoutStage ?? 0
    };
  });
  note("pre_hangout_story", story);

  const ob = await readOnboarding(page);
  if (!ob.done) {
    note("hangout_skipped", { reason: "onboarding_not_done", ob });
  } else if ((story.hangoutStage ?? 0) < 4) {
    const hang = await H.buildAllHangoutStages(page, log, { outDir, tag });
    note("hangout_result", hang);
  }

  await snap(page, "05-hangout-done");

  const auth = await H.completeAuthorityPathUi(page, false, log).catch(e => ({ error: String(e) }));
  note("authority_path", auth);

  await snap(page, "06-ch3-progress");

  const finale = await page.evaluate(() => ({
    chapter: window.me?.story?.chapter,
    quest: window.me?.story?.quest,
    ending: window.me?.story?.ending,
    hangoutStage: window.StoryEngine?.ensureStoryState?.(window.me)?.hangoutStage
  }));
  note("finale_state", finale);
  await snap(page, "07-finale-state");
  return finale;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  try {
    await enterGameHonest(page);
    const ch01 = await runCh01(page);
    note("ch01_complete", ch01);
    const finale = await runHangoutAndLateChapters(page);
    fs.writeFileSync(path.join(outDir, `${tag}-run-log.json`), JSON.stringify({ log, ch01, finale }, null, 2));
    console.log("honest-emulator-scenario-run: OK");
  } catch (e) {
    await snap(page, "99-error").catch(() => {});
    fs.writeFileSync(path.join(outDir, `${tag}-run-log.json`), JSON.stringify({ log, error: String(e) }, null, 2));
    console.error(e);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
