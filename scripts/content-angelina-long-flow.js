/**
 * Long «Angelina» host playthrough — live pacing, real duel loss → win, cemetery fail attempt.
 */
const H = require("./playthrough-ui-helpers");
const Ep1 = require("./episode1-ui-flow");
const PrB = require("./pr-b-ui-flow");
const Flows = require("./content-clip-flows");

const HOST_PAUSE_MS = 1600;

async function hostPause(page, ms = HOST_PAUSE_MS) {
  await H.sleep(ms);
  await H.pulseCamera(page);
}

async function readEconomy(page) {
  return page.evaluate(() => ({
    coins: window.me?.coins ?? 0,
    xp: window.me?.xp ?? 0
  }));
}

/** Wait for 3D duel defeat overlay (Поражение / Try again). */
async function waitDuelDefeat(page, maxMs = 45000) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    const state = await page.evaluate(() => {
      const res = document.getElementById("duel3dResult");
      const text = res?.innerText || "";
      const visible = res && !res.classList.contains("hidden");
      return {
        visible,
        defeat: /поражение|defeat|nederlag/i.test(text),
        tryAgain: /попробуй|try again|prøv igen/i.test(text),
        text: text.slice(0, 120)
      };
    });
    if (state.visible && state.defeat) return state;
    const fo = await page.evaluate(() => {
      const o = document.getElementById("fightOverlay");
      if (!o?.classList.contains("active")) return null;
      const t = o.innerText || "";
      return /поражение|defeat/i.test(t) ? { text: t.slice(0, 120) } : null;
    });
    if (fo) return { ...fo, defeat: true, visible: true };
    await H.sleep(200);
  }
  return null;
}

async function loseOnboardingDuel(page) {
  await page.waitForSelector("#duel3dHud:not(.hidden), #fightOverlay.active", { timeout: 25000 });
  const t0 = Date.now();
  while (Date.now() - t0 < 40000) {
    const active = await page.locator("#duel3dHud:not(.hidden), #fightOverlay.active").isVisible();
    if (!active) break;
    await H.sleep(250);
  }
}

async function duelLoseThenWin(page, mark) {
  await Ep1.ensureWinFightStep(page);
  await H.dismissHowToOverlay(page);
  const before = await readEconomy(page);
  await page.locator("#btnFight").click({ timeout: 20000, force: true });
  mark?.("duel_round1_start", "первая дуэль — без атаки");
  await loseOnboardingDuel(page);
  const defeat = await waitDuelDefeat(page, 12000);
  mark?.("duel_defeat_screen", defeat?.text || "Поражение / Попробуй снова");
  await hostPause(page, 2000);
  await page.evaluate(() => document.getElementById("duel3dResult")?.classList.add("hidden"));
  await H.sleep(400);
  await page.locator("#btnFight").click({ timeout: 15000, force: true });
  mark?.("duel_round2_start", "повтор — атаки");
  const won = await H.winFightUi(page, 55000);
  await page.waitForSelector("#duel3dResult:not(.hidden)", { timeout: 8000 }).catch(() => {});
  const after = await readEconomy(page);
  const delta = await page.evaluate(() => {
    const res = document.getElementById("duel3dResult")?.innerText || "";
    return {
      resText: res.slice(0, 100),
      prog: window.me?.onboarding?.progress?.win_fight || 0
    };
  });
  mark?.(
    "duel_victory",
    won
      ? `win; coins ${before.coins}→${after.coins}; xp ${before.xp}→${after.xp}; ${delta.resText}`
      : `unclear win prog=${delta.prog}`
  );
  await hostPause(page);
  if (!won && delta.prog < 1) throw new Error("duel win not registered after retry");
}

/** Start dig job, play briefly, abort — no (or low) reward. */
async function cemeteryJobFailAttempt(page, mark) {
  const before = await readEconomy(page);
  page.on("dialog", d => d.accept().catch(() => {}));
  await page.locator("#btnJob, button[onclick=\"openJobPanel()\"]").first().click({ force: true });
  await page.waitForSelector("#jobModal.active", { timeout: 15000 });
  const btn = page.locator("#jobModal.active #jobActions button[onclick*=\"'dig'\"]").first();
  if (!(await btn.count())) {
    mark?.("cemetery_fail_skip", "dig job unavailable");
    return { skipped: true };
  }
  mark?.("cemetery_fail_start", "кладбище — намеренно слабая попытка");
  await btn.click({ force: true });
  await page.waitForFunction(() => window.me?.location === "cemetery", { timeout: 60000 });
  await hostPause(page, 1200);
  await H.walkDesktop(page, 900);
  await page.evaluate(() => window.PlayV21?.endAllActivities?.());
  const after = await readEconomy(page);
  mark?.("cemetery_fail_end", `монеты ${before.coins}→${after.coins} (ожид. без награды)`);
  await hostPause(page);
  return { before, after };
}

async function dismissChapterIntro(page) {
  await page.evaluate(() => {
    const el = document.getElementById("chapterIntro");
    if (el) {
      el.classList.remove("active");
      el.setAttribute("aria-hidden", "true");
    }
  });
}

async function runEpisode1WithDuel(page, mark) {
  await dismissChapterIntro(page);
  await H.dismissHowToOverlay(page);
  await H.walkDesktop(page, 2200);
  mark?.("room_intro", "комната — движение");
  await hostPause(page);

  await dismissChapterIntro(page);
  await H.navGo(page, "street");
  mark?.("street_arrival", "карта → улица");
  await hostPause(page);
  await H.openGangNpc(page, "razor");
  mark?.("razor_dialog", "разговор с Razor");
  await H.advanceStoryNext(page).catch(() => {});
  await H.dismissStoryDialog(page);
  await H.closeGangModal(page);
  await hostPause(page);

  await cemeteryJobFailAttempt(page, mark);

  await Ep1.openJournalMenu(page, 500);
  mark?.("journal_open", "журнал заданий");
  await page.locator("#gameMenuClose").click({ timeout: 2000 }).catch(() => {});
  await hostPause(page);

  await H.navGo(page, "cemetery");
  mark?.("cemetery_visit", "визит на кладбище (сюжет)");
  await hostPause(page);
  await H.navGo(page, "street");

  await duelLoseThenWin(page, mark);

  await H.navGo(page, "room");
  await page.locator('button[onclick*="openModal(\'shopModal\')"]').click({ force: true });
  mark?.("shop_open", "лавка");
  await page.waitForSelector("#shopGrid button.btn", { timeout: 10000 });
  await hostPause(page);
  await page.evaluate(() => {
    if ((window.me?.coins ?? 0) < 80) window.me.coins = 240;
    window.renderShop?.();
  });
  await page.locator("#shopGrid button.btn:not([disabled])").first().click({ force: true });
  mark?.("shop_buy", "первая покупка");
  await page.locator("#shopModal .close").click({ force: true }).catch(() => {});
  await Ep1.waitOnboardingDone(page, 15000);
  mark?.("onboarding_done", "обучение завершено");
  await hostPause(page);
}

async function runAngelinaLong(page, mark) {
  await runEpisode1WithDuel(page, mark);

  await dismissChapterIntro(page);
  await H.closeGameMenuIfOpen(page);
  await page.evaluate(() => {
    document.querySelectorAll(".modal.active").forEach(m => {
      if (m.id !== "storyDialog") m.classList.remove("active");
    });
  });
  mark?.("first_job_start", "первая успешная работа (dig)");
  let jobRes = { blocked: true, reason: "not run" };
  try {
    jobRes = await Flows.flow01CemeteryJob(page, (lbl, extra) => mark?.(`job_${lbl}`, extra || ""));
  } catch (e) {
    mark?.("first_job_error", String(e.message || e));
  }
  await hostPause(page);
  mark?.("first_job_result", jobRes.blocked ? `blocked: ${jobRes.reason}` : `coins +${(jobRes.after?.coins || 0) - (jobRes.before?.coins || 0)}`);

  await PrB.purchaseCityPlotUi(page, m => mark?.(m, ""));
  await hostPause(page);

  await PrB.recordConstructionShowcase(page, mark);
  await hostPause(page);

  await PrB.recordCryptShowcase(page, mark);
  await hostPause(page);

  await PrB.recordRoomBuildShowcase(page, mark);
  mark?.("finale_room", "квартира с декором — финал");
  await hostPause(page, 2200);

  return { jobRes };
}

module.exports = { runAngelinaLong, HOST_PAUSE_MS };
