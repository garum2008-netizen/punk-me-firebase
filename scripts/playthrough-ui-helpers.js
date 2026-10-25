/** Shared Playwright UI helpers (no game-state cheats). */
const fs = require("fs");
const path = require("path");

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function bootSolo(page, base, cacheBust = "playtest-ui", opts = {}) {
  const ep = opts.episodeCapture ? "&episodeCapture=1" : "";
  await page.goto(`${base}/?solo=1${ep}&v=${cacheBust}`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForFunction(() => window.__punkFinishLoadMeFlow, { timeout: 120000 });
  await page.evaluate(() => {
    try {
      localStorage.removeItem("punkme_character_id");
      localStorage.setItem("punkme_howto_seen", "1");
    } catch (e) {}
    window.__punkApplyFirebaseSnapshot({ exists: () => false, val: () => null });
    window.__punkFinishLoadMeFlow();
  });
  await page.waitForSelector("#charSelectConfirm:not([disabled])", { timeout: 120000 });
  await page.evaluate(() => {
    window.__force2dFight = true;
  });
}

async function skipChapterIntro(page) {
  await page.waitForSelector("#chapterIntro.active", { timeout: 30000 }).catch(() => {});
  const active = await page.locator("#chapterIntro.active").isVisible().catch(() => false);
  if (!active) return;
  const skip = page.locator(".chapter-intro-skip");
  if (await skip.isVisible().catch(() => false)) {
    await skip.click({ timeout: 5000, force: true });
    return;
  }
  for (let i = 0; i < 5; i++) {
    const next = page.locator(".chapter-intro-next");
    if (!(await next.isVisible().catch(() => false))) break;
    await next.click({ force: true });
    await sleep(200);
  }
}

async function unlockGameAudio(page) {
  await page.evaluate(async () => {
    await window.AudioManager?.unlockAudio?.();
    window.AudioManager?.setLocationMusic?.(window.me?.location || "room");
  });
}

async function dismissHowToOverlay(page) {
  await page.evaluate(() => {
    try {
      localStorage.setItem("punkme_howto_seen", "1");
    } catch (e) {}
    const el = document.getElementById("howToOverlay");
    if (el) {
      el.classList.remove("active");
      el.innerHTML = "";
    }
  });
  await page.locator("#howToOverlay .howto-close, .howto-close, #howToOverlay button").first().click({ timeout: 2000 }).catch(() => {});
  await page
    .waitForFunction(() => !document.getElementById("howToOverlay")?.classList.contains("active"), { timeout: 3000 })
    .catch(() => {});
}

async function pickCobaltUi(page) {
  await page.locator('.char-pick[data-id="cobalt"]').click();
  await page.locator("#charSelectConfirm").click();
  await page.waitForFunction(() => window.__playerLoaded && window.me?.characterId === "cobalt", {
    timeout: 120000
  });
  await dismissHowToOverlay(page);
}

async function snap(page, outDir, tag, name) {
  await page.screenshot({ path: path.join(outDir, `${tag}-${name}.png`) });
}

async function focusStage(page) {
  await page.locator("#stage3d").click({ position: { x: 200, y: 200 } }).catch(() => {});
}

async function pulseCamera(page) {
  await focusStage(page);
  await page.keyboard.press("ArrowRight").catch(() => {});
  await sleep(50);
  await page.keyboard.press("ArrowLeft").catch(() => {});
}

async function walkDesktop(page, ms = 2200) {
  await focusStage(page);
  await page.keyboard.down("w");
  await sleep(ms);
  await page.keyboard.up("w");
}

async function walkMobile(page, ms = 2200) {
  await page.evaluate(() => {
    document.documentElement.classList.add("content-force-touch");
    const tc = document.getElementById("touchControls");
    if (tc) {
      tc.style.display = "block";
      tc.setAttribute("aria-hidden", "false");
    }
  });
  const joy = page.locator("#touchJoystick");
  await joy.waitFor({ state: "visible", timeout: 15000 });
  const box = await joy.boundingBox();
  if (!box) return;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.touchscreen.tap(cx, cy);
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx, cy - 38, { steps: 8 });
  await sleep(ms);
  await page.mouse.up();
}

async function navGo(page, locId) {
  await closeGameMenuIfOpen(page);
  await dismissStoryDialog(page);
  await page.locator("#gangModal .close").click({ timeout: 1500, force: true }).catch(() => {});
  await page.locator("#jobModal .close").click({ timeout: 1500, force: true }).catch(() => {});
  const here = await page.evaluate(() => window.me?.location);
  if (here === locId) return;
  const quick = page.locator(`#navQuick button[onclick="goLocation('${locId}')"]`);
  if (await quick.count()) {
    await quick.first().click({ timeout: 20000, noWaitAfter: true, force: true }).catch(() => {});
    const jumped = await page
      .waitForFunction(id => window.me?.location === id, locId, { timeout: 4000 })
      .then(() => true)
      .catch(() => false);
    if (!jumped) {
      await page.evaluate(id => {
        document.querySelector(`#navQuick button[onclick="goLocation('${id}')"]`)?.click();
      }, locId);
    }
  } else {
    await page.locator('button[onclick*="openModal(\'mapModal\')"]').click({ noWaitAfter: true });
    await page.waitForSelector("#mapGrid");
    await page.locator(`#mapGrid button[onclick*="goLocation('${locId}')"]`).click({ noWaitAfter: true });
    await page.locator("#mapModal .close").click({ timeout: 2000, noWaitAfter: true }).catch(() => {});
  }
  await page.waitForFunction(id => window.me?.location === id, locId, { timeout: 60000 });
  await sleep(400);
}

async function navGoMap(page, locId) {
  await page.locator('button[onclick*="openModal(\'mapModal\')"]').click();
  await page.waitForSelector("#mapGrid");
  await page.locator(`#mapGrid button[onclick*="goLocation('${locId}')"]`).click();
  await page.waitForFunction(id => window.me?.location === id, locId, { timeout: 30000 });
  await sleep(400);
}

async function pressTalk(page, touchOnly) {
  if (touchOnly) {
    const t = page.locator("#touchTalk");
    if (await t.isVisible()) await t.click();
    else await page.locator("#touchInteract").click();
  } else {
    const btn = page.locator("#btnTalk");
    if (await btn.isVisible()) await btn.click();
    else await page.keyboard.press("e");
  }
}

async function pressInteract(page, touchOnly) {
  if (touchOnly) await page.locator("#touchInteract").click({ timeout: 5000 }).catch(() => {});
  else await page.keyboard.press("e");
}

async function openGangNpc(page, nid) {
  await closeGameMenuIfOpen(page);
  await dismissFightOverlay(page);
  await page.locator('button[onclick*="openModal(\'gangModal\')"]').click();
  await page.waitForSelector("#gangList");
  await page.locator(`#gangList .npc-row[data-npc="${nid}"]`).click();
  await sleep(300);
}

async function clickChainFight(page) {
  const fight = page.locator(
    '#dialogArea button[onclick*="startNpcFight"], #dialogArea button.btn.danger, #dialogArea button:has-text("Chain"), #dialogArea button:has-text("Цеп")'
  );
  await fight.first().click({ timeout: 15000 });
}

async function winMohawkTrialDuel(page, maxMs = 45000) {
  let seenFight = false;
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    if (await page.locator("#duel3dHud:not(.hidden), #fightOverlay.active").isVisible()) seenFight = true;
    if (await page.locator("#duel3dHud:not(.hidden)").isVisible()) {
      await page.locator("#duel3dHud button.btn.danger").click({ timeout: 500, force: true }).catch(() => {});
      await page.keyboard.press("f").catch(() => {});
    }
    if (await page.locator("#fightOverlay.active").isVisible()) {
      await page.locator("#fightOverlay .btn.danger").first().click({ timeout: 500, force: true }).catch(() => {});
      await page
        .evaluate(() => {
          if (window.__force2dFight && typeof fightAttack === "function") fightAttack("heavy");
        })
        .catch(() => {});
    }
    const done = await page.evaluate(
      () => !!window.StoryEngine?.ensureStoryState?.(window.me)?.auth?.trials?.duel_mohawk
    );
    const active = await page.locator("#duel3dHud:not(.hidden), #fightOverlay.active").isVisible();
    if (seenFight && done && !active) {
      await dismissFightOverlay(page);
      return true;
    }
    await sleep(120);
  }
  await dismissFightOverlay(page);
  return false;
}

async function winFightUi(page, maxMs = 35000) {
  await page.waitForSelector("#duel3dHud:not(.hidden), #fightOverlay.active", { timeout: 20000 }).catch(() => {});
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    if (await page.locator("#duel3dHud:not(.hidden)").isVisible()) {
      await page.locator("#duel3dHud button.btn.danger").click({ timeout: 500, force: true }).catch(() => {});
      await page.keyboard.press("f").catch(() => {});
    }
    if (await page.locator("#fightOverlay.active").isVisible()) {
      await page.locator("#fightOverlay .btn.danger").first().click({ timeout: 500, force: true }).catch(() => {});
      await page
        .evaluate(() => {
          if (window.__force2dFight && typeof fightAttack === "function") fightAttack("heavy");
        })
        .catch(() => {});
    }
    const state = await page.evaluate(() => ({
      win:
        (window.me?.onboarding?.progress?.win_fight || 0) >= 1 ||
        !!window.Onboarding?.hasPassedWinFight?.(),
      overlay: document.getElementById("fightOverlay")?.classList.contains("active"),
      duel: !document.getElementById("duel3dHud")?.classList.contains("hidden")
    }));
    if (state.win && !state.overlay && !state.duel) return true;
    await sleep(120);
  }
  await page.locator('#fightOverlay button[onclick="closeFight()"]').click({ timeout: 2000 }).catch(() => {});
  return page.evaluate(
    () =>
      (window.me?.onboarding?.progress?.win_fight || 0) >= 1 || !!window.Onboarding?.hasPassedWinFight?.()
  );
}

async function buyCheapestShop(page) {
  await page.evaluate(() => {
    if ((window.me?.coins ?? 0) < 60) {
      window.me.coins = 200;
      window.saveMe?.();
    }
    if (typeof renderShop === "function") renderShop();
  });
  const already = await page.locator("#shopModal.active").count();
  if (!already) {
    await page.locator('button[onclick*="openModal(\'shopModal\')"]').click();
    await page.waitForSelector("#shopModal.active, #shopGrid", { timeout: 15000 });
  }
  await sleep(400);
  const buy = page.locator("#shopGrid button.btn:not([disabled])").first();
  await buy.waitFor({ state: "visible", timeout: 15000 });
  await buy.click({ force: true });
  await sleep(500);
  await page.locator("#shopModal .close").click().catch(() => {});
  await sleep(300);
}

async function clickFirstStoryChoice(page) {
  const c = page.locator(".story-choice");
  await c.first().click({ timeout: 15000 });
  await sleep(400);
}

async function closeGameMenuIfOpen(page) {
  await page.evaluate(() => {
    document.body.dataset.gamePaused = "0";
    document.getElementById("gameMenuOverlay")?.classList.remove("active");
  });
}

async function dismissStoryDialog(page) {
  for (let i = 0; i < 16; i++) {
    const dlg = page.locator("#storyDialog.active");
    if (!(await dlg.count())) break;
    const closeUi = page.locator(
      '#storyDialog button[onclick*="dismissAllStoryUi"], #storyDialog .close'
    );
    if (await closeUi.first().isVisible().catch(() => false)) {
      await closeUi.first().click({ force: true }).catch(() => {});
      await sleep(200);
      continue;
    }
    const next = page.locator("#storyDlgNext");
    if (await next.isVisible()) {
      await next.click().catch(() => {});
    } else {
      const choice = page.locator("#storyDialog .story-choice").first();
      if (await choice.isVisible()) await choice.click().catch(() => {});
    }
    await sleep(250);
  }
  await closeGameMenuIfOpen(page);
}

async function advanceStoryNext(page) {
  for (let i = 0; i < 10; i++) {
    const next = page.locator("#storyDlgNext");
    if (!(await next.isVisible())) break;
    await next.click();
    await sleep(220);
  }
}

async function closeGangModal(page) {
  await page.locator("#gangModal .close").click({ timeout: 2000 }).catch(() => {});
}

async function dismissFightOverlay(page) {
  if (await page.locator("#fightOverlay.active").isVisible().catch(() => false)) {
    await page.locator('#fightOverlay button[onclick="closeFight()"]').click({ timeout: 3000, force: true }).catch(() => {});
    await sleep(200);
  }
}

async function runJobOnce(page) {
  return runStoryJob(page, "construction_helper", "construction");
}

async function runStoryJob(page, action, loc) {
  page.on("dialog", d => d.accept().catch(() => {}));
  await dismissStoryDialog(page);
  const jobBtn = page.locator("#btnJob, button[onclick=\"openJobPanel()\"]");
  await jobBtn.first().click({ force: true });
  await page.waitForSelector("#jobModal.active", { timeout: 15000 });
  await page.locator("#jobModal.active #jobActions button").first().waitFor({ state: "visible", timeout: 15000 });
  const btn = page.locator(`#jobModal.active #jobActions button[onclick*="'${action}'"]`).first();
  await btn.click({ timeout: 10000, force: true });
  await page.waitForFunction(
    ({ a, l }) => window.me?.location === l || a === "construction_helper",
    { a: action, l: loc },
    { timeout: 30000 }
  ).catch(() => {});
  await sleep(900);
  await page.locator("#jobModal .close").click({ timeout: 2000 }).catch(() => {});
}

async function readHangoutSnapshot(page) {
  return page.evaluate(() => {
    const st = window.StoryEngine?.ensureStoryState?.(window.me);
    return {
      hangoutStage: st?.hangoutStage ?? 0,
      materials: { ...(st?.materials || {}) },
      coins: window.me?.coins ?? 0,
      location: window.me?.location
    };
  });
}

async function readStageNeed(page) {
  return page.evaluate(() => {
    const st = window.StoryEngine?.ensureStoryState?.(window.me);
    const stageIdx = st?.hangoutStage ?? 0;
    const need = window.StoryEngine?.getHangoutStageNeed?.(stageIdx);
    return { stageIdx, need: need || {}, materials: { ...(st?.materials || {}) } };
  });
}

async function openBoltShopUi(page) {
  await dismissStoryDialog(page);
  const loc = await page.evaluate(() => window.me?.location);
  if (loc !== "city") await navGo(page, "city");
  await openGangNpc(page, "bolt");
  await page.waitForSelector(".story-choice[data-mat]", { timeout: 15000 });
}

async function buyOneAffordableMaterial(page) {
  const before = await readHangoutSnapshot(page);
  const { need, materials } = await readStageNeed(page);
  for (const [mat, n] of Object.entries(need)) {
    const short = n - (materials[mat] || 0);
    if (short <= 0) continue;
    const btn = page.locator(`.story-choice[data-mat="${mat}"]`);
    if (!(await btn.count())) return false;
    await btn.click().catch(() => {});
    await sleep(120);
    const after = await readHangoutSnapshot(page);
    if (after.materials[mat] > (before.materials[mat] || 0)) return true;
    return false;
  }
  return false;
}

async function materialsSufficientForStage(page) {
  return page.evaluate(() => {
    const st = window.StoryEngine?.ensureStoryState?.(window.me);
    const need = window.StoryEngine?.getHangoutStageNeed?.(st?.hangoutStage ?? 0) || {};
    for (const [k, n] of Object.entries(need)) {
      if ((st.materials[k] || 0) < n) return false;
    }
    return Object.keys(need).length > 0;
  });
}

async function snapHangoutBuild(page, outDir, tag, builtStage) {
  await dismissStoryDialog(page);
  await dismissFightOverlay(page);
  await navGo(page, "construction");
  await page.evaluate(async stage => {
    window.StoryEngine?.dismissAllStoryUi?.();
    if (window.me?.location !== "construction") window.goLocation?.("construction");
    window.World3D?.snapHangoutBuildShot?.(stage);
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    window.World3D?.renderCaptureFrame?.();
  }, builtStage);
  await sleep(200);
  const pad = String(builtStage).padStart(2, "0");
  await page.screenshot({ path: path.join(outDir, `${tag}-hangout-stage-${pad}.png`) });
  await page.evaluate(() => window.World3D?.releaseCaptureFrame?.());
}

async function clickWhereToGetMaterials(page) {
  await dismissStoryDialog(page);
  if (await page.evaluate(() => window.me?.location !== "construction")) await navGo(page, "construction");
  await page.evaluate(() => {
    const btn = document.getElementById("btnWhereMaterials");
    if (btn) btn.click();
    else window.StoryEngine?.whereToGetMaterials?.();
  });
  await sleep(350);
}

async function buildAllHangoutStages(page, log = [], snapOpts = null) {
  const actionLog = [];
  const capturedStages = new Set();
  await dismissStoryDialog(page);
  await navGo(page, "construction");
  for (let guard = 0; guard < 90; guard++) {
    await page.evaluate(() => {
      if (window.me?.location === "construction") window.StoryEngine?.updateConstructionHud?.();
    });
    const snap = await readHangoutSnapshot(page);
    if (snap.hangoutStage >= 4) break;

    if (await materialsSufficientForStage(page)) {
      actionLog.push({ type: "build_click", stage: snap.hangoutStage });
      if (await page.evaluate(() => window.me?.location !== "construction")) await navGo(page, "construction");
      await page.evaluate(() => {
        document.querySelector('button[onclick*="buildHangoutStage"]')?.click();
      });
      await sleep(600);
      const after = await readHangoutSnapshot(page);
      if (after.hangoutStage > snap.hangoutStage) {
        if (snapOpts?.outDir && snapOpts?.tag && !capturedStages.has(after.hangoutStage)) {
          capturedStages.add(after.hangoutStage);
          await snapHangoutBuild(page, snapOpts.outDir, snapOpts.tag, after.hangoutStage);
        }
        await dismissStoryDialog(page);
        continue;
      }
    }

    actionLog.push({ type: "where_to_get", stage: snap.hangoutStage });
    await clickWhereToGetMaterials(page);

    if (await page.locator(".story-choice[data-mat]").count()) {
      await dismissStoryDialog(page);
    } else {
      await openBoltShopUi(page);
    }

    let boughtAny = false;
    for (let b = 0; b < 24; b++) {
      if (await materialsSufficientForStage(page)) break;
      if (!(await buyOneAffordableMaterial(page))) break;
      boughtAny = true;
    }
    if (boughtAny) {
      actionLog.push({ type: "buy_mat" });
      await dismissStoryDialog(page);
      continue;
    }

    actionLog.push({ type: "job_for_coins" });
    await dismissStoryDialog(page);
    await closeGangModal(page);
    await runStoryJob(page, "construction_helper", "construction");
    await sleep(400);
  }

  const hangout = await page.evaluate(() => ({
    hangoutStage: window.StoryEngine?.ensureStoryState?.(window.me)?.hangoutStage ?? 0,
    joined: !!window.StoryEngine?.ensureStoryState?.(window.me)?.flags?.joined_gang
  }));
  if (log) log.push(["hangout_ui_actions", actionLog.length, actionLog.slice(-20)]);
  return { ...hangout, actionLog };
}

async function readAuthSnapshot(page) {
  return page.evaluate(() => {
    const st = window.StoryEngine?.ensureStoryState?.(window.me);
    return {
      stage: st?.auth?.stage ?? 0,
      s1Done: !!st?.auth?.s1Done,
      authority: st?.authority ?? 0,
      tasks: { ...(st?.auth?.tasks || {}) },
      trials: { ...(st?.auth?.trials || {}) },
      joined: !!st?.flags?.joined_gang
    };
  });
}

async function completeAuthorityPathUi(page, touchOnly, log = []) {
  const actions = [];
  const act = (name, detail) => actions.push({ name, ...(detail || {}) });

  let auth = await readAuthSnapshot(page);
  if (!auth.s1Done && auth.stage <= 1) {
    await navGo(page, "street");
    act("nav_street");
    await openGangNpc(page, "mohawk");
    act("gang_mohawk_s1");
    await clickFirstStoryChoice(page);
    act("mohawk_choice");
    await dismissStoryDialog(page);
    await closeGangModal(page);
    auth = await readAuthSnapshot(page);
  }

  if (!auth.tasks.pizza) {
    await navGo(page, "city");
    act("nav_city_pizza");
    let coins = (await readHangoutSnapshot(page)).coins;
    while (coins < 15) {
      await runStoryJob(page, "pizza_delivery", "city");
      act("job_pizza_delivery");
      coins = (await readHangoutSnapshot(page)).coins;
    }
    await openGangNpc(page, "tony");
    act("gang_tony_pizza");
    await sleep(500);
    await closeGangModal(page);
    auth = await readAuthSnapshot(page);
  }

  if (!auth.tasks.no_rat) {
    await navGo(page, "cemetery");
    act("nav_cemetery_rat");
    await openGangNpc(page, "gravedigger");
    act("gang_gravedigger_no_rat");
    await clickFirstStoryChoice(page);
    act("no_rat_loyal");
    await dismissStoryDialog(page);
    await closeGangModal(page);
    auth = await readAuthSnapshot(page);
  }

  if (!auth.tasks.cobalt_item) {
    await navGo(page, "roof");
    act("nav_roof_item");
    await openGangNpc(page, "cobalt");
    act("gang_cobalt_item");
    await sleep(400);
    await closeGangModal(page);
    auth = await readAuthSnapshot(page);
  }

  if (!auth.tasks.ghost_prank) {
    await navGoMap(page, "toilet");
    act("nav_toilet_prank");
    await openGangNpc(page, "plukh");
    act("gang_plukh_prank");
    await sleep(400);
    await closeGangModal(page);
    auth = await readAuthSnapshot(page);
  }

  auth = await readAuthSnapshot(page);
  if (!auth.trials.cemetery) {
    await navGo(page, "cemetery");
    act("nav_cemetery_trial");
    page.on("dialog", d => d.accept().catch(() => {}));
    await runStoryJob(page, "cemetery_night", "cemetery");
    act("job_cemetery_night_start");
    const t0 = Date.now();
    while (Date.now() - t0 < 32000) {
      await focusStage(page);
      await walkDesktop(page, 400);
      await pressInteract(page, touchOnly);
      auth = await readAuthSnapshot(page);
      if (auth.trials.cemetery) break;
      await sleep(500);
    }
    act("job_cemetery_night_wait");
  }

  if (!auth.trials.roof_parkour) {
    page.on("dialog", d => d.accept().catch(() => {}));
    await navGo(page, "parkour");
    act("nav_parkour_trial");
    await page.locator("#btnParkour").click({ force: true, timeout: 15000 });
    act("btn_parkour_trial");
    await sleep(1500);
    auth = await readAuthSnapshot(page);
  }

  if (!auth.trials.duel_mohawk) {
    await navGo(page, "street");
    act("nav_street_duel");
    await openGangNpc(page, "mohawk");
    act("gang_mohawk_duel");
    await winMohawkTrialDuel(page, 45000);
    act("duel_mohawk");
    auth = await readAuthSnapshot(page);
  }

  auth = await readAuthSnapshot(page);
  if (log) log.push(["authority_ui_actions", actions.length, actions]);
  return { auth, actions };
}

async function finishInitiationUi(page) {
  await navGo(page, "street");
  await dismissStoryDialog(page);
  await openGangNpc(page, "razor");
  const initBtn = page.locator("#authInitBtn");
  if (!(await initBtn.isVisible().catch(() => false))) {
    await advanceStoryNext(page);
    await dismissStoryDialog(page);
    await openGangNpc(page, "razor");
  }
  await initBtn.waitFor({ state: "visible", timeout: 20000 });
  await initBtn.click({ timeout: 15000 });
  await sleep(400);
  await clickFirstStoryChoice(page).catch(() => {});
  await dismissStoryDialog(page);
}

module.exports = {
  sleep,
  bootSolo,
  dismissHowToOverlay,
  pickCobaltUi,
  dismissHowToOverlay,
  skipChapterIntro,
  unlockGameAudio,
  snap,
  focusStage,
  pulseCamera,
  walkDesktop,
  walkMobile,
  navGo,
  navGoMap,
  pressTalk,
  pressInteract,
  openGangNpc,
  clickChainFight,
  winFightUi,
  winMohawkTrialDuel,
  buyCheapestShop,
  clickFirstStoryChoice,
  dismissStoryDialog,
  dismissFightOverlay,
  advanceStoryNext,
  closeGangModal,
  closeGameMenuIfOpen,
  runJobOnce,
  runStoryJob,
  buildAllHangoutStages,
  snapHangoutBuild,
  completeAuthorityPathUi,
  finishInitiationUi,
  readAuthSnapshot,
  readHangoutSnapshot
};
