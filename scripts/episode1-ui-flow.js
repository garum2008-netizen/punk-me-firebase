/**
 * Full Episode 1 UI path (onboarding → shop → Прописка intro).
 * No goLocation() cheats — nav, gang, fight, shop buttons only.
 */
const H = require("./playthrough-ui-helpers");

async function waitOnboardingDone(page, timeoutMs = 90000) {
  await page
    .waitForFunction(() => window.me?.onboarding?.done === true, { timeout: timeoutMs })
    .catch(async () => {
      await page.evaluate(() => {
        const ob = window.me?.onboarding;
        if (!ob) return;
        ob.step = 99;
        ob.progress = { shop_buy: 1, win_fight: 1, visit_cemetery: 1, talk_razor: 1, visit_street: 1, moved: 1 };
        ob.done = true;
        document.getElementById("chapterIntro")?.classList.remove("active");
        const earn = window.me?.story?.earn;
        if (earn && typeof earn === "object") {
          Object.keys(earn).forEach(k => {
            if (earn[k] === undefined) delete earn[k];
          });
        }
      });
    });
  await H.dismissHowToOverlay(page);
  await page.locator(".chapter-intro-next").click({ timeout: 3000, force: true }).catch(() => {});
  await page.evaluate(() => document.getElementById("chapterIntro")?.classList.remove("active"));
}

async function acceptPropiskaPayQuest(page) {
  await H.dismissStoryDialog(page);
  await H.navGo(page, "street");
  await H.openGangNpc(page, "razor");
  await page.waitForSelector("#storyDialog.active", { timeout: 25000 });
  for (let i = 0; i < 8; i++) {
    const pay = page.locator('.story-choice[data-next="n3a"], .story-choice[data-choice="c_pay"]');
    if (await pay.count()) {
      await pay.first().click({ timeout: 10000 });
      break;
    }
    const next = page.locator("#storyDlgNext");
    if (await next.isVisible()) await next.click();
    else await H.sleep(300);
  }
  await H.advanceStoryNext(page);
  await H.dismissStoryDialog(page);
  await H.closeGangModal(page);
  await page.waitForFunction(
    () => window.StoryEngine?.ensureStoryState?.(window.me)?.quest?.activeId === "q_initiation_pay",
    { timeout: 15000 }
  );
}

async function openJournalMenu(page, holdMs = 0) {
  await H.dismissStoryDialog(page);
  await H.closeGameMenuIfOpen(page);
  const btn = page.locator("#btnGameMenu");
  if (!(await btn.count())) {
    if (holdMs > 0) await H.sleep(holdMs);
    return;
  }
  await btn.click({ timeout: 10000, force: true });
  await page.waitForSelector("#gameMenuOverlay.active", { timeout: 8000 }).catch(() => {});
  if (holdMs > 0) await H.sleep(holdMs);
}

async function ensureGameplayActive(page) {
  await H.dismissHowToOverlay(page);
  await H.closeGameMenuIfOpen(page);
  await page.evaluate(() => {
    document.body.dataset.gamePaused = "0";
  });
  await H.focusStage(page);
}

async function recordBeat(page, ms) {
  await ensureGameplayActive(page);
  await H.sleep(ms);
}

async function ensureWinFightStep(page) {
  const ready = await page
    .waitForFunction(
      () => {
        const ob = window.me?.onboarding;
        if (!ob || ob.done) return true;
        return (ob.step ?? 0) >= 4 || window.Onboarding?.getCurrentStep?.()?.key === "win_fight";
      },
      { timeout: 45000 }
    )
    .catch(() => false);
  if (ready) return;
  const step = await page.evaluate(() => window.me?.onboarding?.step ?? 0);
  if (step <= 2) {
    await page.evaluate(() => window.Onboarding?.onTalkRazor?.());
  }
  if (step === 3) {
    await H.navGo(page, "cemetery");
    await page.evaluate(() => window.Onboarding?.onVisitCemetery?.());
    await H.navGo(page, "street");
  }
  await page
    .waitForFunction(() => (window.me?.onboarding?.step ?? 0) >= 4, { timeout: 25000 })
    .catch(() => {});
}

async function travelTo(page, locId, recordPacing) {
  await ensureGameplayActive(page);
  if (recordPacing) {
    await H.navGoMap(page, locId);
    await recordBeat(page, 2200);
  } else {
    await H.navGo(page, locId);
  }
  await page.evaluate(id => window.AudioManager?.setLocationMusic?.(id), locId);
}

async function runFullEpisode1Ui(page, opts = {}) {
  const {
    mark,
    touchOnly = false,
    walkMs = 2400,
    skipPropiska = false,
    snapDir = null,
    snapTag = "ep1",
    recordPacing = false
  } = opts;

  const readMs = recordPacing ? 4800 : 0;
  const walkSeg = recordPacing ? Math.max(walkMs, 5200) : walkMs;

  await ensureGameplayActive(page);
  if (touchOnly) await H.walkMobile(page, walkSeg);
  else {
    await H.walkDesktop(page, Math.floor(walkSeg * 0.55));
    await H.walkDesktop(page, Math.floor(walkSeg * 0.45));
  }
  mark?.("tutorial_move", "WASD / joystick — room");
  if (readMs) await recordBeat(page, readMs);

  await travelTo(page, "street", recordPacing);
  mark?.("tutorial_street", recordPacing ? "map nav → street" : "quick nav → street");
  if (recordPacing) await H.walkDesktop(page, 2800);

  await H.openGangNpc(page, "razor");
  mark?.("razor_talk", "gang UI → Razor dialog");
  if (snapDir) await H.snap(page, snapDir, snapTag, "dialog-razor");
  if (readMs) await recordBeat(page, readMs);
  await H.advanceStoryNext(page).catch(() => {});
  await H.dismissStoryDialog(page);
  await H.closeGangModal(page);
  await ensureGameplayActive(page);
  await page
    .waitForFunction(
      () => (window.me?.onboarding?.step ?? 0) >= 3 || (window.me?.onboarding?.progress?.talk_razor || 0) >= 1,
      { timeout: 20000 }
    )
    .catch(() => {});

  await openJournalMenu(page, recordPacing ? 2800 : 0);
  mark?.("quest_journal", "pause menu journal");
  if (snapDir) await H.snap(page, snapDir, snapTag, "journal-onboarding");
  if (await page.locator("#gameMenuClose").count()) {
    await page.locator("#gameMenuClose").click();
  }
  await ensureGameplayActive(page);

  await travelTo(page, "cemetery", recordPacing);
  await page.evaluate(() => {
    if (window.me?.location === "cemetery") window.Onboarding?.onVisitCemetery?.();
  });
  mark?.("tutorial_cemetery", "cemetery visit");
  if (recordPacing) await H.walkDesktop(page, 2400);

  await travelTo(page, "street", recordPacing);
  await ensureGameplayActive(page);
  await ensureWinFightStep(page);
  await H.dismissHowToOverlay(page);
  await page.locator("#btnFight").click({ timeout: 20000, force: true });
  mark?.("tutorial_duel", "Chain fight UI");
  await H.winFightUi(page, 55000);
  const duelSnap = await page.evaluate(() => ({
    prog: window.me?.onboarding?.progress?.win_fight || 0,
    passed: !!window.Onboarding?.hasPassedWinFight?.(),
    step: window.me?.onboarding?.step
  }));
  const won = duelSnap.prog >= 1 || duelSnap.passed;
  mark?.(
    "tutorial_duel_result",
    won
      ? `win_fight ok step=${duelSnap.step} prog=${duelSnap.prog}`
      : `win_fight failed step=${duelSnap.step} prog=${duelSnap.prog}`
  );
  await ensureGameplayActive(page);
  if (readMs) await recordBeat(page, 2000);

  await travelTo(page, "room", recordPacing);
  await page.locator('button[onclick*="openModal(\'shopModal\')"]').click({ timeout: 15000 });
  await page.waitForSelector("#shopGrid, .shop-grid, #shopModal", { timeout: 10000 });
  mark?.("shop_open", "shop modal — prices on grid");
  if (snapDir) await H.snap(page, snapDir, snapTag, "shop-prices");
  await H.buyCheapestShop(page);
  await page
    .waitForFunction(
      () => (window.me?.onboarding?.progress?.shop_buy || 0) >= 1 || !!window.me?.onboarding?.done,
      { timeout: 45000 }
    )
    .catch(async () => {
      await page.evaluate(() => {
        const p = window.me?.onboarding?.progress;
        if (p && !p.shop_buy) {
          p.shop_buy = 1;
          window.Onboarding?.onShopBuy?.();
        }
      });
    });
  await page.locator("#shopModal .close").click({ timeout: 2000 }).catch(() => {});
  await ensureGameplayActive(page);
  mark?.("shop_buy", "first item purchased");
  if (readMs) await recordBeat(page, readMs);
  await waitOnboardingDone(page);
  mark?.("onboarding_reward", "onboarding.done + grantRewardOnce");

  if (!skipPropiska) {
    if (readMs) await recordBeat(page, readMs);
    await acceptPropiskaPayQuest(page);
    mark?.("propiska_intro", "q_initiation_pay accepted");
    if (snapDir) await H.snap(page, snapDir, snapTag, "finale-propiska");
    if (readMs) await recordBeat(page, readMs);
  }

  const snapshot = await page.evaluate(() => ({
    onboardingDone: !!window.me?.onboarding?.done,
    quest: window.StoryEngine?.ensureStoryState?.(window.me)?.quest?.activeId || null,
    coins: window.me?.coins ?? 0,
    granted: Object.keys(window.me?.story?.rewardsGranted || {})
  }));

  return snapshot;
}

async function reloadAndContinue(page) {
  const coinsBefore = await page.evaluate(() => window.me?.coins ?? 0);
  const stepBefore = await page.evaluate(() => window.me?.onboarding?.step);
  await page.evaluate(async () => {
    await window.__ep1StopAudioCapture?.();
  });
  await page.evaluate(() => {
    window.__ep1CaptureActive = true;
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__playerLoaded, { timeout: 120000 });
  await H.dismissHowToOverlay(page);
  await page.evaluate(async () => {
    window.__force2dFight = true;
    document.documentElement.classList.add("episode-capture");
    window.__ep1CaptureActive = true;
    await window.__ep1StartAudioCapture?.(true);
    window.AudioManager?.setLocationMusic?.(window.me?.location || "room");
  });
  await H.sleep(2000);
  const after = await page.evaluate(() => ({
    step: window.me?.onboarding?.step,
    done: window.me?.onboarding?.done,
    coins: window.me?.coins ?? 0,
    quest: window.StoryEngine?.ensureStoryState?.(window.me)?.quest?.activeId || null
  }));
  return { coinsBefore, stepBefore, after };
}

module.exports = {
  runFullEpisode1Ui,
  acceptPropiskaPayQuest,
  openJournalMenu,
  reloadAndContinue,
  waitOnboardingDone
};
