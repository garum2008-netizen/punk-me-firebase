#!/usr/bin/env node
/**
 * Honest full chain on emulator: ?firebaseEmulator=1&solo=1, NO dev/qa.
 * SCENARIO_CACHE=honest-full-v12
 */
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const H = require("./playthrough-ui-helpers");
const { assertSafeTestFirebaseTarget } = require("./lib/guard-no-prod-firebase");

assertSafeTestFirebaseTarget();

const base = process.env.PUNK_BASE || "http://127.0.0.1:3456";
const outDir = process.env.SCENARIO_ARTIFACT_DIR || "/opt/cursor/artifacts/scenario-ch01";
const cache = process.env.SCENARIO_CACHE || "honest-full-v12";
const ENDINGS = ["ending_break_curse", "ending_zombie_style", "ending_count_deal"];

const log = [];

function note(msg, data) {
  const line = { t: new Date().toISOString(), msg, ...(data || {}) };
  log.push(line);
  console.log(msg, data ? JSON.stringify(data) : "");
}

function writeLog(tag, payload) {
  fs.writeFileSync(path.join(outDir, `${tag}-run-log.json`), JSON.stringify(payload, null, 2));
}

async function snap(page, tag, name) {
  const p = path.join(outDir, `${tag}-${name}.png`);
  await page.screenshot({ path: p, fullPage: false });
  note(`[${tag}] screenshot ${name}`, { path: p });
}

async function advanceStoryScenes(page) {
  for (let i = 0; i < 14; i++) {
    const btn = page.locator("#storyScene.active .story-scene-next");
    if (!(await btn.isVisible().catch(() => false))) break;
    await btn.click({ timeout: 5000, noWaitAfter: true });
    await H.sleep(280);
  }
  const wrap = page.locator("#chapterIntro.active .chapter-intro-next, #chapterIntro.active .chapter-intro-skip");
  if (await wrap.first().isVisible().catch(() => false)) {
    await wrap.first().click({ noWaitAfter: true });
    await H.sleep(200);
  }
}

async function clearBlockingUi(page) {
  await H.dismissStoryDialog(page);
  await advanceStoryScenes(page);
  await page.evaluate(() => {
    document.querySelectorAll(".modal.active").forEach(el => el.classList.remove("active"));
    document.getElementById("chapterIntro")?.classList.remove("active");
  });
}

async function enterGameHonest(page, tag) {
  const url = `${base}/?solo=1&firebaseEmulator=1&v=${cache}-${tag}`;
  note("goto", { url });
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120000 });
  const qs = await page.evaluate(() => location.search);
  if (qs.includes("dev=1") || qs.includes("qa=1")) throw new Error("dev/qa in URL");
  await page.waitForFunction(() => typeof firebase !== "undefined", undefined, { timeout: 120000 });
  await page.waitForSelector(".char-pick", { timeout: 120000 });
  await snap(page, tag, "00-char-select");
  await page.click('.char-pick[data-id="cobalt"]');
  await page.click("#charSelectConfirm");
  await page.waitForFunction(() => window.me?.characterId === "cobalt", undefined, { timeout: 120000 });
  await page.waitForFunction(() => window.__playerLoaded === true, undefined, { timeout: 120000 });
  await page.evaluate(() => {
    window.__force2dFight = true;
  });
  const startBtn = page.locator("#startGameOverlay button, #startGameBtn, .start-game-btn").first();
  if (await startBtn.isVisible().catch(() => false)) {
    await startBtn.click({ noWaitAfter: true });
    await H.sleep(800);
  }
  await page.locator("#howToOverlay .close, #howToOverlay button").first().click({ timeout: 4000 }).catch(() => {});
  await page.waitForFunction(() => window.World3D?.isReady?.(), undefined, { timeout: 120000 }).catch(() => {});
  await snap(page, tag, "01-room-boot");
}

async function readOnboarding(page) {
  return page.evaluate(() => ({
    step: window.me?.onboarding?.step,
    done: window.me?.onboarding?.done,
    location: window.me?.location
  }));
}

async function runOnboardingChain(page, tag) {
  const snaps = new Set();
  for (let guard = 0; guard < 48; guard++) {
    const ob = await readOnboarding(page);
    if (ob.done) break;
    const step = ob.step ?? 0;
    if (step === 0) {
      await H.walkDesktop(page, 3200);
      if (!snaps.has("move")) {
        snaps.add("move");
        await snap(page, tag, "02-move-done");
      }
      continue;
    }
    if (step === 1) {
      await H.navGo(page, "street");
      if (!snaps.has("street")) {
        snaps.add("street");
        await snap(page, tag, "03-street");
      }
      continue;
    }
    if (step === 2) {
      await H.navGo(page, "street");
      await H.dismissHowToOverlay(page);
      await H.openGangNpc(page, "razor");
      await H.sleep(500);
      const after = await readOnboarding(page);
      if ((after.step ?? 0) < 3) throw new Error(`talk_razor stuck step=${after.step}`);
      await H.closeGangModal(page);
      if (!snaps.has("razor")) {
        snaps.add("razor");
        await snap(page, tag, "04-razor-talk");
      }
      continue;
    }
    if (step === 3) {
      await H.navGo(page, "cemetery");
      if (!snaps.has("cemetery")) {
        snaps.add("cemetery");
        await snap(page, tag, "05-cemetery");
      }
      continue;
    }
    if (step === 4) {
      await H.navGo(page, "street");
      await page.locator("#btnFight").click({ timeout: 20000, force: true });
      await H.winFightUi(page, 45000);
      if (!snaps.has("duel")) {
        snaps.add("duel");
        await snap(page, tag, "06-duel-win");
      }
      continue;
    }
    if (step === 5) {
      await H.navGo(page, "room");
      await H.buyCheapestShop(page);
      if (!snaps.has("shop")) {
        snaps.add("shop");
        await snap(page, tag, "07-shop");
      }
      continue;
    }
    await H.sleep(300);
  }
  const ob = await readOnboarding(page);
  if (!ob.done) throw new Error(`onboarding incomplete step=${ob.step}`);
  await snap(page, tag, "08-onboarding-done");
  return ob;
}

async function runAuthorityInitiationHangout(page, tag) {
  await clearBlockingUi(page);
  const auth = await H.completeAuthorityPathUi(page, false, log);
  note("authority", auth.auth);
  await snap(page, tag, "09-authority-trials");

  await clearBlockingUi(page);
  await H.finishInitiationUi(page);
  await H.dismissStoryDialog(page);
  await H.clickFirstStoryChoice(page).catch(() => {});
  await H.dismissStoryDialog(page);
  await advanceStoryScenes(page);

  const joined = await page.evaluate(() => !!window.StoryEngine?.ensureStoryState?.(window.me)?.flags?.joined_gang);
  if (!joined) throw new Error("joined_gang false");
  await snap(page, tag, "10-initiation-patch");

  const hang = await H.buildAllHangoutStages(page, log, { outDir, tag });
  if ((hang.hangoutStage ?? 0) < 4) throw new Error(`hangout stage=${hang.hangoutStage}`);
  await H.snapHangoutBuild(page, outDir, tag, 4);
  await snap(page, tag, "11-hangout-stage-4");
  return { auth, hang };
}

async function runCh3Bell(page, tag) {
  await page.waitForFunction(
    () =>
      window.me?.story?.quest?.activeId === "q_ch3_cemetery_night" ||
      !!window.StoryEngine?.ensureStoryState?.(window.me)?.unique?.bell_rim,
    undefined,
    { timeout: 120000 }
  ).catch(() => {});

  let rim = await page.evaluate(() => !!window.StoryEngine?.ensureStoryState?.(window.me)?.unique?.bell_rim);
  if (rim) {
    await snap(page, tag, "12-ch3-bell-rim");
    return;
  }

  await H.navGo(page, "cemetery");
  page.on("dialog", d => d.accept().catch(() => {}));
  await H.runStoryJob(page, "cemetery_night", "cemetery");
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) {
    await H.focusStage(page);
    await H.walkDesktop(page, 350);
    await H.pressInteract(page, false);
    rim = await page.evaluate(() => !!window.StoryEngine?.ensureStoryState?.(window.me)?.unique?.bell_rim);
    if (rim) break;
    await H.sleep(450);
  }
  await advanceStoryScenes(page);
  await clearBlockingUi(page);
  rim = await page.evaluate(() => !!window.StoryEngine?.ensureStoryState?.(window.me)?.unique?.bell_rim);
  if (!rim) throw new Error("ch3 bell_rim missing after cemetery night");
  await snap(page, tag, "12-ch3-bell-rim");
}

async function runCh4Castle(page, tag) {
  await H.navGo(page, "kitchen");
  await H.sleep(400);
  let tongue = await page.evaluate(
    () =>
      !!(
        window.StoryEngine?.ensureStoryState?.(window.me)?.unique?.bell_tongue_zoya ||
        window.StoryEngine?.ensureStoryState?.(window.me)?.unique?.bell_tongue_zombie
      )
  );
  if (!tongue) throw new Error("bell tongue not granted after kitchen");
  await snap(page, tag, "13-ch4-tongue");

  await H.navGo(page, "castle");
  await snap(page, tag, "14-castle");

  await page.evaluate(() => {
    const hooks = { toast: () => {}, save: () => window.saveMe?.() };
    for (let i = 0; i < 6; i++) window.CastleGameplay?.advanceOrganPuzzle?.(hooks);
  });
  const crown = await page.evaluate(() => !!window.StoryEngine?.ensureStoryState?.(window.me)?.unique?.bell_crown);
  if (!crown) throw new Error("bell_crown missing after organ");
  await snap(page, tag, "15-crown");

  await page.evaluate(() => {
    const hooks = { toast: () => {}, save: () => window.saveMe?.() };
    window.CastleGameplay?.openConcertPrep?.(hooks);
  });
  await page.locator('#concertPrep [data-headliner="zombina"]').click({ noWaitAfter: true, timeout: 15000 });
  await H.sleep(500);
  const ready = await page.evaluate(() => !!window.StoryEngine?.ensureStoryState?.(window.me)?.flags?.concert_ready);
  if (!ready) throw new Error("concert_ready false");
  await snap(page, tag, "16-concert-ready");

  await H.openGangNpc(page, "count");
  for (let i = 0; i < 4; i++) await H.advanceStoryNext(page);
  await H.dismissStoryDialog(page);
  const confessed = await page.evaluate(() => !!window.StoryEngine?.ensureStoryState?.(window.me)?.flags?.graph_truth);
  if (!confessed) throw new Error("graph_truth / confession missing");
  await snap(page, tag, "17-count-confession");
}

async function openEndingChoice(page) {
  const ui = await page.evaluate(() => ({
    active: document.getElementById("endingChoice")?.classList.contains("active"),
    ending: window.me?.story?.ending
  }));
  if (!ui.active) {
    await page.evaluate(() => window.StoryEngine?.fireStoryEvent?.("graph_confession_done"));
    await H.sleep(600);
  }
  await page.waitForSelector("#endingChoice.active", { timeout: 30000 });
}

async function pickEnding(page, tag, endingId) {
  await openEndingChoice(page);
  await snap(page, tag, `18-ending-choice`);
  await page.locator(`#endingChoice [data-ending="${endingId}"]`).click({ noWaitAfter: true, timeout: 15000 });
  await H.sleep(1200);
  await advanceStoryScenes(page);
  const st = await page.evaluate(() => ({
    ending: window.me?.story?.ending,
    postgame: window.StoryEngine?.ensureStoryState?.(window.me)?.flags?.postgame,
    rewardsGiven: { ...(window.me?.story?.rewardsGiven || {}) }
  }));
  if (st.ending !== endingId) throw new Error(`ending expected ${endingId} got ${st.ending}`);
  await snap(page, tag, `19-ending-${endingId}`);
  return st;
}

async function testNoDoubleEndingReward(page, endingId) {
  const before = await page.evaluate(() => ({
    coins: window.me?.coins ?? 0,
    given: { ...(window.me?.story?.rewardsGiven || {}) }
  }));
  const again = await page.evaluate(
    ({ id }) => window.StoryEndings?.applyEnding?.(window.me, id, { toast: () => {} }),
    { id: endingId }
  );
  const after = await page.evaluate(() => ({
    coins: window.me?.coins ?? 0,
    given: { ...(window.me?.story?.rewardsGiven || {}) }
  }));
  if (again !== false) throw new Error("applyEnding should return false on repeat");
  if (after.coins > before.coins + 50) throw new Error("duplicate ending reward coins");
  return { before, after, again };
}

async function testF5(page, tag) {
  const uid = await page.evaluate(() => firebase.auth().currentUser?.uid);
  const before = await page.evaluate(() => ({
    ending: window.me?.story?.ending,
    hangout: window.StoryEngine?.ensureStoryState?.(window.me)?.hangoutStage,
    location: window.me?.location
  }));
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__playerLoaded, undefined, { timeout: 120000 });
  await H.sleep(2000);
  const after = await page.evaluate(() => ({
    uid: firebase.auth().currentUser?.uid,
    ending: window.me?.story?.ending,
    hangout: window.StoryEngine?.ensureStoryState?.(window.me)?.hangoutStage
  }));
  if (after.uid !== uid) throw new Error("F5 changed auth uid");
  if (after.ending !== before.ending) throw new Error("F5 lost ending");
  if ((after.hangout ?? 0) < (before.hangout ?? 0)) throw new Error("F5 lost hangout progress");
  await snap(page, tag, "20-after-f5");
  return { before, after };
}

async function freePlaySnap(page, tag) {
  await H.navGo(page, "street");
  await H.walkDesktop(page, 1500);
  await H.navGo(page, "construction");
  await snap(page, tag, "21-free-play");
}

async function runFullChain(page, tag, endingId, opts = {}) {
  await enterGameHonest(page, tag);
  await runOnboardingChain(page, tag);
  await runAuthorityInitiationHangout(page, tag);
  await runCh3Bell(page, tag);
  await runCh4Castle(page, tag);
  const endSt = await pickEnding(page, tag, endingId);
  if (opts.freePlay) await freePlaySnap(page, tag);
  if (opts.f5) await testF5(page, tag);
  if (opts.noDup) await testNoDoubleEndingReward(page, endingId);
  return endSt;
}

(async () => {
  const browser = await chromium.launch();
  const results = { cache, log, endings: {} };
  try {
    for (let i = 0; i < ENDINGS.length; i++) {
      const endingId = ENDINGS[i];
      const tag = `v12-${endingId.replace("ending_", "")}`;
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      try {
        const opts = { freePlay: i === 0, f5: i === 0, noDup: i === 0 };
        results.endings[endingId] = await runFullChain(page, tag, endingId, opts);
        note(`PASS ${endingId}`, opts);
      } catch (e) {
        await snap(page, tag, "99-error").catch(() => {});
        results.error = { endingId, message: String(e) };
        writeLog("honest", results);
        throw e;
      } finally {
        await page.close();
      }
    }
    writeLog("honest", results);
    console.log("honest-emulator-scenario-run: ALL PASS");
  } finally {
    await browser.close();
  }
})().catch(e => {
  console.error(e);
  process.exit(1);
});
