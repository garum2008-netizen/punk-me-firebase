/**
 * Six YouTube-ready flows (goal → action → surprise → result).
 */
const H = require("./playthrough-ui-helpers");
const Ep1 = require("./episode1-ui-flow");
const PrB = require("./pr-b-ui-flow");

async function readEconomy(page) {
  return page.evaluate(() => ({
    coins: window.me?.coins ?? 0,
    quest: window.StoryEngine?.ensureStoryState?.(window.me)?.quest?.activeId ?? null,
    onboardingStep: window.me?.onboarding?.step,
    onboardingDone: window.me?.onboarding?.done === true
  }));
}

async function prepFreshPlayer(page, { lang = "ru", showHowTo = false } = {}) {
  await page.evaluate(() => document.getElementById("chapterIntro")?.classList.remove("active"));
  await H.dismissHowToOverlay(page);
  await H.skipChapterIntro(page);
  await page.evaluate(l => {
    if (typeof setLanguage === "function") setLanguage(l, true);
  }, lang);
  await H.unlockGameAudio(page);
  if (showHowTo) {
    await page.evaluate(() => window.openHowToPlay?.());
    await H.sleep(1200);
  } else {
    await H.dismissHowToOverlay(page);
  }
}

/** 01 — сюжет: первая работа на кладбище (dig). */
async function flow01CemeteryJob(page, mark) {
  const before = await readEconomy(page);
  mark?.("goal_on_screen", "доска работ — задание «копать»");
  page.on("dialog", d => d.accept().catch(() => {}));
  await page.locator("#btnJob, button[onclick=\"openJobPanel()\"]").first().click({ force: true });
  await page.waitForSelector("#jobModal.active", { timeout: 15000 });
  const btn = page.locator("#jobModal.active #jobActions button[onclick*=\"'dig'\"]").first();
  if (!(await btn.count())) {
    return { blocked: true, reason: "dig job missing", before, after: before };
  }
  mark?.("player_action", "принять работу → переход на кладбище");
  await btn.click({ force: true });
  await page.waitForFunction(() => window.me?.location === "cemetery", { timeout: 60000 });
  await H.sleep(500);
  mark?.("surprise", "мини-игра на кладбище — таймер и точки");
  const t0 = Date.now();
  while (Date.now() - t0 < 16000) {
    await H.walkDesktop(page, 650);
    await page.keyboard.press("e").catch(() => {});
    if (!(await page.evaluate(() => !!document.getElementById("gpCemeteryTimer")))) break;
  }
  await page.evaluate(() => window.PlayV21?.endAllActivities?.());
  const after = await readEconomy(page);
  mark?.("result", `монеты ${before.coins} → ${after.coins}`);
  return { blocked: after.coins <= before.coins, reason: after.coins > before.coins ? null : "no coin reward", before, after };
}

/** 02 — сюжет: склеп до/после украшения. */
async function flow02CryptDecor(page, mark) {
  await H.navGo(page, "cemetery");
  mark?.("goal_on_screen", "кладбище — зона склепа");
  await H.pulseCamera(page);
  await H.sleep(900);
  mark?.("player_action", "режим декора — каталог");
  await PrB.recordCryptShowcase(page, mark);
  mark?.("surprise", "размещение надгробий / свечей");
  mark?.("result", "склеп украшен — вид в кадре");
  const after = await readEconomy(page);
  return { blocked: false, after };
}

/** 03 — объяснение управления (ПК). */
async function flow03ControlsDesktop(page, mark) {
  await page.evaluate(() => {
    try {
      localStorage.removeItem("punkme_howto_seen");
    } catch (e) {}
    window.openHowToPlay?.();
  });
  mark?.("goal_on_screen", "оверлей «Как играть» — цель и клавиши");
  await H.sleep(2200);
  await H.dismissHowToOverlay(page);
  mark?.("player_action", "WASD движение + E взаимодействие");
  await H.walkDesktop(page, 1600);
  await H.focusStage(page);
  await page.keyboard.press("e").catch(() => {});
  await Ep1.openJournalMenu(page, 600);
  mark?.("surprise", "меню паузы — журнал заданий");
  await page.locator("#gameMenuClose").click({ timeout: 2000 }).catch(() => {});
  mark?.("result", "управление показано на реальном HUD");
  return { blocked: false, controls: "WASD, E, Esc/меню, мышь — камера" };
}

/** 04 — объяснение управления (мобильный). */
async function flow04ControlsMobile(page, mark) {
  await page.evaluate(() => {
    document.documentElement.classList.add("content-force-touch");
    const tc = document.getElementById("touchControls");
    if (tc) tc.style.display = "block";
    try {
      localStorage.removeItem("punkme_howto_seen");
    } catch (e) {}
    window.openHowToPlay?.();
  });
  mark?.("goal_on_screen", "how-to touch + джойстик");
  await H.sleep(1800);
  await H.dismissHowToOverlay(page);
  mark?.("player_action", "джойстик + кнопки Talk/Interact");
  await H.walkMobile(page, 1400);
  await H.navGo(page, "street");
  await H.pressTalk(page, true);
  mark?.("surprise", "диалог после touch Talk");
  await H.advanceStoryNext(page).catch(() => {});
  await H.dismissStoryDialog(page);
  mark?.("result", "мобильные кнопки в кадре");
  return { blocked: false, controls: "#touchJoystick, #touchTalk, #touchInteract" };
}

/** 05 — неожиданный момент: ночная смена с призраками. */
async function flow05SurpriseNightJob(page, mark) {
  const before = await readEconomy(page);
  page.on("dialog", d => d.accept().catch(() => {}));
  await page.locator("#btnJob, button[onclick=\"openJobPanel()\"]").first().click({ force: true });
  await page.waitForSelector("#jobModal.active", { timeout: 15000 });
  const btn = page.locator("#jobModal.active #jobActions button[onclick*=\"'cemetery_night'\"]").first();
  if (!(await btn.count())) {
    const dig = page.locator("#jobModal.active #jobActions button[onclick*=\"'dig'\"]").first();
    if (!(await dig.count())) return { blocked: true, reason: "no cemetery job", before, after: before };
    mark?.("goal_on_screen", "работа dig (fallback)");
    await dig.click({ force: true });
  } else {
    mark?.("goal_on_screen", "ночная смена на кладбище");
    await btn.click({ force: true });
  }
  await page.waitForFunction(() => window.me?.location === "cemetery", { timeout: 60000 });
  mark?.("player_action", "зажигание свечей / ловля призраков E");
  const t0 = Date.now();
  let sawGhost = false;
  while (Date.now() - t0 < 18000) {
    sawGhost =
      sawGhost ||
      (await page.evaluate(() => (window.PlayV21?.state?.cemetery?.ghosts?.length || 0) > 0));
    await H.walkDesktop(page, 550);
    await page.keyboard.press("e").catch(() => {});
    if (!(await page.evaluate(() => !!document.getElementById("gpCemeteryTimer")))) break;
  }
  await page.evaluate(() => window.PlayV21?.endAllActivities?.());
  const after = await readEconomy(page);
  mark?.("surprise", sawGhost ? "призраки на ночной смене" : "таймер кладбища / награда");
  mark?.("result", `монеты ${before.coins} → ${after.coins}`);
  return { blocked: false, before, after, note: sawGhost ? "реальная механика cemetery_night" : "cemetery paths fallback" };
}

/** 06 — развилка маршрута: инициация у Razor. */
async function flow06RouteFork(page, mark) {
  await page.evaluate(() => {
    window.me.onboarding = { ...(window.me.onboarding || {}), done: true, step: 99 };
    const st = window.StoryEngine?.ensureStoryState?.(window.me);
    if (st?.flags) st.flags.joined_gang = false;
    window.saveMe?.();
  });
  await H.navGo(page, "street");
  await H.openGangNpc(page, "razor");
  await page.waitForSelector("#storyDialog.active", { timeout: 20000 });
  mark?.("goal_on_screen", "три ветки: взнос / дуэль / граффити");
  await H.pulseCamera(page);
  await H.sleep(1500);
  const choices = await page.locator("#storyDialog .story-choice").count();
  if (choices < 2) {
    return { blocked: true, reason: "initiation choices not visible (onboarding/joined_gang gate)" };
  }
  mark?.("player_action", "выбор «Заработаю взнос»");
  const pay = page.locator('.story-choice[data-choice="c_pay"], .story-choice[data-next="n3a"]');
  await pay.first().click({ timeout: 10000 });
  mark?.("surprise", "квест инициации вместо дуэли/граффити");
  await H.advanceStoryNext(page);
  const after = await readEconomy(page);
  const quest = after.quest;
  mark?.("result", `активный квест: ${quest || "—"}`);
  await H.dismissStoryDialog(page);
  await H.closeGangModal(page);
  return { blocked: quest !== "q_initiation_pay", reason: quest === "q_initiation_pay" ? null : "expected q_initiation_pay", before: after, after };
}

module.exports = {
  readEconomy,
  prepFreshPlayer,
  flow01CemeteryJob,
  flow02CryptDecor,
  flow03ControlsDesktop,
  flow04ControlsMobile,
  flow05SurpriseNightJob,
  flow06RouteFork
};
