/**
 * Short UI flows for qa/content clips (no faking broken mechanics).
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

async function prepFreshPlayer(page, { lang = "ru" } = {}) {
  await H.dismissHowToOverlay(page);
  await page.evaluate(() => document.getElementById("chapterIntro")?.classList.remove("active"));
  await H.skipChapterIntro(page);
  await page.evaluate(l => {
    if (typeof setLanguage === "function") setLanguage(l, true);
  }, lang);
  await H.unlockGameAudio(page);
  await H.dismissHowToOverlay(page);
}

async function flow01FirstJob(page, mark) {
  const before = await readEconomy(page);
  mark?.("state_before", JSON.stringify(before));
  page.on("dialog", d => d.accept().catch(() => {}));
  const jobBtn = page.locator("#btnJob, button[onclick=\"openJobPanel()\"]");
  await jobBtn.first().click({ force: true });
  await page.waitForSelector("#jobModal.active", { timeout: 15000 });
  mark?.("job_panel_open", "доска работ");
  const btn = page.locator("#jobModal.active #jobActions button[onclick*=\"'dig'\"]").first();
  if (!(await btn.count())) {
    return { blocked: true, reason: "dig job not on board", before, after: before };
  }
  await btn.click({ force: true });
  mark?.("job_accepted", "dig → cemetery");
  await page.waitForFunction(() => window.me?.location === "cemetery", { timeout: 60000 });
  await H.dismissHowToOverlay(page);
  await H.sleep(500);
  mark?.("job_gameplay", "paths mini-game — WASD + E");
  const t0 = Date.now();
  while (Date.now() - t0 < 16000) {
    await H.walkDesktop(page, 650);
    await H.focusStage(page);
    await page.keyboard.press("e").catch(() => {});
    const hud = await page.evaluate(() => !!document.getElementById("gpCemeteryTimer"));
    if (!hud) break;
  }
  await page.evaluate(() => window.PlayV21?.endAllActivities?.());
  await H.pulseCamera(page);
  await H.sleep(700);
  const after = await readEconomy(page);
  mark?.("job_complete", `coins ${before.coins} → ${after.coins}`);
  mark?.("state_after", JSON.stringify(after));
  const earned = after.coins > before.coins;
  return { blocked: !earned, reason: earned ? null : "coins did not increase after dig job", before, after };
}

async function flow02HowToStart(page, mark) {
  const before = await readEconomy(page);
  await H.walkDesktop(page, 1800);
  mark?.("first_move", "room — WASD");
  await H.navGo(page, "street");
  mark?.("route_street", "map → street (first travel goal)");
  await H.openGangNpc(page, "razor");
  mark?.("goal_razor", "talk Razor — onboarding pointer");
  await H.advanceStoryNext(page).catch(() => {});
  await H.dismissStoryDialog(page);
  await H.closeGangModal(page);
  await Ep1.openJournalMenu(page, 800);
  mark?.("journal_open", "pause menu — current objectives");
  await page.locator("#gameMenuClose").click({ timeout: 3000 }).catch(() => {});
  const after = await readEconomy(page);
  return { blocked: false, before, after };
}

async function flow03InteractTalkDesktop(page, mark) {
  await H.navGo(page, "street");
  await H.openGangNpc(page, "razor");
  mark?.("gang_ui_talk", "gang list → Razor");
  await page.waitForSelector("#storyDialog.active, #dialogArea", { timeout: 15000 });
  mark?.("dialog_visible", "story dialog on screen");
  await H.advanceStoryNext(page);
  await H.dismissStoryDialog(page);
  await H.closeGangModal(page);
  const before = await readEconomy(page);
  return { blocked: false, before, after: before, controls: "desktop: gang → NPC; E / #btnTalk in-world" };
}

async function flow03InteractTalkMobile(page, mark) {
  await H.navGo(page, "street");
  await page.evaluate(() => {
    window.World3D?.setGuideTarget?.("razor");
  });
  await H.walkMobile(page, 1200);
  const hint = await page.evaluate(() => {
    const t = document.getElementById("btnTalk")?.textContent || document.getElementById("gpInteractHint")?.textContent;
    return t || "";
  });
  mark?.("interact_hint", hint || "touch talk");
  await H.pressTalk(page, true);
  await page.waitForSelector("#storyDialog.active, #dialogArea", { timeout: 15000 }).catch(() => {});
  mark?.("mobile_dialog", "touch Talk — dialog");
  await H.advanceStoryNext(page).catch(() => {});
  await H.dismissStoryDialog(page);
  return { blocked: false, controls: "mobile: #touchTalk; joystick" };
}

async function flow04Crypt(page, mark) {
  await PrB.recordCryptShowcase(page, mark);
  return { blocked: false };
}

async function flow05Apartment(page, mark) {
  await PrB.recordRoomBuildShowcase(page, mark);
  return { blocked: false };
}

async function flow06CityPlot(page, mark) {
  const before = await readEconomy(page);
  await H.navGo(page, "city");
  mark?.("city_arrive", "city street plots visible");
  await H.walkDesktop(page, 1400);
  const plotState = await page.evaluate(() => ({
    plots: (window.me?.cityPlots || []).map(p => ({ id: p.id, built: p.built, cost: p.cost })),
    coins: window.me?.coins ?? 0
  }));
  mark?.("plots_before", JSON.stringify(plotState.plots));
  const cost = plotState.plots.find(p => p.id === "plot_shop")?.cost ?? 120;
  if (plotState.coins < cost) {
    mark?.("earn_coins", `job for coins (need ${cost})`);
    await H.runStoryJob(page, "pizza_delivery", "city");
    await H.sleep(500);
    const t0 = Date.now();
    while (Date.now() - t0 < 18000) {
      await H.walkDesktop(page, 700);
      await page.keyboard.press("e").catch(() => {});
    }
    await page.evaluate(() => window.PlayV21?.endAllActivities?.());
  }
  const purchase = await page.evaluate(() => {
    const r = window.purchaseCityPlot?.("plot_shop");
    window.saveMe?.();
    return r;
  });
  let blocked = false;
  let reason = null;
  if (!purchase?.ok) {
    blocked = true;
    reason = `purchaseCityPlot: ${purchase?.reason || "failed"}`;
  } else {
    mark?.("plot_purchased", `plot_shop −${purchase.cost} coins`);
  }
  await H.walkDesktop(page, 1600);
  await H.pulseCamera(page);
  mark?.("plot_visible", "built shop on street");
  const after = await readEconomy(page);
  return {
    blocked,
    reason,
    before,
    after,
    uiNote: "В HUD нет кнопки «купить участок»; покупка через purchaseCityPlot (маркер на карте без E)"
  };
}

async function flow07Duel(page, mark) {
  await H.dismissHowToOverlay(page);
  const before = await readEconomy(page);
  await page.locator("#btnFight").click({ timeout: 20000, force: true });
  mark?.("duel_start", "Chain fight");
  const won = await H.winFightUi(page, 55000);
  await page.waitForSelector("#duel3dResult:not(.hidden)", { timeout: 8000 }).catch(() => {});
  await H.sleep(1000);
  const snap = await page.evaluate(() => ({
    prog: window.me?.onboarding?.progress?.win_fight || 0,
    passed: !!window.Onboarding?.hasPassedWinFight?.()
  }));
  mark?.("duel_result", won ? `win_fight ok prog=${snap.prog}` : "win_fight failed");
  const after = await readEconomy(page);
  const ok = won || snap.passed || snap.prog >= 1;
  return {
    blocked: !ok,
    reason: ok ? null : "duel victory not registered",
    before,
    after
  };
}

async function flow08Dog(page, mark) {
  const has = await page.evaluate(
    () =>
      window.me?.pet === "pet_dog" ||
      (window.me?.owned || []).includes("pet_dog") ||
      (typeof window.hasDog === "function" && window.hasDog())
  );
  if (!has) {
    let coins = (await readEconomy(page)).coins;
    const price = 280;
    if (coins < price) {
      mark?.("earn_for_dog", `coins ${coins} → need ${price} (dig jobs)`);
      page.on("dialog", d => d.accept().catch(() => {}));
      for (let round = 0; round < 5 && coins < price; round++) {
        const jobBtn = page.locator("#btnJob, button[onclick=\"openJobPanel()\"]");
        await jobBtn.first().click({ force: true }).catch(() => {});
        await page.waitForSelector("#jobModal.active", { timeout: 10000 }).catch(() => {});
        await page.locator("#jobModal.active #jobActions button[onclick*=\"'dig'\"]").first().click({ force: true }).catch(() => {});
        await page.waitForFunction(() => window.me?.location === "cemetery", { timeout: 60000 }).catch(() => {});
        const t0 = Date.now();
        while (Date.now() - t0 < 20000) {
          await H.walkDesktop(page, 650);
          await page.keyboard.press("e").catch(() => {});
          if (!(await page.evaluate(() => !!document.getElementById("gpCemeteryTimer")))) break;
        }
        await page.evaluate(() => window.PlayV21?.endAllActivities?.());
        coins = (await readEconomy(page)).coins;
      }
    }
    await page.locator('button[onclick*="openModal(\'shopModal\')"]').click({ force: true }).catch(() => {});
    await page.waitForSelector("#shopModal.active", { timeout: 10000 }).catch(() => {});
    if (coins < price) {
      mark?.("need_coins", `${coins} < ${price}`);
      return { blocked: true, reason: `недостаточно монет для pet_dog (${coins}/${price})` };
    }
    const bought = await page.evaluate(() => {
      if (typeof buyItem === "function") {
        buyItem("pet_dog");
        return true;
      }
      const btn = [...document.querySelectorAll("#shopGrid button")].find(b => b.getAttribute("onclick")?.includes("pet_dog"));
      if (btn && !btn.disabled) {
        btn.click();
        return true;
      }
      return false;
    });
    if (!bought) return { blocked: true, reason: "не удалось купить pet_dog" };
    mark?.("dog_purchased", "Шнурок / pet_dog");
  } else {
    mark?.("dog_owned", "pet_dog");
  }
  await H.navGo(page, "room");
  await H.sleep(800);
  mark?.("dog_room", "room with pet");
  await page.evaluate(() => {
    if (typeof throwDogBall === "function") throwDogBall();
  });
  await H.sleep(1200);
  await H.pressInteract(page, false);
  mark?.("pet_interact", "E — pet");
  await H.pulseCamera(page);
  return { blocked: false, note: "Шнурок = pet_dog «Панковый пёс» в магазине" };
}

/** After clip 7, onboarding duel done — fresh context for dog may need new session */
async function flow08DogPostOnboarding(page, mark) {
  return flow08Dog(page, mark);
}

module.exports = {
  readEconomy,
  prepFreshPlayer,
  flow01FirstJob,
  flow02HowToStart,
  flow03InteractTalkDesktop,
  flow03InteractTalkMobile,
  flow04Crypt,
  flow05Apartment,
  flow06CityPlot,
  flow07Duel,
  flow08Dog,
  flow08DogPostOnboarding
};
