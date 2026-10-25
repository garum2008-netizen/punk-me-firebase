/**
 * Full Episode 1 UI path (onboarding → shop → Прописка intro).
 * No goLocation() cheats — nav, gang, fight, shop buttons only.
 */
const H = require("./playthrough-ui-helpers");

async function waitOnboardingDone(page, timeoutMs = 60000) {
  await page.waitForFunction(() => window.me?.onboarding?.done === true, { timeout: timeoutMs });
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
  await page.locator("#btnGameMenu").click({ timeout: 10000, force: true });
  await page.waitForSelector("#gameMenuOverlay.active", { timeout: 8000 });
  if (holdMs > 0) await H.sleep(holdMs);
}

async function ensureGameplayActive(page) {
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

async function travelTo(page, locId, recordPacing) {
  await ensureGameplayActive(page);
  if (recordPacing) {
    await H.navGoMap(page, locId);
    await recordBeat(page, 2200);
  } else {
    await H.navGo(page, locId);
  }
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

  await openJournalMenu(page, recordPacing ? 2800 : 0);
  mark?.("quest_journal", "pause menu journal");
  if (snapDir) await H.snap(page, snapDir, snapTag, "journal-onboarding");
  await page.locator("#gameMenuClose").click();
  await ensureGameplayActive(page);

  await travelTo(page, "cemetery", recordPacing);
  mark?.("tutorial_cemetery", "cemetery visit");
  if (recordPacing) await H.walkDesktop(page, 2400);

  await travelTo(page, "street", recordPacing);
  await ensureGameplayActive(page);
  await page.locator("#btnFight").click({ timeout: 20000, force: true });
  mark?.("tutorial_duel", "Chain fight UI");
  await H.winFightUi(page, 55000);
  const winProg = await page.evaluate(() => window.me?.onboarding?.progress?.win_fight || 0);
  const won = winProg >= 1;
  mark?.(
    "tutorial_duel_result",
    won
      ? `onboarding progress win_fight=${winProg} (Onboarding.onWinFight from endFight)`
      : `win_fight progress=${winProg} — fight UI did not finish in time`
  );
  await ensureGameplayActive(page);
  if (readMs) await recordBeat(page, 2000);

  await travelTo(page, "room", recordPacing);
  await page.locator('button[onclick*="openModal(\'shopModal\')"]').click({ timeout: 15000 });
  await page.waitForSelector("#shopGrid, .shop-grid, #shopModal", { timeout: 10000 });
  mark?.("shop_open", "shop modal — prices on grid");
  if (snapDir) await H.snap(page, snapDir, snapTag, "shop-prices");
  await H.buyCheapestShop(page);
  await page.waitForFunction(
    () => (window.me?.onboarding?.progress?.shop_buy || 0) >= 1 || !!window.me?.onboarding?.done,
    { timeout: 25000 }
  );
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
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => window.__playerLoaded, { timeout: 120000 });
  await page.evaluate(() => {
    window.__force2dFight = true;
    document.documentElement.classList.add("episode-capture");
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
