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
  const pay = page.locator('.story-choice[data-choice="c_pay"]');
  if (await pay.count()) await pay.click({ timeout: 10000 });
  else await H.clickFirstStoryChoice(page);
  await H.advanceStoryNext(page);
  await H.dismissStoryDialog(page);
  await H.closeGangModal(page);
  await page.waitForFunction(
    () => window.StoryEngine?.ensureStoryState?.(window.me)?.quest?.activeId === "q_initiation_pay",
    { timeout: 15000 }
  );
}

async function openJournalMenu(page) {
  await H.dismissStoryDialog(page);
  await page.locator("#btnGameMenu").click({ timeout: 10000 });
  await page.waitForSelector("#gameMenuOverlay.active", { timeout: 8000 });
}

async function runFullEpisode1Ui(page, opts = {}) {
  const {
    mark,
    touchOnly = false,
    walkMs = 2400,
    skipPropiska = false,
    snapDir = null,
    snapTag = "ep1"
  } = opts;

  if (touchOnly) await H.walkMobile(page, walkMs);
  else await H.walkDesktop(page, walkMs);
  mark?.("tutorial_move", "WASD / joystick — room");

  await H.navGo(page, "street");
  mark?.("tutorial_street", "quick nav → street");

  await H.openGangNpc(page, "razor");
  mark?.("razor_talk", "gang UI → Razor dialog");
  if (snapDir) await H.snap(page, snapDir, snapTag, "dialog-razor");
  await H.advanceStoryNext(page).catch(() => {});
  await H.dismissStoryDialog(page);
  await H.closeGangModal(page);

  await openJournalMenu(page);
  mark?.("quest_journal", "pause menu journal");
  if (snapDir) await H.snap(page, snapDir, snapTag, "journal-onboarding");
  await page.locator("#gameMenuClose").click();

  await H.navGo(page, "cemetery");
  mark?.("tutorial_cemetery", "cemetery visit");

  await H.navGo(page, "street");
  await page.locator("#btnFight").click({ timeout: 20000, force: true });
  mark?.("tutorial_duel", "Chain fight UI");
  const won = await H.winFightUi(page, 45000);
  mark?.("tutorial_duel_result", won ? "win_fight onboarding" : "fight timeout");

  await H.navGo(page, "room");
  await page.locator('button[onclick*="openModal(\'shopModal\')"]').click({ timeout: 15000 });
  await page.waitForSelector("#shopGrid, .shop-grid, #shopModal", { timeout: 10000 });
  mark?.("shop_open", "shop modal — prices on grid");
  if (snapDir) await H.snap(page, snapDir, snapTag, "shop-prices");
  await H.buyCheapestShop(page);
  mark?.("shop_buy", "first item purchased");
  await waitOnboardingDone(page);
  mark?.("onboarding_reward", "onboarding.done + grantRewardOnce");

  if (!skipPropiska) {
    await acceptPropiskaPayQuest(page);
    mark?.("propiska_intro", "q_initiation_pay accepted");
    if (snapDir) await H.snap(page, snapDir, snapTag, "finale-propiska");
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
